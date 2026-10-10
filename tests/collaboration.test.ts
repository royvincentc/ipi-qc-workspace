import test from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";
import {
  applyOperation,
  initialState,
  mergeElements,
  mergeText,
  textState,
  operationSchema,
  noteColorSchema,
  noteColorInk,
  CollaborationConflict,
  type SharedResource,
  type BoardState,
} from "../shared/collaboration.js";
test('hex note colors are accepted without allowing CSS injection, with readable ink', () => {
  assert.equal(noteColorSchema.parse('#123ABC'), '#123ABC');
  assert.equal(noteColorSchema.parse('sage'), 'sage');
  assert.equal(noteColorSchema.safeParse('#fff; background:url(x)').success, false);
  assert.equal(noteColorSchema.safeParse('#xyz123').success, false);
  assert.equal(noteColorInk('#000000'), '#ffffff');
  assert.equal(noteColorInk('#ffffff'), '#000000');
});

function board(): SharedResource {
  return {
    id: "board",
    kind: "kanban",
    title: "Team notes",
    state: initialState("kanban"),
    revision: 1,
    createdBy: "a@example.test",
    updatedAt: "2026-10-10",
    deletedAt: null,
    driveId: null,
    driveRevision: 0,
    driveError: null,
    driveFolder: null,
  };
}

