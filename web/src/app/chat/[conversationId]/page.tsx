"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  ChevronLeft,
  Lock,
  Check,
  X,
  Search,
  ImageIcon,
  Mic,
  Music,
  Disc3,
  Heart,
  Quote,
  Clock,
  HelpCircle,
  ListMusic,
  Radio,
  CalendarClock,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";
import { useMessages } from "@/hooks/useMessages";
import { Message, TrackPayload, AlbumPayload, isCollabPlaylistPayload } from "@/types/chat";
import { useConversations } from "@/hooks/useConversations";
import { MessageThread } from "@/components/chat/MessageThread";
import { MessageInput, AttachmentAction } from "@/components/chat/MessageInput";
import { MessageSearch } from "@/components/chat/MessageSearch";
import { VoiceRecorderModal } from "@/components/chat/VoiceRecorderModal";
import { MusicPickerModal } from "@/components/music/MusicPickerModal";
import { MusicAttachSheet } from "@/components/music/MusicAttachSheet";
import { MusicDetailModal, ComposeKind, ComposeResult } from "@/components/music/MusicDetailModal";
import { toTrackRef } from "@/lib/trackRef";
import { MessageActionHandlers } from "@/components/chat/MessageActions";
import { MessageCardHandlers } from "@/components/chat/messageRenderers";
import { NowPlayingPill } from "@/components/chat/NowPlayingPill";
import { ListenTogetherBar } from "@/components/chat/ListenTogetherBar";
import { PartyBanner } from "@/components/chat/PartyBanner";
import { PartyScheduleModal } from "@/components/music/PartyScheduleModal";
import { CollabPlaylistPanel } from "@/components/chat/CollabPlaylistPanel";
import { ConversationOptionsMenu } from "@/components/chat/ConversationOptionsMenu";
import { usePresence } from "@/hooks/usePresence";
import { useUserNowPlaying } from "@/hooks/useNowPlaying";
import { useListenTogether } from "@/hooks/useListenTogether";
import { useListeningParty } from "@/hooks/useListeningParty";
import { useCrypto } from "@/hooks/useCrypto";
import { chatWs } from "@/lib/ws";
import { fetchPublicKey, resolveLinkPreview, uploadMedia, type StickerCatalogItem } from "@/lib/chat-api";
import { resizeImage } from "@/lib/imageResize";
import { messageToReplyStub } from "@/lib/messagePreview";
import { scrollToMessage } from "@/lib/scrollToMessage";
import { stopPreview } from "@/lib/previewPlayer";
import { audioPlayer } from "@/lib/audioPlayer";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/** A message that is exactly one http(s) URL gets upgraded to a link-preview / music card. */
const SINGLE_URL = /^https?:\/\/\S+$/i;

