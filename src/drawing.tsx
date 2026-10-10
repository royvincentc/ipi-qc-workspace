import { useCallback, useMemo, useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Excalidraw,
  MainMenu,
  CaptureUpdateAction,
  reconcileElements,
  restoreElements,
  loadFromBlob,
  exportToBlob,
  exportToSvg,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import "@excalidraw/excalidraw/index.css";
import { Download, Upload, Scan, Maximize, Minimize } from "lucide-react";
import { useUnsaved } from "./configuration";
import { ErrorBox } from "./ui";
import { api, fileBase64 } from "./api";
import type {
  DrawingState,
  Participant,
  SharedOperation,
  SharedResource,
} from "../shared/collaboration";

// Serve the package's fonts locally; laboratory drawings never need a public CDN.
(window as Window & { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH =
  "/excalidraw/";
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Drawing({
  resource,
  canEdit,
  mutate,
  participants,
  clientId,
  sendPointer,
}: {
  resource: SharedResource;
  canEdit: boolean;
  mutate: (operation: SharedOperation) => void;
  participants: Participant[];
  clientId: string;
  sendPointer: (pointer: Participant["pointer"]) => void;
}) {
  const [editor, setEditor] = useState<ExcalidrawImperativeAPI>();
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenTrigger = useRef<HTMLButtonElement>(null);
  const fullscreenExit = useRef<HTMLButtonElement>(null);
  const canvasRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editor) return;
    let frame = 0;
    const refresh = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => editor.refresh()); };
    const root = canvasRoot.current!;
    const observer = new ResizeObserver(refresh);
    observer.observe(root);
    window.addEventListener('scroll', refresh, true);
    const pointerRefresh = () => editor.refresh();
    root.addEventListener('pointerdown', pointerRefresh, true);
    refresh();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', refresh, true); root.removeEventListener('pointerdown', pointerRefresh, true); };
  }, [editor, fullscreen]);
  useEffect(() => {
    if (!fullscreen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement | null = canvasRoot.current;
    while (branch?.parentElement) {
      for (const element of Array.from(branch.parentElement.children))
        if (element !== branch && element instanceof HTMLElement) {
          siblings.push({ element, inert: element.inert });
          element.inert = true;
        }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    fullscreenExit.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const items = Array.from(
          canvasRoot.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) || [],
        ).filter((element) => element.getClientRects().length > 0);
        const first = items[0],
          last = items.at(-1);
        if (
          first &&
          last &&
          ((event.shiftKey && document.activeElement === first) ||
            (!event.shiftKey && document.activeElement === last))
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setFullscreen(false);
      }
    };
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.body.style.overflow = overflow;
      siblings.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      document.removeEventListener("keydown", keydown, true);
      fullscreenTrigger.current?.focus({ preventScroll: true });
    };
  }, [fullscreen]);
  const [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const remote = useRef(false);
  const lastScene = useRef<
    { elements: readonly unknown[]; files: unknown } | undefined
  >(undefined);
  const lastInteraction = useRef(0);
  const peers = participants.filter((person) => person.id !== clientId);
  const peerSignature = JSON.stringify(peers);
  const state = resource.state as DrawingState;
  // Keep the normal light canvas independent of IPI's surrounding theme.
  const initialScene = useRef({ elements: state.elements, files: state.files, appState: { viewBackgroundColor: '#fcfcf9' } });
  const editorOptions = useMemo<NonNullable<ComponentProps<typeof Excalidraw>['UIOptions']>>(() => ({ canvasActions: { loadScene: false, saveToActiveFile: false, toggleTheme: false, export: false } }), []);
  const editorMenu = useMemo(() => <MainMenu>{canEdit ? <MainMenu.DefaultItems.ClearCanvas /> : null}</MainMenu>, [canEdit]);
  const pointerUpdate = useCallback<NonNullable<ComponentProps<typeof Excalidraw>['onPointerUpdate']>>((payload) => {
    lastInteraction.current = Date.now();
    if (peers.length) sendPointer({ x: payload.pointer.x, y: payload.pointer.y, button: payload.button });
  }, [peers.length, sendPointer]);
  const known = useRef(
    new Map(
      state.elements.map((element) => [
        element.id,
        `${element.version}:${element.versionNonce}`,
      ]),
    ),
  );
  const knownFiles = useRef(new Set(Object.keys(state.files)));
  const pending = useRef(new Map<string, any>());
  const pendingFiles = useRef<Record<string, any>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mutation = useRef(mutate);
  mutation.current = mutate;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const interactionActive = () => {
    const app = editorRef.current?.getAppState();
    return !!(app?.newElement || app?.resizingElement || app?.selectedElementsAreBeingDragged || app?.editingTextElement);
  };
  const flush = () => {
    if (!pending.current.size && !Object.keys(pendingFiles.current).length)
      return;
    mutation.current({
      type: "scene",
      elements: [...pending.current.values()],
      files: pendingFiles.current,
    });
    pending.current.clear();
    pendingFiles.current = {};
    setDirty(false);
  };
  useUnsaved(dirty);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      flush();
    },
    [],
  );
  useEffect(() => {
    if (
      !canEdit ||
      !editor ||
      !state.elements.some((element) => !element.isDeleted)
    )
      return;
    let cancelled = false;
    let previewTimer: ReturnType<typeof setTimeout>;
    const generate = async () => {
      if (Date.now() - lastInteraction.current < 1800) {
        previewTimer = setTimeout(generate, 2000);
        return;
      }
      try {
        const blob = await exportToBlob({
          elements: restoreElements(state.elements, null),
          files: state.files,
          appState: { exportBackground: true, viewBackgroundColor: "#fcfcf9" },
          maxWidthOrHeight: 1000,
        });
        if (cancelled) return;
        const png = await fileBase64(
          new File([blob], "preview.png", { type: "image/png" }),
        );
        if (!cancelled)
          await api(`/collaboration/${resource.id}/preview`, "POST", {
            revision: resource.revision,
            png,
          });
      } catch {
        /* A newer scene will regenerate its preview; editing must stay responsive. */
      }
    };
    previewTimer = setTimeout(generate, 2000);
    return () => {
      cancelled = true;
      clearTimeout(previewTimer);
    };
  }, [resource.id, resource.revision, editor, canEdit]);
  useEffect(() => {
    if (!editor) return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const applyRemote = () => {
      const localNow = editor.getSceneElementsIncludingDeleted();
      if (state.elements.length === localNow.length && state.elements.every((element, index) => {
        const local = localNow[index];
        return local?.id === element.id && local.version === element.version && local.versionNonce === element.versionNonce;
      }) && Object.keys(state.files).every(id => knownFiles.current.has(id))) return;
      const app = editor.getAppState();
      if (
        canEdit &&
        (app.newElement ||
          app.resizingElement ||
          app.editingTextElement ||
          app.selectedElementsAreBeingDragged ||
          app.selectionElement)
      ) {
        retry = setTimeout(applyRemote, 80);
        return;
      }
      const local = editor.getSceneElementsIncludingDeleted();
      const elements = canEdit
        ? reconcileElements(
            local,
            restoreElements(state.elements, null) as RemoteExcalidrawElement[],
            app,
          )
        : restoreElements(state.elements, null);
      const localVersions = new Map(
        local.map((element) => [
          element.id,
          `${element.version}:${element.versionNonce}`,
        ]),
      );
      const changed =
        elements.length !== local.length ||
        elements.some(
          (element) =>
            localVersions.get(element.id) !==
            `${element.version}:${element.versionNonce}`,
        );
      const files = Object.values(state.files).filter(
        (file) => !knownFiles.current.has(file.id),
      );
      if (!changed && !files.length) return;
      remote.current = true;
      for (const element of elements)
        known.current.set(
          element.id,
          `${element.version}:${element.versionNonce}`,
        );
      if (files.length) editor.addFiles(files);
      for (const id of Object.keys(state.files)) knownFiles.current.add(id);
      editor.updateScene({
        elements,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      remote.current = false;
    };
    applyRemote();
    return () => clearTimeout(retry);
  }, [editor, state, canEdit]);
  useEffect(() => {
    if (!editor) return;
    const collaborators = new Map(
      participants
        .filter((person) => person.id !== clientId)
        .map((person) => [
          person.id,
          {
            username: person.name,
            isCurrentUser: false,
            pointer: person.pointer
              ? { ...person.pointer, tool: "pointer" as const }
              : undefined,
            button: person.pointer?.button || ("up" as const),
            color: { background: "#52652a", stroke: "#52652a" },
          },
        ]),
    );
    editor.updateScene({
      collaborators: collaborators as Parameters<
        ExcalidrawImperativeAPI["updateScene"]
      >[0]["collaborators"],
    });
  }, [editor, peerSignature]);
  const onSceneChange = useCallback<NonNullable<ComponentProps<typeof Excalidraw>["onChange"]>>((elements, _appState, files) => {
            if (remote.current || !canEdit) return;
            if (
              lastScene.current?.elements === elements &&
              lastScene.current.files === files
            )
              return;
            lastScene.current = { elements, files };
            let changed = false;
            for (const element of elements) {
              const key = `${element.version}:${element.versionNonce}`;
              if (known.current.get(element.id) !== key) {
                known.current.set(element.id, key);
                pending.current.set(element.id, element);
                changed = true;
              }
            }
            for (const [id, file] of Object.entries(files)) {
              if (!knownFiles.current.has(id)) {
                knownFiles.current.add(id);
                pendingFiles.current[id] = file;
                changed = true;
              }
            }
            if (changed) {
              setDirty(true);
              if (!timer.current)
                timer.current = setTimeout(function commitWhenIdle() {
                  if (interactionActive()) { timer.current = setTimeout(commitWhenIdle, 120); return; }
                  timer.current = undefined;
                  flush();
                }, 120);
            }}, [canEdit]);
  const imported = async (file: File) => {
    if (!editor) return;
    try {
      const scene = await loadFromBlob(
        file,
        editor.getAppState(),
        editor.getSceneElementsIncludingDeleted(),
      );
      const source = restoreElements(scene.elements || [], null);
      const ids = new Map(
        source.map((element) => [element.id, crypto.randomUUID()]),
      );
      const groups = new Map<string, string>();
      const elements = source.map((element) => {
        const next: any = {
          ...element,
          id: ids.get(element.id)!,
          version: 1,
          versionNonce: Math.floor(Math.random() * 2 ** 30),
          boundElements: element.boundElements?.map((bound) => ({
            ...bound,
            id: ids.get(bound.id) || bound.id,
          })),
          frameId: element.frameId ? ids.get(element.frameId) || null : null,
          groupIds: element.groupIds.map((group) => {
            if (!groups.has(group)) groups.set(group, crypto.randomUUID());
            return groups.get(group)!;
          }),
        };
        if ("containerId" in element)
          next.containerId = element.containerId
            ? ids.get(element.containerId) || null
            : null;
        for (const key of ["startBinding", "endBinding"] as const) {
          const binding = (element as any)[key];
          if (binding)
            next[key] = {
              ...binding,
              elementId: ids.get(binding.elementId) || binding.elementId,
            };
        }
        return next;
      });
      editor.addFiles(Object.values(scene.files || {}));
      editor.updateScene({
        elements: [...editor.getSceneElementsIncludingDeleted(), ...elements],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    } catch {
      setError(
        "Could not import this drawing. Choose a valid .excalidraw file.",
      );
    }
  };
  return (
    <>
      <div className="drawing-tools">
        <p>Changes are shared live. Pan and zoom remain personal.</p>
        <div>
          <button
            ref={fullscreenTrigger}
            className="button secondary small"
            onClick={() => setFullscreen(true)}
          >
            <Maximize size={15} />
            Fullscreen
          </button>
          {canEdit ? (
            <label className="button secondary small drawing-import">
              <Upload size={15} />
              Import
              <input
                type="file"
                accept=".excalidraw,application/json"
                aria-label="Import Excalidraw file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    if (file.size > 14_000_000)
                      setError("Choose a drawing smaller than 14 MB");
                    else void imported(file);
                  }
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
          <button
            className="button secondary small"
            disabled={!editor}
            onClick={() =>
              editor?.scrollToContent(editor.getSceneElements(), {
                fitToContent: true,
                animate: false,
                viewportZoomFactor: 0.9,
                canvasOffsets: {
                  top: 112,
                  bottom: 80,
                  left: 32,
                  right: editor.getAppState().width < 600 ? 64 : 32,
                },
              })
            }
          >
            <Scan size={15} />
            Fit drawing
          </button>
          {["PNG", "SVG"].map((format) => (
            <button
              key={format}
              className="button secondary small"
              disabled={!editor}
              onClick={async () => {
                if (!editor) return;
                try {
                  const data = {
                    elements: editor.getSceneElements(),
                    appState: {
                      ...editor.getAppState(),
                      exportBackground: true,
                    },
                    files: editor.getFiles(),
                  };
                  const blob =
                    format === "PNG"
                      ? await exportToBlob(data)
                      : new Blob([(await exportToSvg(data)).outerHTML], {
                          type: "image/svg+xml",
                        });
                  download(blob, `${resource.title}.${format.toLowerCase()}`);
                } catch {
                  setError(
                    "Export could not complete. Try a smaller selection or retry.",
                  );
                }
              }}
            >
              <Download size={15} />
              {format}
            </button>
          ))}
        </div>
      </div>
      <ErrorBox message={error} />
      <div
        ref={canvasRoot}
        className={`shared-drawing${fullscreen ? " drawing-fullscreen" : ""}`}
        role={fullscreen ? "dialog" : undefined}
        aria-modal={fullscreen ? true : undefined}
        aria-label={fullscreen ? "Drawing fullscreen" : undefined}
      >
        {fullscreen ? (
          <button
            ref={fullscreenExit}
            className="button secondary drawing-fullscreen-exit"
            onClick={() => setFullscreen(false)}
          >
            <Minimize size={16} />
            Exit fullscreen <kbd>Esc</kbd>
          </button>
        ) : null}
        <Excalidraw
          excalidrawAPI={setEditor}
          initialData={initialScene.current}
          theme="light"
          name={resource.title}
          viewModeEnabled={!canEdit}
          isCollaborating={peers.length > 0}
          validateEmbeddable={false}
          UIOptions={editorOptions}
          onPointerUpdate={pointerUpdate}
          onChange={onSceneChange}
        >
          {editorMenu}
        </Excalidraw>
      </div>
    </>
  );
}
