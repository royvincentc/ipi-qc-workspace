import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Session } from "./ui";
import { useUnsaved } from "./configuration";
import { applyOperation } from '../shared/collaboration';
import { loadLocal, saveLocal, type PendingChange } from './shared-local';
import { mergeUpdates } from 'yjs';
import type {
  DrawingState,
  BoardState,
  Participant,
  SharedOperation,
  SharedResource,
} from "../shared/collaboration";

type Pending = PendingChange;
export function useSharedResource(id: string) {
  const { user, demo } = useContext(Session);
  const [resource, setResource] = useState<SharedResource>();
  const current = useRef<SharedResource | undefined>(undefined);
  const visible = useRef<SharedResource | undefined>(undefined);
  const announcedRevision = useRef(0);
  const [localSaving, setLocalSaving] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState(""),
    [connected, setConnected] = useState(false),
    [pending, setPending] = useState(0),
    [participants, setParticipants] = useState<Participant[]>([]),
    [role, setRole] = useState(user.role);
  const clientId = useRef(crypto.randomUUID());
  const queue = useRef<Pending[]>([]);
  const running = useRef(false);
  const inFlight = useRef(new Set<string>());
  const active = useRef(true);
  const refreshRunning = useRef(false);
  const refreshAgain = useRef(false);
  const failureType = useRef<"network" | "rejected" | null>(null);
  const persistence = useRef(Promise.resolve());
  const storageKey = `ipi:shared-pending:${user.email}:${id}`;
  const syncKey = `${storageKey}:next-sync`;
  const nextSync = useRef(0);
  const syncInterval = 4 * 60 * 60 * 1000;
  const [localFailed, setLocalFailed] = useState(false);
  const publish = useCallback((operation?: SharedOperation) => {
    let next = operation ? visible.current || current.current : current.current;
    if (!next || !active.current) return;
    for (const item of operation ? [{ operation }] : queue.current) {
      try { next = applyOperation(next, item.operation, user.email); }
      catch { /* The server remains responsible for reporting conflicts. */ }
    }
    visible.current = next;
    setResource(next);
  }, [user.email]);
  const persist = useCallback((acknowledged: string[] = []) => {
    const snapshot = current.current;
    const changes = [...queue.current];
    if (active.current) setLocalSaving(true);
    persistence.current = persistence.current.catch(() => {}).then(() => saveLocal(storageKey, snapshot, changes, acknowledged));
    const commit = persistence.current;
    void commit.then(() => {
      if (active.current && persistence.current === commit) { setLocalSaving(false); setLocalFailed(false); }
    }, () => {
      if (active.current && persistence.current === commit) setLocalSaving(false);
    });
    void persistence.current.catch(() => {
      if (active.current) { setLocalFailed(true); setError('Local database saving failed. Keep this page open and use Save board to save online.'); }
    });
  }, [storageKey]);
  const accept = useCallback((next: SharedResource) => {
    if (!current.current || next.revision >= current.current.revision) {
      if (
        next.kind === "drawing" &&
        current.current?.kind === "drawing" &&
        next.state !== current.current.state
      )
        next = {
          ...next,
          state: {
            ...next.state,
            files: {
              ...(current.current.state as DrawingState).files,
              ...(next.state as DrawingState).files,
            },
          },
        };
      if (
        next.kind === "kanban" &&
        current.current?.kind === "kanban" &&
        next.state !== current.current.state
      ) {
        const before = current.current.state as BoardState;
        const after = next.state as BoardState;
        for (const [id, note] of Object.entries(after.notes)) {
          const previous = before.notes[id];
          if (
            previous &&
            previous.revision === note.revision &&
            previous.columnId === note.columnId
          )
            after.notes[id] = previous;
        }
      }
      current.current = next;
      publish();
      persist();
    }
  }, [publish, persist]);
  const remember = useCallback((acknowledged: string[] = []) => {
    if (active.current) setPending(queue.current.length);
    persist(acknowledged);
    try {
      if (queue.current.length)
        sessionStorage.setItem(storageKey, JSON.stringify(queue.current));
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* Navigation guard remains available if browser storage is full. */
    }
  }, [storageKey, persist]);
  const refresh = useCallback(async () => {
    if (refreshRunning.current) {
      refreshAgain.current = true;
      return;
    }
    refreshRunning.current = true;
    try {
      do {
        refreshAgain.current = false;
        const known =
          current.current?.kind === "drawing"
            ? Object.keys((current.current.state as DrawingState).files)
                .slice(0, 64)
                .join(",")
            : "";
        const params = new URLSearchParams();
        if (known) params.set('knownFiles', known);
        if (current.current) params.set('knownRevision', String(current.current.revision));
        const response = await fetch(`/api/collaboration/${id}?${params}`, { credentials: 'same-origin', cache: 'no-store' });
        if (response.status !== 304) {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Could not open shared resource');
          accept(data);
        }
        if (failureType.current === "network" && !queue.current.length) {
          failureType.current = null;
          setError("");
        }
      } while (refreshAgain.current && active.current);
    } catch (e: any) {
      if (active.current) {
        if (!navigator.onLine && current.current) return;
        failureType.current = "network";
        setError(e.message);
      }
    } finally {
      refreshRunning.current = false;
    }
  }, [id, accept]);
  const drain = useCallback(async (manual = false) => {
    if (running.current || !active.current) return;
    if (!manual && (Date.now() < nextSync.current || !navigator.onLine)) return;
    running.current = true;
    let uploaded = false;
    try {
      while (queue.current.length && active.current) {
        const items = queue.current.slice(0, 50);
        inFlight.current = new Set(items.map(item => item.operationId));
        try {
          // Commit the outbox before contacting the server, including before a retry.
          try { await persistence.current; } catch { /* Online save is still available. */ }
          const response = await fetch(`/api/collaboration/${id}/operations`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operations: items,
              knownFiles:
                current.current?.kind === "drawing"
                  ? Object.keys((current.current.state as DrawingState).files)
                  : [],
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            if ([401, 403, 404].includes(response.status)) {
              if (active.current) setRole('viewer');
              throw new Error(data.error || 'Shared access is unavailable');
            }
            if (response.status < 500 && response.status !== 408 && response.status !== 429) {
              // An atomic batch failed: remove only the offending operation.
              const rejected = data.operationId || items[0].operationId;
              queue.current = queue.current.filter(item => item.operationId !== rejected);
              remember([rejected]);
              publish();
              failureType.current = "rejected";
              setError(data.error || "Update rejected");
              void refresh();
              continue;
            }
            throw new Error(data.error || "Save failed");
          }
          const acknowledged = items.map(item => item.operationId);
          uploaded = true;
          queue.current = queue.current.filter(item => !acknowledged.includes(item.operationId));
          accept(data);
          // Store the acknowledged snapshot together with outbox removal.
          remember(acknowledged);
          if (!queue.current.length) {
            nextSync.current = Date.now() + syncInterval;
            try { localStorage.setItem(syncKey, String(nextSync.current)); } catch { /* Local content remains in IndexedDB. */ }
          }
          if (failureType.current !== "rejected") {
            failureType.current = null;
            setError("");
          }
        } catch (e: any) {
          failureType.current = "network";
          if (active.current)
            setError(
              `${e.message}. Changes are queued on this device and will retry when connected.`,
            );
          break;
        }
      }
      // Scheduled sharing includes a Drive checkpoint at the same four-hour pass.
      // Manual Save board saves to IPI; Save to Drive remains the explicit backup control.
      if (uploaded && !manual && !queue.current.length && !demo) {
        try {
          const settings = await api<{ driveFolder: string }>('/collaboration/settings');
          if (settings.driveFolder) accept(await api<SharedResource>(`/collaboration/${id}/sync`, 'POST', {}));
        } catch { /* IPI is saved. The server's durable Drive queue retries separately. */ }
      }
    } finally {
      inFlight.current.clear();
      running.current = false;
      if (active.current && current.current && announcedRevision.current > current.current.revision) void refresh();
    }
  }, [id, remember, accept, refresh, publish, syncKey, demo]);
  const mutate = useCallback(
    (operation: SharedOperation) => {
      const hadPending = queue.current.length > 0;
      if (failureType.current === "rejected") {
        failureType.current = null;
        setError("");
      }
      const previous = queue.current.at(-1);
      const previousId = previous?.operationId;
      let combined = false;
      if (previous && !inFlight.current.has(previous.operationId)) {
        if (operation.type === 'note-text' && previous.operation.type === 'note-text' && operation.id === previous.operation.id) {
          previous.operation = { ...operation, update: Array.from(mergeUpdates([new Uint8Array(previous.operation.update), new Uint8Array(operation.update)])) };
          combined = true;
        } else if (operation.type === 'note-move' && previous.operation.type === 'note-move' && operation.id === previous.operation.id) {
          previous.operation = operation;
          combined = true;
        } else if (operation.type === 'note-edit' && previous.operation.type === 'note-edit' && operation.id === previous.operation.id && !operation.bodyUpdate && !previous.operation.bodyUpdate) {
          previous.operation = { ...operation, revision: previous.operation.revision, beforeTitle: previous.operation.beforeTitle, beforeColor: previous.operation.beforeColor };
          combined = true;
        }
      }
      if (combined && previous) previous.operationId = crypto.randomUUID();
      if (!combined) queue.current.push({ operationId: crypto.randomUUID(), operation });
      if (!nextSync.current || (!hadPending && nextSync.current < Date.now())) {
        nextSync.current = Date.now() + syncInterval;
        try { localStorage.setItem(syncKey, String(nextSync.current)); } catch { /* The open tab retains its schedule. */ }
      }
      remember(combined && previousId ? [previousId] : []);
      publish(combined ? undefined : operation);
    },
    [remember, publish, syncKey],
  );
  const pointer = useRef<Participant["pointer"]>(undefined);
  const lastPresence = useRef(0);
  const presence = useCallback(async () => {
    if (!active.current || Date.now() - lastPresence.current < 250) return;
    lastPresence.current = Date.now();
    try {
      await api(`/collaboration/${id}/presence`, "POST", {
        clientId: clientId.current,
        pointer: pointer.current || null,
      });
    } catch {
      /* Event stream reports access/connection state. */
    }
  }, [id]);
  const sendPointer = useCallback(
    (next: Participant["pointer"]) => {
      pointer.current = next;
      void presence();
    },
    [presence],
  );
  useEffect(() => {
    active.current = true;
    try { nextSync.current = Number(localStorage.getItem(syncKey)) || 0; } catch { nextSync.current = 0; }
    let ready = false;
    void (async () => {
      try {
        const cached = await loadLocal(storageKey);
        if (!active.current) return;
        queue.current = cached.pending;
        if (cached.resource) accept(cached.resource);
      } catch { /* A blocked local database does not prevent online editing. */ }
      try {
        const legacy: Pending[] = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
        queue.current = [...new Map([...queue.current, ...legacy].map(item => [item.operationId, item])).values()];
        publish();
      } catch { /* Ignore malformed legacy recovery data. */ }
      if (!active.current) return;
      ready = true;
      if (queue.current.length && !nextSync.current) {
        nextSync.current = Date.now() + syncInterval;
        try { localStorage.setItem(syncKey, String(nextSync.current)); } catch { /* Tab retains schedule. */ }
      }
      remember();
      await refresh();
      void drain();
      void presence();
    })();
    const stream = new EventSource(`/api/collaboration/${id}/events`);
    stream.onopen = () => {
      setConnected(true);
      if (ready) { void refresh(); void drain(); }
    };
    stream.onerror = () => setConnected(false);
    stream.onmessage = (event) => {
      const message = JSON.parse(event.data);
      announcedRevision.current = message.revision;
      setParticipants(message.participants);
      setRole(message.role);
      if (ready && !running.current && (!current.current || message.revision > current.current.revision))
        void refresh();
      else if (current.current && message.revision === current.current.revision) {
        const next = {
          ...current.current,
          driveRevision: message.driveRevision,
          driveError: message.driveError,
          driveId: message.driveId,
        };
        accept(next);
      }
    };
    stream.addEventListener("access-ended", () => {
      setConnected(false);
      setRole('viewer');
      setError(
        "This resource was removed or your access changed. Return to shared tools.",
      );
      stream.close();
    });
    const retry = window.setInterval(() => void drain(), 60_000),
      heartbeat = window.setInterval(() => void presence(), 10_000);
    const retryNow = () => void drain(true);
    const reconnect = () => { setOnline(true); void refresh(); void drain(); };
    const offline = () => { setOnline(false); setConnected(false); };
    window.addEventListener('ipi:shared-retry', retryNow);
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', offline);
    return () => {
      active.current = false;
      stream.close();
      clearInterval(retry);
      clearInterval(heartbeat);
      window.removeEventListener('ipi:shared-retry', retryNow);
      window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', offline);
    };
  }, [id, storageKey, remember, refresh, drain, presence, accept]);
  useUnsaved(localSaving || (localFailed && pending > 0));
  const save = useCallback(async () => {
    const deadline = Date.now() + 15000;
    while (running.current && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
    if (running.current) throw new Error('Saving is taking longer than expected. Pending changes are retained.');
    await drain(true);
    await persistence.current;
    if (queue.current.length || failureType.current) throw new Error('Changes could not be saved. Check the connection and try Save board again.');
  }, [drain]);
  return {
    resource,
    error,
    setError,
    connected,
    online,
    pending,
    localSaving,
    localFailed,
    participants,
    clientId: clientId.current,
    canEdit: role !== "viewer",
    mutate,
    save,
    refresh,
    sendPointer,
  };
}