/** Reads the natural size of an image/video file so the bubble renders at the true ratio. */
function probeMediaSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (v: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => done({ width: video.videoWidth, height: video.videoHeight });
      video.onerror = () => done(null);
      video.src = url;
    } else {
      const img = new window.Image();
      img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => done(null);
      img.src = url;
    }
  });
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { backendUserId, backendUsername } = useUserStore();
  const conversationIdValue = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;

  const conversationId = conversationIdValue ?? null;

  const { getToken } = useAuth();
  const { conversations, markAsRead, acceptRequest, denyRequest, setMute, fetchConversationById } = useConversations();
  const [requestBusy, setRequestBusy] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [conversationUnavailable, setConversationUnavailable] = useState(false);
  const { isOnline } = usePresence();
  const { ready: cryptoReady, makeEncrypt, makeDecrypt } = useCrypto();

  const conversation = conversations.find(c => c.id === conversationId);

  // Deep links / brand-new matches may point at a conversation that isn't in the loaded pages:
  // hydrate it, otherwise we'd never learn the partner (and would send unencrypted).
  useEffect(() => {
    setConversationUnavailable(false);
    if (!conversationId || conversation) return;
    let cancelled = false;
    void fetchConversationById(conversationId).then((loaded) => {
      if (!cancelled && !loaded) setConversationUnavailable(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, !!conversation]);

  // Fetch the other participant's public key for E2E (direct chats only)
  const [otherPublicKey, setOtherPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOtherPublicKey(null);
    async function fetchKey() {
      if (!conversation || conversation.isGroup || !backendUserId) return;
      const other = conversation.participants.find(p => p.userId !== backendUserId);
      if (!other) return;
      const token = await getToken();
      const key = await fetchPublicKey(other.username, token);
      if (!cancelled) setOtherPublicKey(key);
    }
    fetchKey();
    return () => {
      cancelled = true;
    };
  }, [conversation?.id, backendUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const encryptFn = useMemo(
    () => (cryptoReady && otherPublicKey ? makeEncrypt(otherPublicKey) : undefined),
    [cryptoReady, otherPublicKey, makeEncrypt]
  );

  const decryptFn = useMemo(
    () => (cryptoReady && otherPublicKey ? makeDecrypt(otherPublicKey) : undefined),
    [cryptoReady, otherPublicKey, makeDecrypt]
  );

  const isInitialLoadRef = useRef(true);

  const {
    messages,
    isLoading,
    hasMore,
    loadMore,
    sendMessage,
    sendStructured,
    resendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    toggleTrackReaction,
    rateLimitError,
    isDecrypting,
  } = useMessages(conversationId, decryptFn, encryptFn);

  // Reply / edit composer state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) isInitialLoadRef.current = false;
  }, [isLoading]);

  // Leaving the chat stops every player (previews, voice notes, listen-together).
  useEffect(
    () => () => {
      stopPreview();
      audioPlayer.stop();
    },
    [conversationId]
  );

  // Other participant's last read timestamp — from conversation data, kept live via READ events.
  const otherLastReadAt = useMemo(() => {
    if (!conversation || !backendUserId) return null;
    return conversation.participants.find(p => p.userId !== backendUserId)?.lastReadAt ?? null;
  }, [conversation, backendUserId]);

  // Current user's last read timestamp — captured once on open, before markAsRead clears it
  const [myLastReadAt, setMyLastReadAt] = useState<string | null>(null);
  const myLastReadAtSeededRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversation || !backendUserId) return;
    if (myLastReadAtSeededRef.current === conversation.id) return;
    const me = conversation.participants.find(p => p.userId === backendUserId);
    setMyLastReadAt(me?.lastReadAt ?? null);
    myLastReadAtSeededRef.current = conversation.id;
  }, [conversation, backendUserId]);

  // Set read status whenever we view it or when new msgs arrive
  useEffect(() => {
    if (conversationId && conversation?.unreadCount && conversation.requestStatus === "ACCEPTED") {
      markAsRead(conversationId);
    }
  }, [conversationId, messages.length, conversation?.unreadCount, conversation?.requestStatus, markAsRead]);

  const handleAccept = useCallback(async () => {
    if (!conversationId || requestBusy) return;
    setRequestBusy(true);
    try {
      await acceptRequest(conversationId);
    } catch (e) {
      console.error("Failed to accept request", e);
      toast.error("Couldn't accept the request");
    } finally {
      setRequestBusy(false);
    }
  }, [conversationId, requestBusy, acceptRequest]);

  const handleDeny = useCallback(async () => {
    if (!conversationId || requestBusy) return;
    setRequestBusy(true);
    try {
      await denyRequest(conversationId);
      router.push("/chat");
    } catch (e) {
      console.error("Failed to deny request", e);
      toast.error("Couldn't decline the request");
      setRequestBusy(false);
    }
  }, [conversationId, requestBusy, denyRequest, router]);

  // Derive header info (no impure calls — Date.now handled separately below)
  const { headerTitle, avatarUrl, isOtherOnline, otherUsername, otherUserId } = useMemo(() => {
    let headerTitle = "Chat";
    let avatarUrl: string | null = null;
    let isOtherOnline = false;
    let otherUsername: string | null = null;
    let otherUserId: string | null = null;

    if (conversation && backendUserId) {
      if (conversation.isGroup) {
        headerTitle = conversation.groupName || "Group Chat";
      } else {
        const other = conversation.participants.find(p => p.userId !== backendUserId);
        if (other) {
          headerTitle = other.displayName || other.username;
          avatarUrl = other.profileImage;
          isOtherOnline = isOnline(other.userId);
          otherUsername = other.username;
          otherUserId = other.userId;
        }
      }
    }

    return { headerTitle, avatarUrl, isOtherOnline, otherUsername, otherUserId };
  }, [conversation, backendUserId, isOnline]);

  const partnerNowPlaying = useUserNowPlaying(otherUserId);
  const partnerTrack = partnerNowPlaying?.track && partnerNowPlaying.isPlaying ? partnerNowPlaying.track : null;
  const { room, reactions: roomReactions, startRoom, togglePlay, joinRoom, leaveRoom, sendReaction } = useListenTogether(
    conversationId,
    backendUserId
  );
  const { party, schedule: scheduleParty, join: joinParty, end: endParty } = useListeningParty(conversationId);
  const [partyTrack, setPartyTrack] = useState<TrackPayload | null>(null);

  // Compute "last seen X ago" outside render to avoid Date.now() purity violation
  const [lastSeenText, setLastSeenText] = useState<string | null>(null);

  useEffect(() => {
    if (!conversation || !backendUserId || conversation.isGroup) { setLastSeenText(null); return; }
    const other = conversation.participants.find(p => p.userId !== backendUserId);
    if (!other || isOnline(other.userId) || !other.lastSeenAt) { setLastSeenText(null); return; }
    const diff = Date.now() - new Date(other.lastSeenAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) setLastSeenText("last seen just now");
    else if (minutes < 60) setLastSeenText(`last seen ${minutes}m ago`);
    else if (minutes < 1440) setLastSeenText(`last seen ${Math.floor(minutes / 60)}h ago`);
    else setLastSeenText(`last seen ${Math.floor(minutes / 1440)}d ago`);
  }, [conversation, backendUserId, isOnline]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!backendUserId) return;
      const reply = replyingTo
        ? { replyToId: replyingTo.id, replyTo: messageToReplyStub(replyingTo) }
        : undefined;
      setReplyingTo(null);

      // A bare URL becomes a link-preview (or Apple Music track/album) card — same as mobile.
      const trimmed = content.trim();
      if (SINGLE_URL.test(trimmed)) {
        try {
          const token = await getToken();
          const resolved = await resolveLinkPreview(trimmed, token);
          await sendStructured(
            {
              messageType: resolved.messageType,
              contentLabel: resolved.fallbackText,
              payload: resolved.payload,
              replyToId: reply?.replyToId,
              replyTo: reply?.replyTo,
            },
            backendUserId,
            backendUsername ?? "me"
          );
          return;
        } catch {
          // No previewable metadata — send it as a normal (encrypted) text message.
        }
      }
      sendMessage(content, backendUserId, backendUsername ?? "me", reply);
    },
    [backendUserId, backendUsername, sendMessage, sendStructured, replyingTo, getToken]
  );

  const handleSubmitEdit = useCallback((content: string) => {
    if (editingMessage) editMessage(editingMessage.id, content);
    setEditingMessage(null);
  }, [editingMessage, editMessage]);

  const handleSendSticker = useCallback(
    (sticker: StickerCatalogItem) => {
      if (!backendUserId) return;
      sendStructured(
        {
          messageType: "STICKER",
          contentLabel: sticker.name ? `🌟 ${sticker.name}` : "🌟 Sticker",
          payload: { type: "STICKER", stickerId: sticker.id, url: sticker.url, name: sticker.name },
        },
        backendUserId,
        backendUsername ?? "me"
      );
    },
    [backendUserId, backendUsername, sendStructured]
  );

  // Per-message actions surfaced by the hover toolbar.
  const actions = useMemo<MessageActionHandlers | undefined>(() => {
    if (!backendUserId) return undefined;
    return {
      onReply: (m) => {
        setEditingMessage(null);
        setReplyingTo(m);
      },
      onReactEmoji: (m, emoji) => toggleReaction(m.id, emoji, backendUserId),
      onEdit: (m) => {
        setReplyingTo(null);
        setEditingMessage(m);
      },
      onDelete: (m) => {
        if (window.confirm("Delete this message? This cannot be undone.")) deleteMessage(m.id);
      },
      onCopy: (m) => {
        navigator.clipboard
          .writeText(m.content)
          .then(() => toast.success("Copied to clipboard"))
          .catch(() => toast.error("Couldn't copy"));
      },
      onTrackReact: (m) => setMusicPicker({ mode: "reaction", message: m }),
    };
  }, [backendUserId, toggleReaction, deleteMessage]);

  // ── Photo / video sharing ─────────────────────────────────────────────────
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // allow re-selecting the same file later
      if (!file || !backendUserId) return;
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) {
        toast.error("Please choose a photo or video");
        return;
      }
      if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
        toast.error(isVideo ? "Videos must be under 100 MB" : "Photos must be under 25 MB");
        return;
      }
      const send = (async () => {
        const upload = isVideo ? file : await resizeImage(file, 1600, 1600, false);
        const size = await probeMediaSize(upload instanceof File ? upload : file);
        const token = await getToken();
        const { url, type } = await uploadMedia(upload, token, isVideo ? "video.mp4" : "photo.jpg");
        await sendStructured(
          {
            messageType: isVideo ? "VIDEO" : "IMAGE",
            contentLabel: isVideo ? "🎬 Video" : "📷 Photo",
            mediaUrl: url,
            payload: {
              ...(size ? { width: size.width, height: size.height } : {}),
              mime: type ?? file.type,
            },
          },
          backendUserId,
          backendUsername ?? "me"
        );
      })();
      toast.promise(send, {
        loading: isVideo ? "Sending video…" : "Sending photo…",
        success: isVideo ? "Video sent" : "Photo sent",
        error: isVideo ? "Couldn't send video" : "Couldn't send photo",
      });
    },
    [backendUserId, backendUsername, getToken, sendStructured]
  );

  // ── Voice memos ────────────────────────────────────────────────────────────
  const [voiceOpen, setVoiceOpen] = useState(false);

  const handleSendVoice = useCallback<Parameters<typeof VoiceRecorderModal>[0]["onSend"]>(
    (blob, durationMs, peaks, bed) => {
      if (!backendUserId) return;
      const send = (async () => {
        const token = await getToken();
        const file = new File([blob], "voice.webm", { type: blob.type || "audio/webm" });
        const { url } = await uploadMedia(file, token);
        await sendStructured(
          {
            messageType: "VOICE",
            contentLabel: "🎙 Voice message",
            mediaUrl: url,
            payload: { type: "VOICE", durationMs, peaks, ...(bed ? { bed } : {}) },
          },
          backendUserId,
          backendUsername ?? "me"
        );
      })();
      toast.promise(send, {
        loading: "Sending voice note…",
        success: "Voice note sent",
        error: "Couldn't send voice note",
      });
    },
    [backendUserId, backendUsername, getToken, sendStructured]
  );

  // ── Collaborative playlist ─────────────────────────────────────────────────
  const [collabOpen, setCollabOpen] = useState(false);
  const [optimisticPlaylistIds, setOptimisticPlaylistIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    setOptimisticPlaylistIds(new Set());
  }, [conversationId]);

  // The live COLLAB_PLAYLIST card carries the preview ids and count; the count doubles as a
  // version so the panel refetches whenever anyone adds/removes a song.
  const collabCard = useMemo(() => messages.find((m) => (m.messageType ?? "").toUpperCase() === "COLLAB_PLAYLIST"), [messages]);
  const collabVersion = isCollabPlaylistPayload(collabCard?.payload) ? collabCard.payload.trackCount : 0;
  const collabIds = useMemo(() => {
    const ids = new Set(optimisticPlaylistIds);
    if (isCollabPlaylistPayload(collabCard?.payload)) {
      for (const p of collabCard.payload.previews ?? []) ids.add(p.id);
    }
    return ids;
  }, [collabCard, optimisticPlaylistIds]);

  const addToCollab = useCallback(
    (track: TrackPayload) => {
      if (!conversationId) return;
      chatWs.send({ type: "COLLAB_PLAYLIST_ADD", conversationId, track });
      if (track.id) setOptimisticPlaylistIds((prev) => new Set(prev).add(track.id));
      toast.success(`Added “${track.title}” to the playlist`);
    },
    [conversationId]
  );

  // ── Music sharing / reactions / composition ────────────────────────────────
  // `musicPicker` holds why the picker is open: share a card, attach a track
  // reaction, or pick a track to compose a richer card (dedication/lyric/…).
  type PickerState =
    | { mode: "share" }
    | { mode: "reaction"; message: Message }
    | { mode: "compose"; kind: ComposeKind | "blind" }
    | { mode: "collab" }
    | { mode: "listen" }
    | { mode: "party" };
  const [musicSheetOpen, setMusicSheetOpen] = useState(false);
  const [musicPicker, setMusicPicker] = useState<PickerState | null>(null);
  const [detail, setDetail] = useState<{ kind: ComposeKind; track: TrackPayload } | null>(null);

  const handlePickTrack = useCallback(
    (track: TrackPayload) => {
      if (!backendUserId) return;
      const picker = musicPicker;
      setMusicPicker(null);
      if (!picker) return;

      if (picker.mode === "reaction") {
        toggleTrackReaction(picker.message.id, track, backendUserId);
      } else if (picker.mode === "collab") {
        addToCollab(track);
      } else if (picker.mode === "listen") {
        if (track.previewUrl) startRoom(track);
        else toast.error("This track has no preview to listen together");
      } else if (picker.mode === "party") {
        setPartyTrack(track);
      } else if (picker.mode === "compose") {
        if (picker.kind === "blind") {
          sendStructured(
            {
              messageType: "BLIND_LISTEN",
              contentLabel: "🙈 Guess the song",
              payload: {
                type: "BLIND_LISTEN",
                track: toTrackRef(track) as unknown as Record<string, unknown>,
                hidden: true,
                guessed: false,
              },
            },
            backendUserId,
            backendUsername ?? "me"
          );
        } else {
          setDetail({ kind: picker.kind, track });
        }
      } else {
        sendStructured(
          {
            messageType: "TRACK",
            contentLabel: `🎵 ${track.title} — ${track.artist}`,
            payload: track as unknown as Record<string, unknown>,
          },
          backendUserId,
          backendUsername ?? "me"
        );
      }
    },
    [backendUserId, backendUsername, musicPicker, sendStructured, toggleTrackReaction, startRoom, addToCollab]
  );

  const handleComposeSubmit = useCallback(
    (result: ComposeResult) => {
      if (!backendUserId) return;
      sendStructured(
        { messageType: result.messageType, contentLabel: result.label, payload: result.payload },
        backendUserId,
        backendUsername ?? "me"
      );
      setDetail(null);
    },
    [backendUserId, backendUsername, sendStructured]
  );

  // Interactive card callbacks (blind-listen guess, collab playlist…). The server reveals the
  // result via MESSAGE_UPDATED, which useMessages already reconciles.
  const cardHandlers = useMemo<MessageCardHandlers>(
    () => ({
      onBlindGuess: (messageId: string, guess: string) =>
        chatWs.send({ type: "BLIND_GUESS", messageId, guess }),
      onCollabOpen: () => setCollabOpen(true),
      onCollabAddTrack: addToCollab,
      isInCollabPlaylist: (trackId: string) => collabIds.has(trackId),
    }),
    [addToCollab, collabIds]
  );

  const handlePickAlbum = useCallback(
    (album: AlbumPayload) => {
      if (!backendUserId) return;
      sendStructured(
        {
          messageType: "ALBUM",
          contentLabel: `💿 ${album.title} — ${album.artist}`,
          payload: album as unknown as Record<string, unknown>,
        },
        backendUserId,
        backendUsername ?? "me"
      );
      setMusicPicker(null);
    },
    [backendUserId, backendUsername, sendStructured]
  );

  const attachments = useMemo<AttachmentAction[]>(
    () => [
      {
        key: "media",
        label: "Photo or video",
        icon: <ImageIcon className="w-5 h-5" />,
        onClick: () => mediaInputRef.current?.click(),
      },
      {
        key: "voice",
        label: "Voice note",
        icon: <Mic className="w-5 h-5" />,
        onClick: () => setVoiceOpen(true),
      },
      {
        key: "music",
        label: "Music",
        icon: <Music className="w-5 h-5" />,
        onClick: () => setMusicSheetOpen(true),
      },
    ],
    []
  );

  const musicActions = useMemo<AttachmentAction[]>(
    () => [
      {
        key: "song",
        label: "Share song / album",
        icon: <Disc3 className="w-6 h-6" />,
        onClick: () => setMusicPicker({ mode: "share" }),
      },
      {
        key: "dedication",
        label: "Dedication",
        icon: <Heart className="w-6 h-6" />,
        onClick: () => setMusicPicker({ mode: "compose", kind: "dedication" }),
      },
      {
        key: "lyric",
        label: "Lyrics",
        icon: <Quote className="w-6 h-6" />,
        onClick: () => setMusicPicker({ mode: "compose", kind: "lyric" }),
      },
      {
        key: "timestamp",
        label: "A moment",
        icon: <Clock className="w-6 h-6" />,
        onClick: () => setMusicPicker({ mode: "compose", kind: "timestamp" }),
      },
      {
        key: "blind",
        label: "Guess the song",
        icon: <HelpCircle className="w-6 h-6" />,
        onClick: () => setMusicPicker({ mode: "compose", kind: "blind" }),
      },
      {
        key: "collab",
        label: collabVersion > 0 ? "View added songs" : "Collab playlist",
        icon: <ListMusic className="w-6 h-6" />,
        onClick: () => (collabVersion > 0 ? setCollabOpen(true) : setMusicPicker({ mode: "collab" })),
      },
      {
        key: "listen",
        label: "Listen together",
        icon: <Radio className="w-6 h-6" />,
        onClick: () => setMusicPicker({ mode: "listen" }),
      },
      {
        key: "party",
        label: "Listening party",
        icon: <CalendarClock className="w-6 h-6" />,
        onClick: () => setMusicPicker({ mode: "party" }),
      },
    ],
    [collabVersion]
  );

  const handleLoadMore = useCallback(() => {
    const nextPage = Math.floor(messages.length / 30);
    loadMore(nextPage);
  }, [messages.length, loadMore]);

  const handleRetry = useCallback((msg: Message) => {
    if (msg.tempId) resendMessage(msg.tempId, msg.content);
  }, [resendMessage]);

  if (conversationUnavailable) {
    return (
      <div className="flex flex-col h-full bg-surface items-center justify-center text-center px-8">
        <h2 className="text-lg font-bold text-on-surface">Conversation unavailable</h2>
        <p className="mt-2 text-sm text-on-surface-variant">This chat could not be opened from your account.</p>
        <Link href="/chat" className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-on-primary">
          Back to chats
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="min-h-16 border-b border-surface-container-high/50 shadow-sm flex items-center px-4 py-2 justify-between flex-shrink-0 bg-surface/95 backdrop-blur z-10 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/chat')}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-surface-container text-on-surface transition-colors shrink-0"
            title="Back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <Link
            href={otherUsername ? `/profile/${otherUsername}` : "#"}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0"
          >
            {avatarUrl && !avatarError ? (
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                <Image src={avatarUrl} alt={headerTitle} width={48} height={48} className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg uppercase shrink-0">
                {headerTitle.charAt(0)}
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-[15px] truncate">{headerTitle}</h2>
                {encryptFn && (
                  <span
                    className="relative group/lock shrink-0"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Lock className="w-3 h-3 text-primary opacity-70 cursor-default" />
                    <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-lg bg-surface-container-high border border-surface-container-highest shadow-md px-3 py-2 text-xs text-on-surface opacity-0 group-hover/lock:opacity-100 transition-opacity duration-150 z-50">
                      <span className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                        <Lock className="w-3 h-3" />
                        End-to-end encrypted
                      </span>
                      Messages are encrypted on your device and can only be read by you and {headerTitle}.
                    </span>
                  </span>
                )}
              </div>
              {isOtherOnline ? (
                <span className="text-xs text-primary font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-surface inline-block"></span>
                  Online
                </span>
              ) : lastSeenText ? (
                <span className="text-xs text-on-surface-variant">{lastSeenText}</span>
              ) : null}
              {partnerTrack && (
                <div className="mt-0.5">
                  <NowPlayingPill track={partnerTrack} />
                </div>
              )}
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setSearchOpen((o) => !o)}
            className={`p-2 rounded-full hover:bg-surface-container transition-colors ${
              searchOpen ? "text-primary bg-primary/10" : "text-on-surface-variant"
            }`}
            title="Search in conversation"
          >
            <Search className="w-5 h-5" />
          </button>
          {conversation && (
            <ConversationOptionsMenu
              mutedUntil={conversation.mutedUntil}
              onMuteUntil={(until) => setMute(conversation.id, until)}
              partner={otherUserId ? { userId: otherUserId, label: headerTitle } : null}
              onBlocked={() => router.replace("/chat")}
            />
          )}
        </div>
      </div>

      {searchOpen && conversationId && (
        <MessageSearch
          conversationId={conversationId}
          decryptFn={decryptFn}
          onClose={() => setSearchOpen(false)}
          onJump={scrollToMessage}
        />
      )}

      {/* Hidden picker for photo / video attachments */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaSelected}
      />

      {voiceOpen && (
        <VoiceRecorderModal onClose={() => setVoiceOpen(false)} onSend={handleSendVoice} />
      )}

      {musicSheetOpen && (
        <MusicAttachSheet actions={musicActions} onClose={() => setMusicSheetOpen(false)} />
      )}

      {musicPicker && (
        <MusicPickerModal
          title={
            musicPicker.mode === "reaction"
              ? "React with a song"
              : musicPicker.mode === "collab"
              ? "Add to playlist"
              : musicPicker.mode === "listen"
              ? "Start listening together"
              : musicPicker.mode === "party"
              ? "Pick a song for the party"
              : musicPicker.mode === "compose"
              ? "Pick a song"
              : "Share music"
          }
          previewOnly={musicPicker.mode === "reaction" || musicPicker.mode === "listen" || musicPicker.mode === "collab"}
          onClose={() => setMusicPicker(null)}
          onPickTrack={handlePickTrack}
          onPickAlbum={musicPicker.mode === "share" ? handlePickAlbum : undefined}
        />
      )}

      {detail && (
        <MusicDetailModal
          kind={detail.kind}
          track={detail.track}
          onClose={() => setDetail(null)}
          onSubmit={handleComposeSubmit}
        />
      )}

      {partyTrack && (
        <PartyScheduleModal
          track={partyTrack}
          onClose={() => setPartyTrack(null)}
          onSchedule={(startAt) => {
            scheduleParty(partyTrack, startAt);
            setPartyTrack(null);
          }}
        />
      )}

      {collabOpen && conversationId && (
        <CollabPlaylistPanel conversationId={conversationId} version={collabVersion} onClose={() => setCollabOpen(false)} />
      )}

      {/* Scheduled listening party */}
      <PartyBanner party={party} onJoin={joinParty} onDismiss={endParty} />

      {/* Listen Together session */}
      <ListenTogetherBar
        room={room}
        reactions={roomReactions}
        onToggle={togglePlay}
        onJoin={joinRoom}
        onLeave={leaveRoom}
        onReact={sendReaction}
      />

      {/* Messages */}
      <MessageThread
        conversationId={conversationId || ""}
        messages={messages}
        hasMore={hasMore}
        isLoading={isLoading && isInitialLoadRef.current}
        isLoadingMore={isLoading && !isInitialLoadRef.current}
        isDecrypting={isDecrypting}
        otherLastReadAt={otherLastReadAt}
        myLastReadAt={myLastReadAt}
        onLoadMore={handleLoadMore}
        onRetry={handleRetry}
        actions={actions}
        cardHandlers={cardHandlers}
        onJumpToReply={scrollToMessage}
      />

      {/* Input / Request banner */}
      {conversation?.requestStatus === "PENDING_INCOMING" ? (
        <div className="flex-shrink-0 border-t border-surface-container-high bg-surface p-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <p className="text-sm text-center text-on-surface-variant">
              <span className="font-semibold text-on-surface">{headerTitle}</span> wants to send you a message.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDeny}
              disabled={requestBusy}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-semibold transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={requestBusy}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-semibold transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
          </div>
        </div>
      ) : conversation?.requestStatus === "PENDING_OUTGOING" ? (
        <div className="flex-shrink-0 border-t border-surface-container-high bg-surface px-4 py-5 text-center">
          <p className="text-sm text-on-surface-variant">
            Your request has been sent. You can message <span className="font-semibold text-on-surface">{headerTitle}</span> once they accept.
          </p>
        </div>
      ) : (
        <MessageInput
          conversationId={conversationId || ""}
          onSend={(content) => void handleSend(content)}
          disabled={!conversation}
          rateLimitError={rateLimitError}
          attachments={attachments}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editing={editingMessage}
          onSubmitEdit={handleSubmitEdit}
          onCancelEdit={() => setEditingMessage(null)}
          onSendSticker={handleSendSticker}
        />
      )}
    </div>
  );
}
