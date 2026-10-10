import { z } from "zod";
import * as Y from "yjs";

export type ResourceKind = "kanban" | "drawing";
export type NoteColor = "paper" | "sage" | "amber" | "blue" | `#${string}`;
export const noteColorSchema = z.union([z.enum(["paper", "sage", "amber", "blue"]), z.string().regex(/^#[0-9a-fA-F]{6}$/)]).transform(value => value as NoteColor);
export function noteColorHex(color: NoteColor): string {
  return ({ paper: '#eef0e8', sage: '#dce8d4', amber: '#f5e8c8', blue: '#dce8ef' } as Record<string, string>)[color] || color;
}
export function noteColorInk(color: NoteColor): string {
  const rgb = noteColorHex(color).slice(1).match(/../g)!.map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .179 ? '#000000' : '#ffffff';
}
export interface StickyNote {
  id: string;
  columnId: string;
  title: string;
  body: string;
  bodyState: number[];
  color: NoteColor;
  revision: number;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
}
export interface BoardColumn {
  id: string;
  title: string;
  noteIds: string[];
}
export interface BoardState {
  columns: BoardColumn[];
  notes: Record<string, StickyNote>;
}
export interface DrawingState {
  elements: any[];
  files: Record<string, any>;
}
export interface SharedResource {
  id: string;
  kind: ResourceKind;
  title: string;
  revision: number;
  state: BoardState | DrawingState;
  createdBy: string;
  updatedAt: string;
  deletedAt: string | null;
  driveId: string | null;
  driveRevision: number;
  driveError: string | null;
  driveFolder: string | null;
}
export interface Participant {
  id: string;
  name: string;
  role: string;
  pointer?: { x: number; y: number; button: "up" | "down" };
}
const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
const bytes = z.array(z.number().int().min(0).max(255)).max(200_000);
const title = z.string().trim().min(1).max(160);
export const operationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rename"),
    title,
    revision: z.number().int().positive(),
  }),
  z.object({ type: z.literal("column-add"), id, title }),
  z.object({ type: z.literal("column-rename"), id, title, before: z.string() }),
  z.object({ type: z.literal("column-move"), id, beforeId: id.nullable() }),
  z.object({
    type: z.literal("column-delete"),
    id,
    destination: id.nullable(),
    revision: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("note-add"),
    id,
    columnId: id,
    title: z.string().max(160),
    body: z.string().max(10_000),
    color: noteColorSchema,
  }),
  z.object({
    type: z.literal("note-edit"),
    id,
    title: z.string().max(160),
    color: noteColorSchema,
    revision: z.number().int().positive(),
    beforeTitle: z.string().max(160).optional(),
    beforeColor: noteColorSchema.optional(),
    bodyUpdate: bytes.optional(),
  }),
  z.object({ type: z.literal("note-text"), id, update: bytes }),
  z.object({
    type: z.literal("note-move"),
    id,
    columnId: id,
    beforeId: id.nullable(),
  }),
  z.object({
    type: z.literal("note-delete"),
    id,
    revision: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("scene"),
    elements: z
      .array(
        z
          .object({
            id,
            version: z.number().int().nonnegative(),
            versionNonce: z.number().int(),
            isDeleted: z.boolean(),
          })
          .passthrough(),
      )
      .max(5000),
    files: z
      .record(
        z
          .object({
            id,
            mimeType: z.enum([
              "image/png",
              "image/jpeg",
              "image/webp",
              "image/gif",
              "image/svg+xml",
            ]),
            dataURL: z.string().max(8_000_000),
            created: z.number(),
          })
          .passthrough(),
      )
      .default({}),
  }),
]);
export type SharedOperation = z.infer<typeof operationSchema>;
export class CollaborationConflict extends Error {}
export function initialState(kind: ResourceKind): BoardState | DrawingState {
  return kind === "drawing"
    ? { elements: [], files: {} }
    : {
        columns: [
          { id: "todo", title: "To do", noteIds: [] },
          { id: "progress", title: "In progress", noteIds: [] },
          { id: "done", title: "Done", noteIds: [] },
        ],
        notes: {},
      };
}
export function textState(body: string) {
  const doc = new Y.Doc();
  try {
    doc.getText("body").insert(0, body);
    return Array.from(Y.encodeStateAsUpdate(doc));
  } finally {
    doc.destroy();
  }
}
export function mergeText(state: number[], update: number[]) {
  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, new Uint8Array(state));
    Y.applyUpdate(doc, new Uint8Array(update));
    const body = doc.getText("body").toString();
    if (body.length > 10_000 || Y.encodeStateAsUpdate(doc).length > 200_000)
      throw new Error("Note exceeds the supported text size");
    return { body, bodyState: Array.from(Y.encodeStateAsUpdate(doc)) };
  } finally {
    doc.destroy();
  }
}
/** Match Excalidraw's element-version ordering; a tie is deterministic, not arrival-dependent. */
export function mergeElements(current: any[], incoming: any[]) {
  const elements = new Map(current.map((element) => [element.id, element]));
  for (const element of incoming) {
    const previous = elements.get(element.id);
    if (
      !previous ||
      element.version > previous.version ||
      (element.version === previous.version &&
        element.versionNonce < previous.versionNonce)
    )
      elements.set(element.id, element);
  }
  return [...elements.values()];
}
export function applyOperation(
  resource: SharedResource,
  operation: SharedOperation,
  actor: string,
  now = new Date().toISOString(),
): SharedResource {
  // Copy board containers, then copy only notes touched by this operation.
  // Large boards keep unchanged note identities and avoid cloning every text state.
  const board = resource.state as BoardState;
  const next: SharedResource = resource.kind === 'kanban' ? {
    ...resource,
    state: { columns: board.columns.map(column => ({ ...column, noteIds: [...column.noteIds] })), notes: { ...board.notes } },
  } : structuredClone(resource);
  const conflict = (message: string): never => {
    throw new CollaborationConflict(message);
  };
  if (operation.type === "rename") {
    if (operation.revision !== next.revision)
      conflict("The resource changed. Reload before renaming.");
    next.title = operation.title;
  } else if (operation.type === "scene") {
    if (next.kind !== "drawing")
      throw new Error("This resource is not a drawing");
    const state = next.state as DrawingState;
    for (const [key, file] of Object.entries(operation.files)) {
      if (
        key !== file.id ||
        !file.dataURL.startsWith(`data:${file.mimeType};base64,`)
      )
        throw new Error("Invalid drawing image");
    }
    if (Object.keys({ ...state.files, ...operation.files }).length > 1000)
      throw new Error("A drawing supports up to 1,000 images");
    state.elements = mergeElements(state.elements, operation.elements);
    state.files = { ...state.files, ...operation.files };
    if (
      state.elements.length > 5000 ||
      JSON.stringify(state).length > 14_000_000
    )
      throw new Error("Drawing exceeds the supported size");
  } else {
    if (next.kind !== "kanban")
      throw new Error("This resource is not a Kanban board");
    const state = next.state as BoardState;
    const column = (columnId: string) =>
      state.columns.find((item) => item.id === columnId) ||
      conflict("This column was removed. Choose another column.");
    const note = (noteId: string) => {
      const previous = state.notes[noteId];
      if (!previous) conflict(
        "This note was removed by another user. Your edits were not applied.",
      );
      return state.notes[noteId] = { ...previous };
    };
    switch (operation.type) {
      case "column-add":
        if (state.columns.length >= 30)
          throw new Error("A board supports up to 30 columns");
        if (state.columns.some((c) => c.id === operation.id))
          conflict("Column already exists");
        state.columns.push({
          id: operation.id,
          title: operation.title,
          noteIds: [],
        });
        break;
      case "column-rename": {
        const c = column(operation.id);
        if (c.title !== operation.before)
          conflict("Column title changed. Reload before renaming.");
        c.title = operation.title;
        break;
      }
      case "column-move": {
        const c = column(operation.id);
        if (operation.beforeId === c.id) break;
        const target = operation.beforeId ? column(operation.beforeId) : null;
        state.columns = state.columns.filter((item) => item.id !== c.id);
        state.columns.splice(
          target ? state.columns.indexOf(target) : state.columns.length,
          0,
          c,
        );
        break;
      }
      case "column-delete": {
        if (next.revision !== operation.revision)
          conflict("Board changed. Review the column before deleting.");
        if (state.columns.length === 1)
          throw new Error("Keep at least one column");
        const c = column(operation.id);
        if (operation.destination === c.id)
          throw new Error("Choose a different destination");
        if (operation.destination) {
          const target = column(operation.destination);
          for (const nid of c.noteIds) {
            target.noteIds.push(nid);
            state.notes[nid] = { ...state.notes[nid], columnId: target.id };
          }
        } else for (const nid of c.noteIds) delete state.notes[nid];
        state.columns = state.columns.filter((item) => item.id !== c.id);
        break;
      }
      case "note-add": {
        const c = column(operation.columnId);
        if (state.notes[operation.id]) conflict("Note already exists");
        if (Object.keys(state.notes).length >= 1000)
          throw new Error("A board supports up to 1,000 notes");
        state.notes[operation.id] = {
          id: operation.id,
          columnId: c.id,
          title: operation.title,
          body: operation.body,
          bodyState: textState(operation.body),
          color: operation.color,
          revision: 1,
          createdBy: actor,
          updatedBy: actor,
          updatedAt: now,
        };
        c.noteIds.push(operation.id);
        break;
      }
      case "note-edit": {
        const n = note(operation.id);
        const stale =
          operation.beforeTitle !== undefined
            ? n.title !== operation.beforeTitle ||
              (operation.beforeColor !== undefined &&
                n.color !== operation.beforeColor)
            : n.revision !== operation.revision;
        if (stale)
          conflict(
            "This note changed while you were editing. Your draft is still available; review the latest note before saving again.",
          );
        n.title = operation.title;
        n.color = operation.color;
        if (operation.bodyUpdate)
          Object.assign(n, mergeText(n.bodyState, operation.bodyUpdate));
        n.revision++;
        n.updatedBy = actor;
        n.updatedAt = now;
        break;
      }
      case "note-text": {
        const n = note(operation.id);
        Object.assign(n, mergeText(n.bodyState, operation.update));
        n.revision++;
        n.updatedBy = actor;
        n.updatedAt = now;
        break;
      }
      case "note-move": {
        const n = note(operation.id);
        const c = column(operation.columnId);
        if (operation.beforeId === n.id) break;
        if (operation.beforeId && !c.noteIds.includes(operation.beforeId))
          conflict("The drop target moved. Try again.");
        for (const item of state.columns)
          item.noteIds = item.noteIds.filter((nid) => nid !== n.id);
        c.noteIds.splice(
          operation.beforeId
            ? c.noteIds.indexOf(operation.beforeId)
            : c.noteIds.length,
          0,
          n.id,
        );
        n.columnId = c.id;
        n.revision++;
        n.updatedBy = actor;
        n.updatedAt = now;
        break;
      }
      case "note-delete": {
        const n = note(operation.id);
        if (n.revision !== operation.revision)
          conflict("This note changed. Review it before deleting.");
        for (const c of state.columns)
          c.noteIds = c.noteIds.filter((nid) => nid !== n.id);
        delete state.notes[n.id];
        break;
      }
    }
  }
  next.revision++;
  next.updatedAt = now;
  return next;
}
