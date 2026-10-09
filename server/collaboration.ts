import express from "express";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { z } from "zod";
import {
  db,
  demo,
  setting,
  setSetting,
  locked,
  tryLocked,
  audit,
} from "./db.js";
import { authenticate, requireRole } from "./auth.js";
import { Fault, googleId } from "./domain.js";
import { driveFolder, checkpointSharedDriveFile } from "./google.js";
import {
  initialState,
  operationSchema,
  applyOperation,
  CollaborationConflict,
  type SharedResource,
  type DrawingState,
} from "../shared/collaboration.js";

type StoredResource = SharedResource & { driveChecksum?: string };
function readableBoard(resource: SharedResource) {
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]!,
    );
  const board =
    resource.state as import("../shared/collaboration.js").BoardState;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(resource.title)}</title><style>body{font:15px/1.6 system-ui;margin:32px;color:#20241e;background:#f5f6f2}main{display:flex;gap:24px;flex-wrap:wrap}section{flex:1;min-width:240px}article{padding:16px;background:#eef1e9;border-radius:12px;margin:12px 0}p{white-space:pre-wrap;overflow-wrap:anywhere}h1{font-size:26px}h2{font-size:18px}h3{font-size:15px;margin:0}</style><h1>${escape(resource.title)}</h1><p>IPI board snapshot · revision ${resource.revision}. Open IPI to edit.</p><main>${board.columns.map((column) => `<section><h2>${escape(column.title)}</h2>${column.noteIds.map((id) => `<article><h3>${escape(board.notes[id].title || "Untitled note")}</h3><p>${escape(board.notes[id].body)}</p></article>`).join("")}</section>`).join("")}</main></html>`;
}
const editor = requireRole("administrator", "analyst");
const updates = new EventEmitter();
updates.setMaxListeners(0);
const identifier = z.string().uuid();
export async function resourceById(
  id: string,
  includeDeleted = false,
): Promise<StoredResource> {
  const row = (
    await db.query("SELECT data FROM shared_resources WHERE id=$1", [id])
  ).rows[0];
  if (!row || (row.data.deletedAt && !includeDeleted))
    throw new Fault(404, "This shared resource was deleted or does not exist");
  return row.data;
}
export function sharedSnapshot(resource: SharedResource) {
  return resource.kind === "drawing"
    ? {
        type: "excalidraw",
        version: 2,
        source: "IPI",
        ...(resource.state as DrawingState),
        appState: { viewBackgroundColor: "#ffffff" },
        ipi: {
          id: resource.id,
          title: resource.title,
          revision: resource.revision,
        },
      }
    : {
        schemaVersion: 1,
        kind: "kanban",
        title: resource.title,
        state: resource.state,
      };
}
export async function mutateSharedResource(
  id: string,
  operationId: string,
  input: unknown,
  actor: string,
) {
  const operation = operationSchema.parse(input);
  return locked(`shared:${id}`, async (tx) => {
    const row = (
      await tx.query("SELECT data FROM shared_resources WHERE id=$1", [id])
    ).rows[0];
    if (!row || row.data.deletedAt)
      throw new Fault(404, "This resource was deleted");
    if (
      (
        await tx.query(
          "SELECT 1 FROM shared_operations WHERE resource_id=$1 AND operation_id=$2",
          [id, operationId],
        )
      ).rows.length
    )
      return row.data as SharedResource;
    let next: SharedResource;
    try {
      next = applyOperation(row.data, operation, actor);
    } catch (error) {
      throw new Fault(
        error instanceof CollaborationConflict ? 409 : 400,
        error instanceof Error ? error.message : "Invalid update",
      );
    }
    await tx.query("BEGIN");
    try {
      await tx.query(
        "UPDATE shared_resources SET data=$2,revision=$3 WHERE id=$1",
        [id, JSON.stringify(next), next.revision],
      );
      await tx.query(
        "INSERT INTO shared_operations(resource_id,operation_id) VALUES($1,$2)",
        [id, operationId],
      );
      await tx.query("COMMIT");
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
    updates.emit(id);
    return next;
  });
}
async function syncResource(id: string) {
  return tryLocked(`shared-drive:${id}`, async () => {
    const snapshot = await resourceById(id, true);
    if (snapshot.deletedAt) return snapshot;
    const folder = await setting<string>("sharedDriveFolder", "");
    if (!folder)
      throw new Fault(
        409,
        "Ask an administrator to connect a shared-tools Drive folder. Edits are saved in IPI.",
      );
    if (snapshot.driveFolder && snapshot.driveFolder !== folder)
      throw new Fault(
        409,
        "This resource belongs to another Drive folder. Restore the original folder setting to resume its checkpoints.",
      );
    const result = await checkpointSharedDriveFile({
      parent: googleId(folder, "folder"),
      resourceId: id,
      name: `${snapshot.title.replace(/[\\/:*?"<>|]/g, "_")}.${snapshot.kind === "drawing" ? "excalidraw" : "kanban.json"}`,
      content: Buffer.from(JSON.stringify(sharedSnapshot(snapshot))),
      driveId: snapshot.driveId,
      checksum: snapshot.driveChecksum,
    });
    const preview = (
      await db.query("SELECT * FROM shared_previews WHERE resource_id=$1", [id])
    ).rows[0];
    if (snapshot.kind === "kanban" || preview?.revision === snapshot.revision) {
      const png = snapshot.kind === "drawing";
      const view = await checkpointSharedDriveFile({
        parent: googleId(folder, "folder"),
        resourceId: `${id}_preview`,
        name: `${snapshot.title.replace(/[\\/:*?"<>|]/g, "_")}.${png ? "png" : "html"}`,
        content: png
          ? Buffer.from(preview.content, "base64")
          : Buffer.from(readableBoard(snapshot)),
        mimeType: png ? "image/png" : "text/html",
        driveId: preview?.drive_id || null,
        checksum: preview?.checksum || undefined,
      });
      await db.query(
        "INSERT INTO shared_previews(resource_id,revision,content,drive_id,checksum) VALUES($1,$2,$3,$4,$5) ON CONFLICT(resource_id) DO UPDATE SET drive_id=$4,checksum=$5",
        [
          id,
          snapshot.revision,
          png ? preview.content : "",
          view.id,
          view.checksum,
        ],
      );
    }
    return locked(`shared:${id}`, async (tx) => {
      const current = (
        await tx.query("SELECT data FROM shared_resources WHERE id=$1", [id])
      ).rows[0]?.data as StoredResource;
      const next = {
        ...current,
        driveId: result.id,
        driveChecksum: result.checksum,
        driveFolder: folder,
        driveRevision: snapshot.revision,
        driveError: null,
      };
      await tx.query(
        "UPDATE shared_resources SET data=$2,drive_revision=$3,retry_at=now()+interval '5 seconds' WHERE id=$1",
        [id, JSON.stringify(next), snapshot.revision],
      );
      return next;
    });
  });
}
async function attemptSync(id: string) {
  try {
    return await syncResource(id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Drive saving failed";
    await locked(`shared:${id}`, async (tx) => {
      const row = (
        await tx.query("SELECT data FROM shared_resources WHERE id=$1", [id])
      ).rows[0];
      if (row)
        await tx.query(
          "UPDATE shared_resources SET data=$2,retry_at=now()+interval '60 seconds' WHERE id=$1",
          [id, JSON.stringify({ ...row.data, driveError: message })],
        );
    });
    throw error;
  }
}
export function registerCollaboration(app: express.Express, reauthorize = authenticate) {
  const router = express.Router();
  router.get("/settings", async (_req, res) =>
    res.json({ driveFolder: await setting("sharedDriveFolder", ""), demo }),
  );
  router.put("/settings", requireRole("administrator"), async (req, res) => {
    if (demo)
      throw new Fault(409, "Drive connections are unavailable in demo mode");
    const input = z.object({ driveFolder: z.string().min(1) }).parse(req.body);
    const folder = await driveFolder(input.driveFolder);
    if (
      folder.mimeType !== "application/vnd.google-apps.folder" ||
      !folder.capabilities?.canAddChildren
    )
      throw new Fault(
        403,
        "Share a Drive folder with the IPI service account as Editor",
      );
    await setSetting("sharedDriveFolder", input.driveFolder);
    await audit(req.user.email, "shared_drive_connected", "shared-tools", {
      folderId: folder.id,
    });
    res.json({ driveFolder: input.driveFolder, title: folder.name });
  });
  router.get("/", async (req, res) => {
    const deleted = req.query.deleted === "true";
    res.json(
      (
        await db.query(
          `SELECT data FROM shared_resources WHERE (data->>'deletedAt' IS ${deleted ? "NOT " : ""}NULL) ORDER BY data->>'updatedAt' DESC LIMIT 200`,
        )
      ).rows.map(({ data }) => {
        const { state, ...metadata } = data;
        return metadata;
      }),
    );
  });
  router.post("/", editor, async (req, res) => {
    const b = z
      .object({
        kind: z.enum(["kanban", "drawing"]),
        title: z.string().trim().min(1).max(160),
      })
      .parse(req.body);
    const id = randomUUID();
    const resource: StoredResource = {
      id,
      ...b,
      revision: 1,
      state: initialState(b.kind),
      createdBy: req.user.email,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      driveId: null,
      driveFolder: null,
      driveRevision: 0,
      driveError: null,
    };
    await db.query("INSERT INTO shared_resources(id,data) VALUES($1,$2)", [
      id,
      JSON.stringify(resource),
    ]);
    await audit(req.user.email, "shared_resource_created", id, {
      kind: b.kind,
    });
    res.status(201).json(resource);
  });
  router.post("/import", editor, async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(1).max(160),
        snapshot: z.record(z.unknown()),
      })
      .parse(req.body);
    const raw = input.snapshot;
    const kind =
      raw.type === "excalidraw"
        ? "drawing"
        : raw.kind === "kanban"
          ? "kanban"
          : null;
    if (!kind)
      throw new Fault(400, "Choose an IPI board export or an Excalidraw file");
    let resource: StoredResource = {
      id: randomUUID(),
      kind,
      title: input.title,
      revision: 1,
      state: initialState(kind),
      createdBy: req.user.email,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      driveId: null,
      driveFolder: null,
      driveRevision: 0,
      driveError: null,
    };
    if (kind === "drawing") {
      resource = applyOperation(
        resource,
        operationSchema.parse({
          type: "scene",
          elements: raw.elements,
          files: raw.files || {},
        }),
        req.user.email,
      );
    } else {
      const snapshot = z
        .object({
          columns: z
            .array(
              z.object({
                id: z.string(),
                title: z.string().trim().min(1).max(160),
                noteIds: z.array(z.string()).max(1000),
              }),
            )
            .min(1)
            .max(30),
          notes: z.record(
            z.object({
              id: z.string(),
              columnId: z.string(),
              title: z.string().max(160),
              body: z.string().max(10_000),
              color: z.enum(["paper", "sage", "amber", "blue"]),
            }),
          ),
        })
        .parse(raw.state);
      if (
        new Set(snapshot.columns.map((column) => column.id)).size !==
        snapshot.columns.length
      )
        throw new Fault(400, "Column identifiers must be unique");
      resource.state = { columns: [], notes: {} };
      const imported = new Set<string>();
      for (const column of snapshot.columns) {
        const columnId = randomUUID();
        resource = applyOperation(
          resource,
          { type: "column-add", id: columnId, title: column.title },
          req.user.email,
        );
        for (const noteId of column.noteIds) {
          const note = snapshot.notes[noteId];
          if (!note || note.columnId !== column.id || imported.has(noteId))
            throw new Fault(400, "The board contains invalid note references");
          imported.add(noteId);
          resource = applyOperation(
            resource,
            {
              type: "note-add",
              id: randomUUID(),
              columnId,
              title: note.title,
              body: note.body,
              color: note.color,
            },
            req.user.email,
          );
        }
      }
      if (imported.size !== Object.keys(snapshot.notes).length)
        throw new Fault(400, "Some notes are not assigned to a column");
    }
    resource.revision = 1;
    await db.query("INSERT INTO shared_resources(id,data) VALUES($1,$2)", [
      resource.id,
      JSON.stringify(resource),
    ]);
    await audit(req.user.email, "shared_resource_imported", resource.id, {
      kind,
    });
    res.status(201).json(resource);
  });
  router.get("/:id", async (req, res) => {
    const resource = await resourceById(identifier.parse(req.params.id));
    const known = new Set(String(req.query.knownFiles || "").split(","));
    res.json(
      resource.kind === "drawing"
        ? {
            ...resource,
            state: {
              ...resource.state,
              files: Object.fromEntries(
                Object.entries((resource.state as DrawingState).files).filter(
                  ([id]) => !known.has(id),
                ),
              ),
            },
          }
        : resource,
    );
  });
  router.post("/:id/operations", editor, async (req, res) => {
    const b = z
      .object({
        operationId: identifier,
        operation: z.unknown(),
        knownFiles: z.array(z.string()).max(1000).default([]),
      })
      .parse(req.body);
    const resource = await mutateSharedResource(
      identifier.parse(req.params.id),
      b.operationId,
      b.operation,
      req.user.email,
    );
    const known = new Set(b.knownFiles);
    res.json(
      resource.kind === "drawing"
        ? {
            ...resource,
            state: {
              ...resource.state,
              files: Object.fromEntries(
                Object.entries((resource.state as DrawingState).files).filter(
                  ([id]) => !known.has(id),
                ),
              ),
            },
          }
        : resource,
    );
  });
  router.delete("/:id", editor, async (req, res) => {
    const id = identifier.parse(req.params.id);
    const revision = z.number().int().positive().parse(req.body.revision);
    await locked(`shared:${id}`, async (tx) => {
      const row = (
        await tx.query("SELECT data FROM shared_resources WHERE id=$1", [id])
      ).rows[0];
      if (!row || row.data.deletedAt)
        throw new Fault(404, "Resource not found");
      if (row.data.revision !== revision)
        throw new Fault(
          409,
          "The resource changed. Review it before deleting.",
        );
      const data = {
        ...row.data,
        revision: revision + 1,
        deletedAt: new Date().toISOString(),
      };
      await tx.query(
        "UPDATE shared_resources SET data=$2,revision=$3 WHERE id=$1",
        [id, JSON.stringify(data), data.revision],
      );
    });
    await audit(req.user.email, "shared_resource_deleted", id);
    res.json({ ok: true });
  });
  router.post("/:id/restore", editor, async (req, res) => {
    const id = identifier.parse(req.params.id);
    const result = await locked(`shared:${id}`, async (tx) => {
      const row = (
        await tx.query("SELECT data FROM shared_resources WHERE id=$1", [id])
      ).rows[0];
      if (!row) throw new Fault(404, "Resource not found");
      const data = {
        ...row.data,
        deletedAt: null,
        revision: row.data.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      await tx.query(
        "UPDATE shared_resources SET data=$2,revision=$3 WHERE id=$1",
        [id, JSON.stringify(data), data.revision],
      );
      return data;
    });
    await audit(req.user.email, "shared_resource_restored", id);
    res.json(result);
  });
  router.get("/:id/export", async (req, res) => {
    const resource = await resourceById(identifier.parse(req.params.id));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${resource.kind === "drawing" ? "drawing.excalidraw" : "board.kanban.json"}"`,
    );
    res.json(sharedSnapshot(resource));
  });
  router.get("/:id/readable", async (req, res) => {
    const resource = await resourceById(identifier.parse(req.params.id));
    if (resource.kind !== "kanban")
      throw new Fault(400, "Readable export is available for boards");
    res.setHeader("Content-Disposition", 'attachment; filename="board.html"');
    res.type("html").send(readableBoard(resource));
  });
  router.post("/:id/preview", editor, async (req, res) => {
    const id = identifier.parse(req.params.id);
    const b = z
      .object({
        revision: z.number().int().positive(),
        png: z.string().max(6_000_000),
      })
      .parse(req.body);
    const bytes = Buffer.from(b.png, "base64");
    if (
      bytes.length > 4_000_000 ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    )
      throw new Fault(400, "Invalid PNG preview");
    await locked(`shared:${id}`, async (tx) => {
      const resource = (
        await tx.query("SELECT data FROM shared_resources WHERE id=$1", [id])
      ).rows[0]?.data;
      if (!resource || resource.deletedAt)
        throw new Fault(404, "Drawing not found");
      if (resource.kind !== "drawing" || resource.revision !== b.revision)
        throw new Fault(409, "Drawing changed during preview generation");
      const existing = (
        await tx.query(
          "SELECT revision FROM shared_previews WHERE resource_id=$1",
          [id],
        )
      ).rows[0];
      if (existing?.revision === b.revision) return;
      await tx.query(
        "INSERT INTO shared_previews(resource_id,revision,content) VALUES($1,$2,$3) ON CONFLICT(resource_id) DO UPDATE SET revision=$2,content=$3",
        [id, b.revision, b.png],
      );
      const driveRevision = Math.min(resource.driveRevision, b.revision - 1);
      await tx.query(
        "UPDATE shared_resources SET drive_revision=$2,data=$3 WHERE id=$1",
        [id, driveRevision, JSON.stringify({ ...resource, driveRevision })],
      );
    });
    res.json({ ok: true });
  });
  router.post("/:id/sync", editor, async (req, res) => {
    if (demo)
      throw new Fault(
        409,
        "Google Drive is unavailable in the demo. Edits are saved locally.",
      );
    res.json(
      (await attemptSync(identifier.parse(req.params.id))) ||
        (await resourceById(String(req.params.id))),
    );
  });
  router.post("/:id/presence", async (req, res) => {
    const id = identifier.parse(req.params.id);
    await resourceById(id);
    const b = z
      .object({
        clientId: identifier,
        pointer: z
          .object({
            x: z.number().finite(),
            y: z.number().finite(),
            button: z.enum(["up", "down"]),
          })
          .nullable()
          .optional(),
      })
      .parse(req.body);
    await db.query(
      "INSERT INTO shared_presence(resource_id,client_id,email,name,role,pointer,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '20 seconds') ON CONFLICT(resource_id,client_id) DO UPDATE SET name=$4,role=$5,pointer=$6,expires_at=now()+interval '20 seconds' WHERE shared_presence.email=$3",
      [
        id,
        b.clientId,
        req.user.email,
        req.user.name,
        req.user.role,
        JSON.stringify(b.pointer || null),
      ],
    );
    res.json({ ok: true });
  });
  router.get("/:id/events", async (req, res) => {
    const id = identifier.parse(req.params.id);
    await resourceById(id);
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    let closed = false,
      busy = false,
      last = "";
    const send = async () => {
      if (closed || busy) return;
      busy = true;
      try {
        await reauthorize(req, res, () => {});
        const row = (
          await db.query(
            "SELECT revision, data->'driveRevision' AS drive_revision, data->>'driveError' AS drive_error, data->>'driveId' AS drive_id FROM shared_resources WHERE id=$1 AND data->>'deletedAt' IS NULL",
            [id],
          )
        ).rows[0];
        if (!row) throw new Fault(404, "Resource removed");
        const resource = {
          revision: row.revision,
          driveRevision: row.drive_revision,
          driveError: row.drive_error,
          driveId: row.drive_id,
        };
        const presence = (
          await db.query(
            "SELECT client_id AS id,name,role,pointer FROM shared_presence WHERE resource_id=$1 AND expires_at>now() ORDER BY client_id",
            [id],
          )
        ).rows;
        const fingerprint = JSON.stringify([
          resource.revision,
          resource.driveRevision,
          resource.driveError,
          req.user.role,
          presence,
        ]);
        if (last !== fingerprint) {
          last = fingerprint;
          res.write(
            `data: ${JSON.stringify({ revision: resource.revision, driveRevision: resource.driveRevision, driveError: resource.driveError, driveId: resource.driveId, participants: presence, role: req.user.role })}\n\n`,
          );
        } else res.write(": heartbeat\n\n");
      } catch {
        res.write("event: access-ended\ndata: {}\n\n");
        res.end();
      } finally {
        busy = false;
      }
    };
    const onUpdate = () => void send();
    updates.on(id, onUpdate);
    const timer = setInterval(onUpdate, 750);
    timer.unref();
    req.on("close", () => {
      closed = true;
      clearInterval(timer);
      updates.off(id, onUpdate);
    });
    void send();
  });
  app.use("/api/collaboration", router);
  const cleanup = setInterval(
    () =>
      void db
        .query(
          "DELETE FROM shared_presence WHERE expires_at < now()-interval '1 minute'",
        )
        .catch(() => {}),
    60_000,
  );
  cleanup.unref();
  let queueBusy = false;
  const timer = setInterval(async () => {
    if (demo || queueBusy) return;
    queueBusy = true;
    try {
      if (!(await setting("sharedDriveFolder", ""))) return;
      const pending = (
        await db.query(
          "SELECT id FROM shared_resources WHERE revision>drive_revision AND data->>'deletedAt' IS NULL AND retry_at<=now() ORDER BY retry_at LIMIT 4",
        )
      ).rows;
      for (const row of pending) await attemptSync(row.id).catch(() => {});
    } catch {
      /* The persistent queue retries on the next pass. */
    } finally {
      queueBusy = false;
    }
  }, 10_000);
  timer.unref();
}
