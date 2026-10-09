import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Session } from "./ui";
import { useUnsaved } from "./configuration";
import type {
  DrawingState,
  BoardState,
  Participant,
  SharedOperation,
  SharedResource,
} from "../shared/collaboration";

type Pending = { operationId: string; operation: SharedOperation };
export function useSharedResource(id: string) {
  const { user } = useContext(Session);
  const [resource, setResource] = useState<SharedResource>();
  const current = useRef<SharedResource | undefined>(undefined);
  const [error, setError] = useState(""),
    [connected, setConnected] = useState(false),
    [pending, setPending] = useState(0),
    [participants, setParticipants] = useState<Participant[]>([]),
    [role, setRole] = useState(user.role);
  const clientId = useRef(crypto.randomUUID());
  const queue = useRef<Pending[]>([]);
  const running = useRef(false);
  const active = useRef(true);
  const refreshRunning = useRef(false);
  const refreshAgain = useRef(false);
  const failureType = useRef<"network" | "rejected" | null>(null);
  const storageKey = `ipi:shared-pending:${user.email}:${id}`;
  const accept = useCallback((next: SharedResource) => {
    if (!active.current) return;
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
      setResource(next);
    }
  }, []);
  const remember = useCallback(() => {
    if (active.current) setPending(queue.current.length);
    try {
      if (queue.current.length)
        sessionStorage.setItem(storageKey, JSON.stringify(queue.current));
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* Navigation guard remains available if browser storage is full. */
    }
  }, [storageKey]);
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
        accept(
          await api<SharedResource>(
            `/collaboration/${id}${known ? `?knownFiles=${encodeURIComponent(known)}` : ""}`,
          ),
        );
        if (failureType.current === "network" && !queue.current.length) {
          failureType.current = null;
          setError("");
        }
      } while (refreshAgain.current && active.current);
    } catch (e: any) {
      if (active.current) {
        failureType.current = "network";
        setError(e.message);
      }
    } finally {
      refreshRunning.current = false;
    }
  }, [id, accept]);
  const drain = useCallback(async () => {
    if (running.current || !active.current) return;
    running.current = true;
    try {
      while (queue.current.length && active.current) {
        const item = queue.current[0];
        try {
          const response = await fetch(`/api/collaboration/${id}/operations`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...item,
              knownFiles:
                current.current?.kind === "drawing"
                  ? Object.keys((current.current.state as DrawingState).files)
                  : [],
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            if (response.status < 500) {
              queue.current.shift();
              remember();
              failureType.current = "rejected";
              setError(data.error || "Update rejected");
              void refresh();
              continue;
            }
            throw new Error(data.error || "Save failed");
          }
          queue.current.shift();
          remember();
          accept(data);
          if (failureType.current !== "rejected") {
            failureType.current = null;
            setError("");
          }
        } catch (e: any) {
          failureType.current = "network";
          if (active.current)
            setError(
              `${e.message}. Pending changes will retry; keep this page open.`,
            );
          break;
        }
      }
    } finally {
      running.current = false;
    }
  }, [id, remember, accept, refresh]);
  const mutate = useCallback(
    (operation: SharedOperation) => {
      if (failureType.current === "rejected") {
        failureType.current = null;
        setError("");
      }
      queue.current.push({ operationId: crypto.randomUUID(), operation });
      remember();
      void drain();
    },
    [remember, drain],
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
    try {
      queue.current = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
    } catch {
      queue.current = [];
    }
    remember();
    void refresh();
    void drain();
    void presence();
    const stream = new EventSource(`/api/collaboration/${id}/events`);
    stream.onopen = () => {
      setConnected(true);
      void refresh();
      void drain();
    };
    stream.onerror = () => setConnected(false);
    stream.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setParticipants(message.participants);
      setRole(message.role);
      if (!current.current || message.revision > current.current.revision)
        void refresh();
      else if (message.revision === current.current.revision) {
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
      setError(
        "This resource was removed or your access changed. Return to shared tools.",
      );
      stream.close();
    });
    const retry = window.setInterval(() => void drain(), 2500),
      heartbeat = window.setInterval(() => void presence(), 10_000);
    const retryNow = () => void drain();
    window.addEventListener('ipi:shared-retry', retryNow);
    return () => {
      active.current = false;
      stream.close();
      clearInterval(retry);
      clearInterval(heartbeat);
      window.removeEventListener('ipi:shared-retry', retryNow);
    };
  }, [id, storageKey, remember, refresh, drain, presence, accept]);
  useUnsaved(pending > 0);
  const save = useCallback(async () => {
    const deadline = Date.now() + 15000;
    while (running.current && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
    if (running.current) throw new Error('Saving is taking longer than expected. Pending changes are retained.');
    await drain();
    if (queue.current.length || failureType.current) throw new Error('Changes could not be saved. Check the connection and try Save board again.');
  }, [drain]);
  return {
    resource,
    error,
    setError,
    connected,
    pending,
    participants,
    clientId: clientId.current,
    canEdit: role !== "viewer",
    mutate,
    save,
    refresh,
    sendPointer,
  };
}
