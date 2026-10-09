import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  SlidersHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import * as Y from "yjs";
import { Field, Notice } from "./ui";
import Dialog from "./dialog";
import { useUnsaved } from "./configuration";
import type {
  BoardColumn,
  BoardState,
  NoteColor,
  SharedOperation,
  SharedResource,
  StickyNote,
} from "../shared/collaboration";

type Mutate = (operation: SharedOperation) => void;
function useNoteBody(note: StickyNote, mutate: Mutate, removed = false) {
  const [body, setBody] = useState(note.body);
  const doc = useRef<Y.Doc | undefined>(undefined);
  const input = useRef<HTMLTextAreaElement>(null);
  const pendingUpdates = useRef<Uint8Array[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [textPending, setTextPending] = useState(false);
  const mutation = useRef(mutate);
  mutation.current = mutate;
  const flush = useCallback(() => {
    if (pendingUpdates.current.length) {
      mutation.current({
        type: "note-text",
        id: note.id,
        update: Array.from(Y.mergeUpdates(pendingUpdates.current)),
      });
      pendingUpdates.current = [];
      setTextPending(false);
    }
  }, [note.id]);
  useEffect(() => {
    const document = new Y.Doc();
    doc.current = document;
    Y.applyUpdate(document, new Uint8Array(note.bodyState));
    setBody(document.getText("body").toString());
    const update = (bytes: Uint8Array, origin: unknown) => {
      setBody(document.getText("body").toString());
      if (origin === "local") {
        pendingUpdates.current.push(bytes);
        setTextPending(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, 250);
      }
    };
    document.on("update", update);
    return () => {
      clearTimeout(timer.current);
      flush();
      document.destroy();
    };
  }, [note.id]);
  useEffect(() => {
    const document = doc.current;
    if (!document) return;
    const text = document.getText("body");
    const focused = window.document.activeElement === input.current;
    const start = focused
      ? Y.createRelativePositionFromTypeIndex(
          text,
          input.current!.selectionStart,
        )
      : null;
    const end = focused
      ? Y.createRelativePositionFromTypeIndex(text, input.current!.selectionEnd)
      : null;
    Y.applyUpdate(document, new Uint8Array(note.bodyState), "remote");
    if (start && end)
      requestAnimationFrame(() => {
        if (document.isDestroyed) return;
        const a = Y.createAbsolutePositionFromRelativePosition(start, document),
          b = Y.createAbsolutePositionFromRelativePosition(end, document);
        if (a && b) input.current?.setSelectionRange(a.index, b.index);
      });
  }, [note.bodyState]);
  const changeBody = useCallback(
    (value: string) => {
      if (!doc.current || removed) return;
      const text = doc.current.getText("body"),
        previous = text.toString();
      let start = 0;
      while (
        start < previous.length &&
        start < value.length &&
        previous[start] === value[start]
      )
        start++;
      let end = 0;
      while (
        end < previous.length - start &&
        end < value.length - start &&
        previous[previous.length - 1 - end] === value[value.length - 1 - end]
      )
        end++;
      doc.current.transact(() => {
        text.delete(start, previous.length - start - end);
        text.insert(start, value.slice(start, value.length - end));
      }, "local");
    },
    [removed],
  );
  return { body, input, textPending, flush, changeBody };
}

const colors: NoteColor[] = ["paper", "sage", "amber", "blue"];
const Sticky = memo(
  function Sticky({
    note,
    canEdit,
    onOpen,
    top,
    index,
    measure,
    mutate,
    placed,
  }: {
    note: StickyNote;
    canEdit: boolean;
    onOpen: () => void;
    top: number;
    index: number;
    measure: (node: HTMLElement | null) => void;
    mutate: Mutate;
    placed: boolean;
  }) {
    const { body, input, textPending, flush, changeBody } = useNoteBody(
      note,
      mutate,
    );
    const wasSaving = useRef(false);
    const [saved, setSaved] = useState(false);
    const saving = textPending || body !== note.body;
    useUnsaved(textPending);
    useEffect(() => {
      if (wasSaving.current && !saving) {
        setSaved(true);
        const timeout = setTimeout(() => setSaved(false), 650);
        wasSaving.current = false;
        return () => clearTimeout(timeout);
      }
      if (textPending) {
        wasSaving.current = true;
        setSaved(false);
      }
    }, [saving, textPending]);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: `note:${note.id}`, disabled: !canEdit });
    const attach = useCallback(
      (node: HTMLElement | null) => {
        setNodeRef(node);
        measure(node);
      },
      [setNodeRef, measure],
    );
    const openRef = useRef(onOpen);
    openRef.current = onOpen;
    const contents = useMemo(
      () => (
        <>
          <div className="sticky-top">
            <button
              className="sticky-open sticky-header-drag"
              aria-label={`Move ${note.title || "note"}`}
              disabled={!canEdit}
              {...attributes}
              {...listeners}
            >
              {canEdit ? <GripVertical size={15} aria-hidden="true" /> : null}
              <strong>{note.title || "Untitled note"}</strong>
            </button>
            {canEdit ? (
              <button
                className="sticky-grip"
                aria-label={`Settings for ${note.title || "note"}`}
                onClick={() => openRef.current()}
              >
                <SlidersHorizontal size={17} />
              </button>
            ) : null}
          </div>
          <textarea
            className="sticky-body"
            ref={input}
            onFocus={() => openRef.current()}
            onBlur={flush}
            onChange={(event) => changeBody(event.target.value)}
            value={body}
            readOnly={!canEdit}
            maxLength={10_000}
            rows={Math.max(3, Math.min(6, Math.ceil(body.length / 42)))}
            aria-label={`Note text: ${note.title || "Untitled note"}`}
            placeholder="Write a note…"
          />
          <span className="sticky-inline-status" role="status">
            {saving ? "Saving…" : saved ? "Saved" : ""}
          </span>
          <small>{note.updatedBy.split("@")[0]}</small>
        </>
      ),
      [
        note,
        body,
        input,
        canEdit,
        attributes,
        listeners,
        flush,
        changeBody,
        saving,
        saved,
      ],
    );
    return (
      <article
        ref={attach}
        data-index={index}
        className={`sticky-note sticky-${note.color}${isDragging ? " dragging" : ""}${placed ? " placed" : ""}${saved ? " edit-saved" : ""}`}
        style={{
          position: "absolute",
          width: "100%",
          top,
          transform: CSS.Transform.toString(transform),
          transition: transition || undefined,
        }}
      >
        {contents}
      </article>
    );
  },
  (before, after) =>
    before.note === after.note &&
    before.canEdit === after.canEdit &&
    before.top === after.top &&
    before.index === after.index &&
    before.placed === after.placed,
);
function Column({
  column,
  state,
  canEdit,
  mutate,
  open,
  manage,
  placedId,
}: {
  column: BoardColumn;
  state: BoardState;
  canEdit: boolean;
  mutate: Mutate;
  open: (id: string) => void;
  manage: () => void;
  placedId?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${column.id}` });
  const viewport = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({
    count: column.noteIds.length,
    getScrollElement: () => viewport.current,
    estimateSize: () => 174,
    overscan: 5,
    gap: 12,
    getItemKey: (index) => column.noteIds[index],
  });
  return (
    <section
      className={`kanban-column ${isOver ? "drop-target" : ""}`}
      aria-label={column.title}
      ref={setNodeRef}
    >
      <div className="kanban-column-heading">
        <h2>
          {column.title}
          <span>{column.noteIds.length}</span>
        </h2>
        {canEdit ? (
          <button
            className="icon-button"
            aria-label={`Manage ${column.title}`}
            onClick={manage}
          >
            <ColumnsIcon />
          </button>
        ) : null}
      </div>
      <SortableContext
        items={column.noteIds.map((id) => `note:${id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="kanban-note-stack"
          ref={viewport}
          style={{ maxHeight: "min(60dvh, 600px)", overflowY: "auto" }}
        >
          <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
            {virtual.getVirtualItems().map((item) => {
              const id = column.noteIds[item.index];
              return state.notes[id] ? (
                <Sticky
                  key={id}
                  note={state.notes[id]}
                  canEdit={canEdit}
                  onOpen={() => open(id)}
                  top={item.start}
                  index={item.index}
                  measure={virtual.measureElement}
                  mutate={mutate}
                  placed={placedId === id}
                />
              ) : null;
            })}
          </div>
        </div>
      </SortableContext>
      {canEdit ? (
        <button
          className="kanban-add-note"
          onClick={() => {
            const id = crypto.randomUUID();
            mutate({
              type: "note-add",
              id,
              columnId: column.id,
              title: "",
              body: "",
              color: "paper",
            });
            open(id);
          }}
        >
          <Plus size={16} />
          Add a note
        </button>
      ) : !column.noteIds.length ? (
        <p className="muted">No notes yet</p>
      ) : null}
    </section>
  );
}
function ColumnsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="3" cy="8" r="1.3" fill="currentColor" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" />
      <circle cx="13" cy="8" r="1.3" fill="currentColor" />
    </svg>
  );
}
export default function Kanban({
  resource,
  canEdit,
  mutate,
}: {
  resource: SharedResource;
  canEdit: boolean;
  mutate: Mutate;
}) {
  const state = resource.state as BoardState;
  const [draggedId, setDraggedId] = useState<string>();
  const [placedId, setPlacedId] = useState<string>();
  const moved = useRef<
    { id: string; columnId: string; beforeId: string | null } | undefined
  >(undefined);
  useEffect(() => {
    if (!moved.current) return;
    const request = moved.current;
    const column = state.columns.find(
      (column) => column.id === request.columnId,
    );
    const index = column?.noteIds.indexOf(request.id) ?? -1;
    if (
      !column ||
      index < 0 ||
      (request.beforeId
        ? column.noteIds[index + 1] !== request.beforeId
        : index !== column.noteIds.length - 1)
    )
      return;
    setPlacedId(request.id);
    moved.current = undefined;
    const timer = setTimeout(() => setPlacedId(undefined), 500);
    return () => clearTimeout(timer);
  }, [resource.revision]);
  const [selected, setSelected] = useState<string>(),
    [columnId, setColumnId] = useState<string>(),
    [newColumn, setNewColumn] = useState(false),
    [columnTitle, setColumnTitle] = useState(""),
    [destination, setDestination] = useState("");
  const selectedSnapshot = useRef<StickyNote | undefined>(undefined);
  if (selected && state.notes[selected])
    selectedSnapshot.current = state.notes[selected];
  const selectedNote = selected
    ? state.notes[selected] ||
      (selectedSnapshot.current?.id === selected
        ? selectedSnapshot.current
        : undefined)
    : undefined;
  const boardElement = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const column = state.columns.find((item) => item.id === columnId);
  const columnIndex = column ? state.columns.indexOf(column) : -1;
  const drop = ({ active, over }: DragEndEvent) => {
    if (!canEdit || !over || active.id === over.id) return;
    const id = String(active.id).slice(5);
    const targetId = String(over.id);
    const targetColumn = targetId.startsWith("column:")
      ? state.columns.find((item) => item.id === targetId.slice(7))
      : state.columns.find((item) => item.noteIds.includes(targetId.slice(5)));
    if (targetColumn) {
      moved.current = {
        id,
        columnId: targetColumn.id,
        beforeId: targetId.startsWith("note:") ? targetId.slice(5) : null,
      };
      mutate({
        type: "note-move",
        id,
        columnId: targetColumn.id,
        beforeId: targetId.startsWith("note:") ? targetId.slice(5) : null,
      });
    }
  };
  return (
    <>
      <div className="kanban-workspace">
        <div className="kanban-board-area">
          <div className="kanban-board-tools">
            <p>
              {canEdit
                ? "Write directly on a note. Drag its header to move it, or open settings."
                : "Open a note to read its full contents."}
            </p>
            {canEdit ? (
              <button
                className="button secondary small"
                onClick={() => {
                  setColumnTitle("");
                  setNewColumn(true);
                }}
              >
                <Plus size={15} />
                Add column
              </button>
            ) : null}
            <div className="kanban-jump">
              <Field label="Jump to column">
                <select
                  className="kanban-jump-select"
                  defaultValue="todo"
                  onChange={(event) => {
                    const index = state.columns.findIndex(
                      (column) => column.id === event.target.value,
                    );
                    const board = boardElement.current;
                    const element = board?.children[index] as
                      HTMLElement | undefined;
                    if (board && element)
                      board.scrollTo({
                        left: element.offsetLeft - board.offsetLeft,
                        behavior: matchMedia("(prefers-reduced-motion: reduce)")
                          .matches
                          ? "auto"
                          : "smooth",
                      });
                  }}
                >
                  {state.columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title} ({column.noteIds.length})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) =>
              setDraggedId(String(active.id).slice(5))
            }
            onDragCancel={() => setDraggedId(undefined)}
            onDragEnd={(event) => {
              setDraggedId(undefined);
              drop(event);
            }}
          >
            <div className="kanban-columns" ref={boardElement}>
              {state.columns.map((item) => (
                <Column
                  key={item.id}
                  column={item}
                  state={state}
                  canEdit={canEdit}
                  mutate={mutate}
                  open={setSelected}
                  manage={() => {
                    setColumnId(item.id);
                    setColumnTitle(item.title);
                    setDestination(
                      state.columns.find((c) => c.id !== item.id)?.id || "",
                    );
                  }}
                  placedId={placedId}
                />
              ))}
            </div>
            <DragOverlay
              dropAnimation={{
                duration:
                  matchMedia("(prefers-reduced-motion: reduce)").matches ||
                  document.querySelector(
                    ".motion-off, .motion-paused, .low-performance, .app-low-performance",
                  )
                    ? 0
                    : 180,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {draggedId && state.notes[draggedId] ? (
                <article
                  className={`sticky-note sticky-${state.notes[draggedId].color} sticky-drag-preview`}
                  aria-hidden="true"
                >
                  <strong>
                    {state.notes[draggedId].title || "Untitled note"}
                  </strong>
                  <p>{state.notes[draggedId].body}</p>
                </article>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
        {selectedNote ? (
          <NoteEditor
            key={selected}
            note={selectedNote}
            removed={!state.notes[selectedNote.id]}
            columns={state.columns}
            canEdit={canEdit}
            mutate={mutate}
            onClose={() => setSelected(undefined)}
          />
        ) : null}
      </div>
      {newColumn ? (
        <Dialog title="Add a column" onClose={() => setNewColumn(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              mutate({
                type: "column-add",
                id: crypto.randomUUID(),
                title: columnTitle,
              });
              setNewColumn(false);
            }}
          >
            <Field label="Column name">
              <input
                autoFocus
                required
                maxLength={160}
                value={columnTitle}
                onChange={(event) => setColumnTitle(event.target.value)}
              />
            </Field>
            <button className="button primary">Add column</button>
          </form>
        </Dialog>
      ) : null}
      {column ? (
        <Dialog
          title={`Manage ${column.title}`}
          onClose={() => setColumnId(undefined)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              mutate({
                type: "column-rename",
                id: column.id,
                title: columnTitle,
                before: column.title,
              });
              setColumnId(undefined);
            }}
          >
            <Field label="Column name">
              <input
                required
                maxLength={160}
                value={columnTitle}
                onChange={(event) => setColumnTitle(event.target.value)}
              />
            </Field>
            <button className="button primary">Save name</button>
          </form>
          <div className="kanban-column-actions">
            <button
              className="button secondary small"
              disabled={columnIndex <= 0}
              onClick={() => {
                mutate({
                  type: "column-move",
                  id: column.id,
                  beforeId: state.columns[columnIndex - 1].id,
                });
                setColumnId(undefined);
              }}
            >
              <ArrowLeft size={15} />
              Move left
            </button>
            <button
              className="button secondary small"
              disabled={columnIndex >= state.columns.length - 1}
              onClick={() => {
                mutate({
                  type: "column-move",
                  id: column.id,
                  beforeId: state.columns[columnIndex + 2]?.id || null,
                });
                setColumnId(undefined);
              }}
            >
              <ArrowRight size={15} />
              Move right
            </button>
          </div>
          <Field label="When deleting this column">
            <select
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            >
              {state.columns
                .filter((c) => c.id !== column.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Move notes to {c.title}
                  </option>
                ))}
              <option value="">Delete all notes in this column</option>
            </select>
          </Field>
          <button
            className="button secondary"
            disabled={state.columns.length < 2}
            onClick={() => {
              if (
                !destination &&
                column.noteIds.length &&
                !window.confirm(
                  `Delete all ${column.noteIds.length} notes in this column?`,
                )
              )
                return;
              mutate({
                type: "column-delete",
                id: column.id,
                destination: destination || null,
                revision: resource.revision,
              });
              setColumnId(undefined);
            }}
          >
            Delete column
          </button>
        </Dialog>
      ) : null}
    </>
  );
}
function NoteEditor({
  note,
  removed,
  columns,
  canEdit,
  mutate,
  onClose,
}: {
  note: StickyNote;
  removed: boolean;
  columns: BoardColumn[];
  canEdit: boolean;
  mutate: Mutate;
  onClose: () => void;
}) {
  const original = useRef({ title: note.title, color: note.color });
  const [title, setTitle] = useState(note.title),
    [color, setColor] = useState(note.color),
    [deleted, setDeleted] = useState(false);
  const notify = useContext(Notice);
  const { body, input, textPending, flush, changeBody } = useNoteBody(
    note,
    mutate,
    removed,
  );
  const dirty =
    title !== original.current.title || color !== original.current.color;
  useEffect(() => {
    if (!dirty || (note.title === title && note.color === color)) {
      original.current = { title: note.title, color: note.color };
      setTitle(note.title);
      setColor(note.color);
    }
  }, [note.title, note.color, dirty, title, color]);
  useUnsaved(!removed && (dirty || textPending));
  const close = () => {
    if (
      dirty &&
      !window.confirm("Close without saving the note title or color?")
    )
      return;
    flush();
    onClose();
  };
  return (
    <aside className="sticky-editor" aria-label="Note details">
      <div className="section-heading">
        <h2>{canEdit ? "Edit note" : "Note details"}</h2>
        <button className="icon-button" onClick={close} aria-label="Close note">
          <X size={19} />
        </button>
      </div>
      <Field label="Title">
        <input
          readOnly={!canEdit || removed}
          maxLength={160}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Untitled note"
        />
      </Field>
      <Field label="Note">
        <textarea
          ref={input}
          readOnly={!canEdit || removed}
          maxLength={10_000}
          rows={9}
          value={body}
          onChange={(event) => changeBody(event.target.value)}
          placeholder="Write something for the team…"
        />
      </Field>
      {canEdit && !removed ? (
        <>
          <fieldset className="sticky-colors">
            <legend>Note color</legend>
            {colors.map((value) => (
              <button
                type="button"
                key={value}
                className={`sticky-${value}`}
                aria-label={`${value} note color`}
                aria-pressed={color === value}
                onClick={() => setColor(value)}
              >
                <span className="color-swatch" />
                {value}
              </button>
            ))}
          </fieldset>
          <Field label="Column">
            <select
              value={note.columnId}
              onChange={(event) => {
                flush();
                mutate({
                  type: "note-move",
                  id: note.id,
                  columnId: event.target.value,
                  beforeId: null,
                });
              }}
            >
              {columns.map((column) => (
                <option value={column.id} key={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </Field>
          <div className="shared-actions">
            {[-1, 1].map((direction) => {
              const column = columns.find((item) => item.id === note.columnId)!;
              const index = column.noteIds.indexOf(note.id);
              return (
                <button
                  key={direction}
                  className="button secondary small"
                  disabled={
                    index + direction < 0 ||
                    index + direction >= column.noteIds.length
                  }
                  onClick={() => {
                    flush();
                    mutate({
                      type: "note-move",
                      id: note.id,
                      columnId: note.columnId,
                      beforeId:
                        column.noteIds[index + (direction < 0 ? -1 : 2)] ||
                        null,
                    });
                  }}
                >
                  {direction < 0 ? "Move up" : "Move down"}
                </button>
              );
            })}
          </div>
          <button
            className="button primary"
            disabled={!dirty || textPending || body !== note.body}
            onClick={() => {
              flush();
              mutate({
                type: "note-edit",
                id: note.id,
                title,
                color,
                revision: note.revision,
                beforeTitle: original.current.title,
                beforeColor: original.current.color,
              });
            }}
          >
            Save title & color
          </button>
          {dirty &&
          (note.title !== original.current.title ||
            note.color !== original.current.color) ? (
            <div className="sticky-conflict">
              <p>
                The shared title or color changed. Latest title:{" "}
                {note.title || "Untitled note"}.
              </p>
              <button
                className="button secondary small"
                onClick={() => {
                  original.current = { title: note.title, color: note.color };
                  setTitle(note.title);
                  setColor(note.color);
                }}
              >
                Use shared title & color
              </button>
              <button
                className="button secondary small"
                onClick={() =>
                  mutate({
                    type: "note-edit",
                    id: note.id,
                    title,
                    color,
                    revision: note.revision,
                    beforeTitle: note.title,
                    beforeColor: note.color,
                  })
                }
              >
                Save my title & color over latest
              </button>
            </div>
          ) : null}
          <small className="sticky-editor-status">
            Text saves automatically and merges with other users’ edits.
          </small>
          {deleted ? (
            <button
              className="button secondary"
              onClick={() => {
                mutate({
                  type: "note-add",
                  id: crypto.randomUUID(),
                  columnId: note.columnId,
                  title,
                  body,
                  color,
                });
                setDeleted(false);
                notify("Restored as a new note");
                onClose();
              }}
            >
              Undo deletion
            </button>
          ) : (
            <button
              className="button secondary"
              disabled={textPending || body !== note.body}
              onClick={() => {
                mutate({
                  type: "note-delete",
                  id: note.id,
                  revision: note.revision,
                });
                setDeleted(true);
                notify("Note deletion requested");
              }}
            >
              <Trash2 size={16} />
              Delete note
            </button>
          )}
        </>
      ) : removed ? (
        <>
          <p>This note was removed.</p>
          {canEdit && deleted ? (
            <button
              className="button secondary"
              onClick={() => {
                mutate({
                  type: "note-add",
                  id: crypto.randomUUID(),
                  columnId: note.columnId,
                  title,
                  body,
                  color,
                });
                onClose();
              }}
            >
              Undo deletion
            </button>
          ) : null}
        </>
      ) : null}
      <small className="muted">
        Last edited by {note.updatedBy} ·{" "}
        {new Date(note.updatedAt).toLocaleString()}
      </small>
    </aside>
  );
}
