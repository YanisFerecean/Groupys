"use client";

import { useCallback, useEffect, useState } from "react";
import { TrackPayload } from "@/types/chat";
import { chatWs } from "@/lib/ws";

export interface PartyState {
  partyId?: string;
  startAt: string;
  track: TrackPayload | null;
  status: "scheduled" | "live";
}

interface PartyPayload {
  conversationId?: string;
  partyId?: string;
  startAt?: string;
  track?: TrackPayload;
}

/**
 * Scheduled listening parties for a conversation. Schedule with a track + time,
 * stay in sync via PARTY_UPDATE/PARTY_START/PARTY_END, and join the session.
 */
export function useListeningParty(conversationId: string | null) {
  const [party, setParty] = useState<PartyState | null>(null);

  const schedule = useCallback(
    (track: TrackPayload, startAt: string) => {
      if (!conversationId) return;
      chatWs.send({ type: "PARTY_SCHEDULE", conversationId, startAt, track });
    },
    [conversationId]
  );

  const join = useCallback(() => {
    if (!conversationId) return;
    chatWs.send({ type: "PARTY_JOIN", conversationId, partyId: party?.partyId });
  }, [conversationId, party?.partyId]);

  const end = useCallback(() => {
    if (conversationId) chatWs.send({ type: "PARTY_END", conversationId, partyId: party?.partyId });
    setParty(null);
  }, [conversationId, party?.partyId]);

  useEffect(() => {
    if (!conversationId) return;
    const apply = (raw: PartyPayload, status: PartyState["status"]) => {
      if (raw.conversationId && raw.conversationId !== conversationId) return;
      setParty({
        partyId: raw.partyId,
        startAt: raw.startAt ?? new Date().toISOString(),
        track: raw.track ?? null,
        status,
      });
    };
    const off1 = chatWs.on("PARTY_UPDATE", (raw: PartyPayload) => apply(raw, "scheduled"));
    const off2 = chatWs.on("PARTY_START", (raw: PartyPayload) => apply(raw, "live"));
    const off3 = chatWs.on("PARTY_END", (raw: PartyPayload) => {
      if (raw.conversationId && raw.conversationId !== conversationId) return;
      setParty(null);
    });
    return () => {
      off1();
      off2();
      off3();
    };
  }, [conversationId]);

  return { party, schedule, join, end };
}
