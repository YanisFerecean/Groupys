import { useState, useEffect } from "react";
import { chatWs } from "@/lib/ws";
import { PresenceStatus } from "@/types/chat";

interface PresencePayload {
  userId: string;
  username: string;
  status: PresenceStatus;
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = chatWs.on("PRESENCE", (payload: PresencePayload) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (payload.status === "online") {
          next.add(payload.userId);
        } else {
          next.delete(payload.userId);
        }
        return next;
      });
    });

    return () => unsub();
  }, []);

  const isOnline = (userId: string) => onlineUsers.has(userId);

  return { onlineUsers, isOnline };
}
