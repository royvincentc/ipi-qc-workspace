import { lazy, Suspense, useContext, useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Cloud,
  Columns3,
  Copy,
  Download,
  Lock,
  PenTool,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
  Upload,
} from "lucide-react";
import { api } from "./api";
import {
  ErrorBox,
  Field,
  Notice,
  PageTitle,
  Session,
  useCanEdit,
  useLoad,
} from "./ui";
import Dialog from "./dialog";
import type { ResourceKind, SharedResource } from "../shared/collaboration";
import { useSharedResource } from "./shared-resource";
import { listLocal } from './shared-local';
import Kanban from "./kanban";
import "./collaboration.css";
const Drawing = lazy(() => import("./drawing"));
function BoardGraphic() {
  return (
    <svg
      viewBox="0 0 96 72"
      aria-hidden="true"
      focusable="false"
      className="shared-graphic"
    >
      <rect
        x="8"
        y="8"
        width="80"
        height="56"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M34 8v56M62 8v56"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".35"
      />
      <rect
        x="15"
        y="18"
        width="13"
        height="15"
        rx="3"
        fill="currentColor"
        opacity=".6"
      />
      <rect
        x="41"
        y="18"
        width="14"
        height="23"
        rx="3"
        fill="currentColor"
        opacity=".35"
      />
      <rect
        x="68"
        y="18"
        width="13"
        height="15"
        rx="3"
        fill="currentColor"
        opacity=".8"
      />
    </svg>
  );
}
export default function SharedTools() {
  const [params, setParams] = useSearchParams();
  const kind: ResourceKind =
    params.get("kind") === "drawing" ? "drawing" : "kanban";
  const trashed = params.get("trash") === "true";
  const { user, demo } = useContext(Session);
  const { data, error, reload } = useLoad(
    async () => {
      try { return await api<SharedResource[]>(`/collaboration${trashed ? "?deleted=true" : ""}`); }
      catch (error) {
        if (navigator.onLine) throw error;
        return trashed ? [] : listLocal(user.email);
      }
    },
    [trashed],
  );
  const canEdit = useCanEdit();
  const notify = useContext(Notice);
  const navigate = useNavigate();
  const [create, setCreate] = useState(false),
    [title, setTitle] = useState(""),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(""),
    [settings, setSettings] = useState(false),
    [folder, setFolder] = useState(""),
    [drive, setDrive] = useState<{ driveFolder: string }>();
  useEffect(() => {
    api<{ driveFolder: string }>("/collaboration/settings")
      .then(setDrive)
      .catch(() => {});
  }, []);
  const items = data?.filter((item) => item.kind === kind) || [];
  return (
    <div className="shared-tools">
      <PageTitle
        title="Shared tools"
        description="Keep team notes moving, and work through ideas together."
        action={
          canEdit && !trashed ? (
            <button
              className="button primary"
              onClick={() => {
                setTitle("");
                setCreate(true);
              }}
            >
              <Plus size={17} />{" "}
              {kind === "kanban" ? "New board" : "New drawing"}
            </button>
          ) : undefined
        }
      />
      <div className="shared-tools-bar">
        <div className="tabs" aria-label="Shared tool type">
          {(["kanban", "drawing"] as const).map((value) => (
            <button
              key={value}
              className={kind === value ? "active" : ""}
              aria-pressed={kind === value}
              onClick={() =>
                setParams({
                  kind: value,
                  ...(trashed ? { trash: "true" } : {}),
                })
              }
            >
              {value === "kanban" ? (
                <Columns3 size={17} />
              ) : (
                <PenTool size={17} />
              )}{" "}
              {value === "kanban" ? "Sticky notes" : "Drawings"}
            </button>
          ))}
        </div>
        <div className="shared-toolbar-actions">
          {canEdit ? (
            <label className="button secondary small drawing-import">
              <Upload size={15} />
              Import saved file
              <input
                type="file"
                accept=".json,.excalidraw"
                aria-label="Import saved board or drawing"
                disabled={busy}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setBusy(true);
                  setFailure("");
                  try {
                    if (file.size > 14_000_000)
                      throw new Error("Choose a saved file smaller than 14 MB");
                    const snapshot = JSON.parse(await file.text());
                    const title =
                      String(
                        snapshot.title ||
                          snapshot.ipi?.title ||
                          file.name.replace(
                            /\.(kanban\.json|json|excalidraw)$/,
                            "",
                          ),
                      ).slice(0, 160) || "Imported resource";
                    const result = await api<SharedResource>(
                      "/collaboration/import",
                      "POST",
                      { title, snapshot },
                    );
                    navigate(`/shared/${result.id}`);
                    notify("Imported as a new shared resource");
                  } catch (e: any) {
                    setFailure(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          ) : null}
          <button
            className="button secondary small"
            onClick={() =>
              setParams({ kind, ...(!trashed ? { trash: "true" } : {}) })
            }
          >
            <Trash2 size={15} />
            {trashed ? "Back to active" : "Recently deleted"}
          </button>
          {user.role === "administrator" ? (
            <button
              className="button secondary small"
              onClick={() => {
                setFolder(drive?.driveFolder || "");
                setSettings(true);
              }}
            >
              <Cloud size={16} />
              Drive connection
            </button>
          ) : null}
        </div>
      </div>
      <p className="shared-access">
        <Users size={15} /> Shared with signed-in IPI users.{" "}
        {canEdit
          ? "Non-viewers can create, edit, and delete."
          : "Your access is view-only."}{" "}
        <span>
          {demo
            ? "Demo · local storage"
            : drive?.driveFolder
              ? "Drive checkpoints connected"
              : "Drive folder not connected"}
        </span>
      </p>
      <ErrorBox message={error || failure} />
      {!data ? (
        <p role="status">Loading shared tools…</p>
      ) : items.length ? (
        <div className="shared-resource-list">
          {items.map((item) => (
            <div key={item.id} className="shared-resource-row">
              <span className="shared-resource-icon" aria-hidden="true">
                {kind === "kanban" ? (
                  <Columns3 size={23} />
                ) : (
                  <PenTool size={23} />
                )}
              </span>
              <div>
                {trashed ? (
                  <strong>{item.title}</strong>
                ) : (
                  <Link to={`/shared/${item.id}`}>
                    {item.title}
                    <ArrowUpRight size={16} />
                  </Link>
                )}
                <small>
                  Updated {new Date(item.updatedAt).toLocaleString()} ·{" "}
                  {item.driveRevision >= item.revision
                    ? "Saved to Drive"
                    : "Saved in IPI"}
                </small>
              </div>
              {trashed && canEdit ? (
                <button
                  className="button secondary small"
                  onClick={async () => {
                    try {
                      await api(
                        `/collaboration/${item.id}/restore`,
                        "POST",
                        {},
                      );
                      reload();
                      notify("Resource restored");
                    } catch (e: any) {
                      setFailure(e.message);
                    }
                  }}
                >
                  Restore
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="shared-empty">
          <BoardGraphic />
          <h2>
            {trashed
              ? "Nothing in recently deleted"
              : kind === "kanban"
                ? "A place for the team’s next steps"
                : "A canvas for shared ideas"}
          </h2>
          <p>
            {trashed
              ? "Deleted boards and drawings remain recoverable here."
              : kind === "kanban"
                ? "Create a board, add sticky notes, and move them together."
                : "Draw diagrams, connect ideas, and see collaborators on the canvas."}
          </p>
          {canEdit && !trashed ? (
            <button
              className="button primary"
              onClick={() => {
                setTitle("");
                setCreate(true);
              }}
            >
              <Plus size={17} />
              {kind === "kanban" ? "Create a board" : "Create a drawing"}
            </button>
          ) : null}
        </div>
      )}
      {create ? (
        <Dialog
          title={
            kind === "kanban" ? "New sticky-note board" : "New shared drawing"
          }
          onClose={() => setCreate(false)}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setFailure("");
              try {
                const resource = await api<SharedResource>(
                  "/collaboration",
                  "POST",
                  { kind, title },
                );
                navigate(`/shared/${resource.id}`);
              } catch (e: any) {
                setFailure(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Name">
              <input
                autoFocus
                required
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={kind === "kanban" ? "Team notes" : "Team drawing"}
              />
            </Field>
            <p className="muted">
              Visible to IPI users. Viewers can read; analysts and
              administrators can edit.
            </p>
            <ErrorBox message={failure} />
            <button className="button primary" disabled={busy || !title.trim()}>
              {busy ? "Creating…" : "Create"}
            </button>
          </form>
        </Dialog>
      ) : null}
      {settings ? (
        <Dialog
          title="Shared-tools Drive folder"
          onClose={() => setSettings(false)}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setFailure("");
              try {
                const result = await api<{
                  driveFolder: string;
                  title: string;
                }>("/collaboration/settings", "PUT", { driveFolder: folder });
                setDrive(result);
                setSettings(false);
                notify(`Drive connected: ${result.title}`);
              } catch (e: any) {
                setFailure(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field
              label="Google Drive folder link"
              hint="Share this folder with the existing IPI service account as Editor. Use a dedicated folder for shared tools."
            >
              <input
                required
                type="url"
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
                placeholder="https://drive.google.com/drive/folders/…"
              />
            </Field>
            <p className="muted">
              IPI roles control editing here. Existing Drive folder permissions
              control who can open saved files in Drive. This action does not
              change sharing permissions.
            </p>
            <ErrorBox message={failure} />
            {demo ? <p>Drive access is disabled in this demo.</p> : null}
            <button className="button primary" disabled={busy || demo}>
              {busy ? "Checking folder…" : "Validate and connect"}
            </button>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}
export function SharedEditor() {
  const { id } = useParams();
  return id ? <ResourceEditor key={id} id={id} /> : null;
}
function ResourceEditor({ id }: { id: string }) {
  const room = useSharedResource(id);
  const { resource, canEdit } = room;
  const { demo } = useContext(Session);
  const notify = useContext(Notice);
  const navigate = useNavigate();
  const [rename, setRename] = useState(false),
    [title, setTitle] = useState(""),
    [remove, setRemove] = useState(false),
    [syncing, setSyncing] = useState(false),
    [savingBoard, setSavingBoard] = useState(false);
  if (!resource)
    return (
      <>
        <Link className="button secondary small" to="/shared">
          <ArrowLeft size={16} />
          Shared tools
        </Link>
        <ErrorBox message={room.error} />
        <p role="status">Opening shared workspace…</p>
      </>
    );
  return (
    <section className="shared-editor">
      <div className="shared-editor-heading">
        <Link
          className="icon-button"
          to={`/shared?kind=${resource.kind}`}
          aria-label="Back to shared tools"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1>{resource.title}</h1>
          <p>
            {resource.kind === "kanban"
              ? "Shared sticky-note board"
              : "Shared Excalidraw whiteboard"}
            {!canEdit ? " · View only" : ""}
          </p>
        </div>
        <div className="shared-toolbar-actions">
          <button
            className="button secondary small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(location.href);
                notify("Link copied; IPI sign-in is required");
              } catch {
                notify("Copy this page’s address to share it", true);
              }
            }}
          >
            <Copy size={15} />
            Share link
          </button>
          <a
            className="button secondary small"
            href={`/api/collaboration/${id}/export`}
            download
          >
            <Download size={15} />
            Export
          </a>
          {resource.kind === "kanban" ? (
            <a
              className="button secondary small"
              href={`/api/collaboration/${id}/readable`}
              download
            >
              Readable copy
            </a>
          ) : null}
          {canEdit ? (
            <>
              <button
                className="button secondary small"
                onClick={() => {
                  setTitle(resource.title);
                  setRename(true);
                }}
              >
                Rename
              </button>
              <button
                className="icon-button"
                aria-label="Delete shared resource"
                onClick={() => setRemove(true)}
              >
                <Trash2 size={17} />
              </button>
            </>
          ) : (
            <Lock size={17} aria-label="View only" />
          )}
        </div>
      </div>
      <div className="shared-live-bar">
        {canEdit && resource.kind === 'kanban' ? <button className="button primary small" disabled={savingBoard} onClick={async () => {
          setSavingBoard(true);
          try {
            if (!window.dispatchEvent(new Event('ipi:shared-save', { cancelable: true }))) throw new Error('Enter a valid six-digit hex color before saving the board.');
            await room.save(); notify('Board synced to IPI and shared with the team');
          } catch (error) { notify(error instanceof Error ? error.message : 'Save failed', true); } finally { setSavingBoard(false); }
        }}><Save size={15}/>{savingBoard ? 'Saving board…' : 'Save board'}</button> : null}
        <span className={`shared-connection ${room.connected ? "online" : ""}`}>
          <i aria-hidden="true" />
          {!room.online ? "Offline · local" : room.connected ? "Live" : "Reconnecting…"}
        </span>
        <span role="status">
          {room.localSaving
            ? "Saving on this device…"
            : room.localFailed
              ? "Local save failed · use Save board to save online"
            : room.pending
            ? "Saved on this device · syncs every 4 hours"
            : demo
              ? "Saved locally · demo"
              : resource.driveError
                ? "Saved in IPI · Drive needs attention"
                : resource.driveRevision >= resource.revision
                  ? "Saved to Drive"
                  : "Saved in IPI · Drive pending"}
        </span>
        <div className="shared-participants">
          <Users size={15} />
          {room.participants.length
            ? room.participants.map((person) => (
                <span key={person.id} title={`${person.name} · ${person.role}`}>
                  {person.name.split(" ")[0]}
                  {person.role === "viewer" ? " (viewer)" : ""}
                </span>
              ))
            : "Connecting participants…"}
        </div>
        {canEdit && !demo ? (
          <button
            className="button secondary small"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                if (!window.dispatchEvent(new Event('ipi:shared-save', { cancelable: true }))) throw new Error('Enter a valid six-digit hex color before saving.');
                await room.save();
                await api(`/collaboration/${id}/sync`, "POST", {});
                await room.refresh();
              } catch (e: any) {
                room.setError(e.message);
              } finally {
                setSyncing(false);
              }
            }}
          >
            <RefreshCw size={14} />
            {syncing ? "Syncing…" : "Save to Drive"}
          </button>
        ) : null}
      </div>
      <ErrorBox message={room.error} />
      {resource.driveError ? (
        <p className="shared-drive-error">{resource.driveError}</p>
      ) : null}
      {resource.kind === "kanban" ? (
        <Kanban resource={resource} canEdit={canEdit} mutate={room.mutate} />
      ) : (
        <Suspense fallback={<p role="status">Loading drawing tools…</p>}>
          <Drawing
            resource={resource}
            canEdit={canEdit}
            mutate={room.mutate}
            participants={room.participants}
            clientId={room.clientId}
            sendPointer={room.sendPointer}
          />
        </Suspense>
      )}
      {rename ? (
        <Dialog title="Rename shared resource" onClose={() => setRename(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              room.mutate({
                type: "rename",
                title,
                revision: resource.revision,
              });
              setRename(false);
            }}
          >
            <Field label="Name">
              <input
                autoFocus
                required
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <button className="button primary">Save name</button>
          </form>
        </Dialog>
      ) : null}
      {remove ? (
        <Dialog
          title="Delete shared resource?"
          onClose={() => setRemove(false)}
        >
          <p>
            Move “{resource.title}” to recently deleted for everyone. Its Drive
            snapshot is retained.
          </p>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await room.save();
                await api(`/collaboration/${id}`, "DELETE", {
                  revision: resource.revision,
                });
                navigate(`/shared?kind=${resource.kind}`);
                notify("Moved to recently deleted");
              } catch (e: any) {
                room.setError(e.message);
                setRemove(false);
              }
            }}
          >
            Move to recently deleted
          </button>
        </Dialog>
      ) : null}
    </section>
  );
}
