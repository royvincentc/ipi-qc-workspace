import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import express from "express";

test("shared API enforces viewer writes, durable idempotency, deletion, and restore", async () => {
  process.env.DEMO_MODE = "true";
  process.env.DEMO_DB_PATH = path.resolve(
    "tmp",
    `shared-api-test-${randomUUID()}`,
  );
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "";
  process.env.GOOGLE_CLIENT_SECRET = "";
  const { db, migrate, close } = await import("../server/db.js");
  const { registerCollaboration } = await import("../server/collaboration.js");
  await migrate();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = {
      email: "a@example.test",
      name: "Test User",
      role: req.headers["x-test-role"] === "viewer" ? "viewer" : "analyst",
    };
    next();
  });
  registerCollaboration(app);
  app.use(
    (
      error: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => res.status(error.status || 400).json({ error: error.message }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/api/collaboration`;
  const request = (
    url: string,
    method = "GET",
    body?: unknown,
    role = "analyst",
  ) =>
    fetch(base + url, {
      method,
      headers: { "Content-Type": "application/json", "x-test-role": role },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    assert.equal(
      (
        await request(
          "/",
          "POST",
          { kind: "kanban", title: "Forbidden" },
          "viewer",
        )
      ).status,
      403,
    );
    const response = await request("/", "POST", {
      kind: "kanban",
      title: "Shared board",
    });
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.equal(
      (await request(`/${created.id}`, "GET", undefined, "viewer")).status,
      200,
    );
    const operation = {
      operationId: randomUUID(),
      operation: {
        type: "note-add",
        id: "note",
        columnId: "todo",
        title: "Collaborative",
        body: "Saved",
        color: "paper",
      },
    };
    assert.equal(
      (await request(`/${created.id}/operations`, "POST", operation, "viewer"))
        .status,
      403,
    );
    const saved = await (
      await request(`/${created.id}/operations`, "POST", operation)
    ).json();
    const replay = await (
      await request(`/${created.id}/operations`, "POST", operation)
    ).json();
    assert.equal(saved.revision, replay.revision);
    assert.equal(
      (
        await db.query("SELECT revision FROM shared_resources WHERE id=$1", [
          created.id,
        ])
      ).rows[0].revision,
      2,
    );
    assert.equal(
      (await request(`/${created.id}`, "DELETE", { revision: 2 }, "viewer"))
        .status,
      403,
    );
    assert.equal(
      (await request(`/${created.id}`, "DELETE", { revision: 1 })).status,
      409,
    );
    assert.equal(
      (await request(`/${created.id}`, "DELETE", { revision: 2 })).status,
      200,
    );
    assert.equal((await request(`/${created.id}`)).status, 404);
    assert.equal(
      (await request(`/${created.id}/restore`, "POST", {}, "viewer")).status,
      403,
    );
    assert.equal(
      (await request(`/${created.id}/restore`, "POST", {})).status,
      200,
    );
    const restored = await (await request(`/${created.id}`)).json();
    assert.equal(restored.state.notes.note.body, "Saved");
    const snapshot = await (
      await request(`/${created.id}/export`, "GET", undefined, "viewer")
    ).json();
    const imported = await request("/import", "POST", {
      title: "Recovered board",
      snapshot,
    });
    assert.equal(imported.status, 201);
    const recovered = await imported.json();
    assert.notEqual(recovered.id, created.id);
    assert.equal(Object.values<any>(recovered.state.notes)[0].body, "Saved");
    assert.equal(
      (
        await request(
          "/import",
          "POST",
          { title: "Forbidden restore", snapshot },
          "viewer",
        )
      ).status,
      403,
    );
    const readable = await (await request(`/${created.id}/readable`)).text();
    assert.match(readable, /Collaborative/);
    assert.match(readable, /Saved/);
    const broken = structuredClone(snapshot);
    broken.state.columns[0].noteIds.push("missing");
    assert.equal(
      (await request("/import", "POST", { title: "Broken", snapshot: broken }))
        .status,
      400,
    );
    const drawing = await (
      await request("/", "POST", { kind: "drawing", title: "Drawing" })
    ).json();
    const image = {
      id: "image",
      mimeType: "image/png",
      created: 1,
      dataURL: "data:image/png;base64,iVBORw0KGgo=",
    };
    assert.equal(
      (
        await request(`/${drawing.id}/operations`, "POST", {
          operationId: randomUUID(),
          operation: { type: "scene", elements: [], files: { image } },
        })
      ).status,
      200,
    );
    const partial = await (
      await request(`/${drawing.id}?knownFiles=image`)
    ).json();
    assert.deepEqual(partial.state.files, {});
    assert.equal(
      (
        await request(
          `/${drawing.id}/preview`,
          "POST",
          { revision: 2, png: "iVBORw0KGgo=" },
          "viewer",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(`/${drawing.id}/preview`, "POST", {
          revision: 1,
          png: "iVBORw0KGgo=",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request(`/${drawing.id}/preview`, "POST", {
          revision: 2,
          png: "iVBORw0KGgo=",
        })
      ).status,
      200,
    );
    const recoveredDrawing = await request("/import", "POST", {
      title: "Recovered drawing",
      snapshot: await (await request(`/${drawing.id}/export`)).json(),
    });
    assert.equal(recoveredDrawing.status, 201);
    assert.equal(
      (await recoveredDrawing.json()).state.files.image.dataURL,
      image.dataURL,
    );
    const hexOperation = { operationId: randomUUID(), operation: { type: 'note-edit', id: 'note', title: 'Collaborative', color: '#123ABC', revision: restored.state.notes.note.revision, beforeTitle: 'Collaborative', beforeColor: 'paper' } };
    assert.equal((await request(`/${created.id}/operations`, 'POST', hexOperation)).status, 200);
    const hexSnapshot = await (await request(`/${created.id}/export`)).json();
    const hexImport = await request('/import', 'POST', { title: 'Hex restore', snapshot: hexSnapshot });
    assert.equal(hexImport.status, 201);
    assert.equal(Object.values<any>((await hexImport.json()).state.notes)[0].color, '#123ABC');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await close();
  }
});
