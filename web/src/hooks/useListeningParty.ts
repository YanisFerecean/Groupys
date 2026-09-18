"use client";

import { useCallback, useEffect, useState } from "react";
import { TrackPayload } from "@/types/chat";
import { chatWs } from "@/lib/ws";

export interface PartyState {
  partyId?: string;
  hostUserId?: string;
  startAt: string;
  track: TrackPayload | null;
  status: "scheduled" | "live";
}

interface PartyPayload {
  conversationId?: string;
  /** Server payload uses `id`; older frames used `partyId`. */
  id?: string;
  partyId?: string;
  hostUserId?: string;
  startAt?: string;
  track?: TrackPayload;
  status?: string;
}

/**
 * Scheduled listening parties for a conversation. Schedule with a track + time,
 * stay in sync via PARTY_UPDATE/PARTY_START/PARTY_END, and join the session.
 * On connect the current party (if any) is requested so a reload doesn't lose it.
 */
export function useListeningParty(conversationId: string | null) {
  const [party, setParty] = useState<PartyState | null>(null);

  // Forget the previous conversation's party when switching chats (render-phase reset).
  const [prevConversationId, setPrevConversationId] = useState(conversationId);
  if (conversationId !== prevConversationId) {
    setPrevConversationId(conversationId);
    setParty(null);
  }

  const partyId = party?.partyId;

  const schedule = useCallback(
    (track: TrackPayload, startAt: string) => {
      if (!conversationId) return;
      chatWs.send({ type: "PARTY_SCHEDULE", conversationId, startAt, track });
    },
    [conversationId]
  );

  const join = useCallback(() => {
    if (!conversationId || !partyId) return;
    chatWs.send({ type: "PARTY_JOIN", conversationId, partyId });
  }, [conversationId, partyId]);

  const end = useCallback(() => {
    if (conversationId) chatWs.send({ type: "PARTY_END", conversationId });
    setParty(null);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const apply = (raw: PartyPayload, status: PartyState["status"]) => {
      if (raw.conversationId && raw.conversationId !== conversationId) return;
      setParty({
        partyId: raw.id ?? raw.partyId,
        hostUserId: raw.hostUserId,
        startAt: raw.startAt ?? new Date().toISOString(),
        track: raw.track ?? null,
        status,
      });
    };
    const off1 = chatWs.on("PARTY_UPDATE", (raw: PartyPayload) =>
      apply(raw, raw.status === "STARTED" ? "live" : "scheduled")
    );
    const off2 = chatWs.on("PARTY_START", (raw: PartyPayload) => apply(raw, "live"));
    const off3 = chatWs.on("PARTY_END", (raw: PartyPayload) => {
      if (raw.conversationId && raw.conversationId !== conversationId) return;
      setParty(null);
    });
    chatWs.send({ type: "PARTY_REQUEST", conversationId });
    return () => {
      off1();
      off2();
      off3();
    };
  }, [conversationId]);

  return { party, schedule, join, end };
}