test('local moves preserve the original board and untouched note identities', () => {
  let before = board();
  for (const id of ['moving', 'untouched']) before = applyOperation(before, { type: 'note-add', id, columnId: 'todo', title: id, body: 'Text', color: 'paper' }, 'a@example.test');
  const original = structuredClone(before);
  const after = applyOperation(before, { type: 'note-move', id: 'moving', columnId: 'done', beforeId: null }, 'a@example.test');
  assert.deepEqual(before, original);
  assert.equal((after.state as BoardState).notes.untouched, (before.state as BoardState).notes.untouched);
  assert.notEqual((after.state as BoardState).notes.moving, (before.state as BoardState).notes.moving);
  const transferred = applyOperation(before, { type: 'column-delete', id: 'todo', destination: 'done', revision: before.revision }, 'a@example.test');
  assert.deepEqual(before, original);
  assert.equal((transferred.state as BoardState).notes.untouched.columnId, 'done');
});
function withNote() {
  return applyOperation(
    board(),
    {
      type: "note-add",
      id: "note",
      columnId: "todo",
      title: "Start",
      body: "Hello",
      color: "paper",
    },
    "a@example.test",
  );
}
test("concurrent text edits converge in either order and replay is idempotent", () => {
  const state = textState("Hello");
  const a = new Y.Doc(),
    b = new Y.Doc();
  Y.applyUpdate(a, new Uint8Array(state));
  Y.applyUpdate(b, new Uint8Array(state));
  let ua!: Uint8Array, ub!: Uint8Array;
  a.on("update", (update) => (ua = update));
  b.on("update", (update) => (ub = update));
  a.getText("body").insert(5, " team");
  b.getText("body").insert(0, "Hi! ");
  const first = mergeText(mergeText(state, [...ua]).bodyState, [...ub]);
  const second = mergeText(mergeText(state, [...ub]).bodyState, [...ua]);
  assert.equal(first.body, second.body);
  assert.match(first.body, /Hi! Hello team/);
  assert.equal(mergeText(first.bodyState, [...ua]).body, first.body);
  a.destroy();
  b.destroy();
});
test("moving a note keeps one reference and column deletion transfers contents", () => {
  let resource = withNote();
  resource = applyOperation(
    resource,
    { type: "note-move", id: "note", columnId: "progress", beforeId: null },
    "b@example.test",
  );
  let state = resource.state as BoardState;
  assert.deepEqual(state.columns[0].noteIds, []);
  assert.deepEqual(state.columns[1].noteIds, ["note"]);
  resource = applyOperation(
    resource,
    {
      type: "column-delete",
      id: "progress",
      destination: "done",
      revision: resource.revision,
    },
    "b@example.test",
  );
  state = resource.state as BoardState;
  assert.equal(state.notes.note.columnId, "done");
  assert.deepEqual(state.columns.find((c) => c.id === "done")?.noteIds, [
    "note",
  ]);
});
test("stale deletion and title changes are rejected; deleted notes cannot be edited or moved", () => {
  let resource = withNote();
  const original = resource;
  resource = applyOperation(
    resource,
    {
      type: "note-edit",
      id: "note",
      title: "Changed",
      color: "paper",
      revision: 1,
    },
    "b@example.test",
  );
  assert.throws(
    () =>
      applyOperation(
        resource,
        { type: "note-delete", id: "note", revision: 1 },
        "a@example.test",
      ),
    CollaborationConflict,
  );
  assert.throws(
    () =>
      applyOperation(
        resource,
        {
          type: "note-edit",
          id: "note",
          title: "Stale",
          color: "paper",
          revision: 1,
        },
        "a@example.test",
      ),
    CollaborationConflict,
  );
  assert.equal((original.state as BoardState).notes.note.title, "Start");
  resource = applyOperation(
    resource,
    { type: "note-delete", id: "note", revision: 2 },
    "b@example.test",
  );
  assert.throws(
    () =>
      applyOperation(
        resource,
        { type: "note-move", id: "note", columnId: "done", beforeId: null },
        "a@example.test",
      ),
    CollaborationConflict,
  );
});
test("metadata edits can coexist with text edits but cannot overwrite changed metadata", () => {
  let resource = withNote();
  resource = applyOperation(
    resource,
    {
      type: "note-edit",
      id: "note",
      title: "Changed",
      color: "sage",
      revision: 1,
      beforeTitle: "Start",
      beforeColor: "paper",
    },
    "b@example.test",
  );
  assert.throws(
    () =>
      applyOperation(
        resource,
        {
          type: "note-edit",
          id: "note",
          title: "Overwrite",
          color: "paper",
          revision: 2,
          beforeTitle: "Start",
          beforeColor: "paper",
        },
        "a@example.test",
      ),
    CollaborationConflict,
  );
});
test("drawing element updates and deletion tombstones converge independently of arrival order", () => {
  const initial = {
    id: "shape",
    version: 1,
    versionNonce: 3,
    isDeleted: false,
    x: 0,
  };
  const a = { ...initial, version: 2, versionNonce: 20, x: 5 };
  const b = { ...initial, version: 2, versionNonce: 10, x: 10 };
  assert.deepEqual(
    mergeElements(mergeElements([initial], [a]), [b]),
    mergeElements(mergeElements([initial], [b]), [a]),
  );
  const deleted = { ...b, version: 3, isDeleted: true };
  assert.deepEqual(mergeElements([deleted], [a]), [deleted]);
  assert.equal(mergeElements([a], [{ ...a, id: "another" }]).length, 2);
});
test("invalid image files, oversize text, and wrong resource operations are rejected", () => {
  assert.equal(
    operationSchema.safeParse({
      type: "note-add",
      id: "note",
      columnId: "todo",
      title: "",
      body: "a".repeat(10001),
      color: "paper",
    }).success,
    false,
  );
  const drawing = {
    ...board(),
    kind: "drawing" as const,
    state: initialState("drawing"),
  };
  assert.throws(
    () =>
      applyOperation(
        drawing,
        {
          type: "scene",
          elements: [],
          files: {
            image: {
              id: "image",
              mimeType: "image/png",
              created: 1,
              dataURL: "https://untrusted.example/image",
            },
          },
        },
        "a@example.test",
      ),
    /Invalid drawing image/,
  );
  assert.throws(
    () =>
      applyOperation(
        board(),
        { type: "scene", elements: [], files: {} },
        "a@example.test",
      ),
    /not a drawing/,
  );
});
