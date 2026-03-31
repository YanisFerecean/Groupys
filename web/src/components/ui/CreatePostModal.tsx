"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TurndownService from "turndown";
import { resizeImage } from "@/lib/imageResize";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface CommunityOption {
  id: string;
  name: string;
}

interface FileEntry {
  id: string;
  file: File;
  preview: string;
  url: string | null;
  type: string | null;
  progress: number;
  uploading: boolean;
  error: string | null;
}

export default function CreatePostModal({
  open,
  onClose,
  initialCommunityId,
}: {
  open: boolean;
  onClose: () => void;
  initialCommunityId?: string;
}) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>(initialCommunityId ?? "");
  const [communityPickerOpen, setCommunityPickerOpen] = useState(false);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  // Fetch joined communities when modal opens
  useEffect(() => {
    if (!open) return;
    getTokenRef.current().then((token) => {
      fetch(`${API_URL}/communities/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((data: CommunityOption[]) => setCommunities(data))
        .catch(() => {});
    });
  }, [open]);

  // Sync initialCommunityId when it changes (e.g. navigating to a community page)
  useEffect(() => {
    if (initialCommunityId) setSelectedCommunityId(initialCommunityId);
  }, [initialCommunityId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setEntries([]);
      setPostError(null);
      setPosting(false);
    }
  }, [open]);

  // Close community picker on outside click
  useEffect(() => {
    if (!communityPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setCommunityPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [communityPickerOpen]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "Share something with the community..." }),
    ],
    editorProps: {
      attributes: {
        class: "w-full min-h-[5rem] bg-transparent outline-none text-sm text-on-surface prose-editor",
      },
    },
    onTransaction() {
      setTick((t) => t + 1);
    },
  });

  // Clear editor when modal opens
  useEffect(() => {
    if (open && editor) {
      editor.commands.clearContent();
    }
  }, [open, editor]);

  const isAllowedMedia = (type: string) =>
    type.startsWith("image/") || type.startsWith("video/") || type.startsWith("audio/");

  const startUpload = useCallback(async (id: string, file: File) => {
    try {
      const token = await getTokenRef.current();
      const processed = file.type.startsWith("image/") ? await resizeImage(file, 800, 800) : file;
      const fd = new FormData();
      fd.append("file", processed, file.name);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setEntries((prev) => prev.map((en) => en.id === id ? { ...en, progress: pct } : en));
          }
        };
        xhr.upload.onload = () => {
          setEntries((prev) => prev.map((en) => en.id === id ? { ...en, progress: 100 } : en));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText) as { url: string; type: string };
            setEntries((prev) => prev.map((en) => en.id === id ? { ...en, url: data.url, type: data.type, progress: 100, uploading: false } : en));
            resolve();
          } else {
            setEntries((prev) => prev.map((en) => en.id === id ? { ...en, uploading: false, error: "Upload failed" } : en));
            reject();
          }
        };
        xhr.onerror = () => {
          setEntries((prev) => prev.map((en) => en.id === id ? { ...en, uploading: false, error: "Upload failed" } : en));
          reject();
        };
        xhr.open("POST", `${API_URL}/posts/media/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(fd);
      });
    } catch {
      setEntries((prev) => prev.map((en) => en.id === id ? { ...en, uploading: false, error: "Upload failed" } : en));
    }
  }, []);

  const addFiles = useCallback((incoming: File[]) => {
    setEntries((prev) => {
      const available = 4 - prev.length;
      const toAdd = incoming.slice(0, available);
      const newEntries: FileEntry[] = toAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        url: null,
        type: null,
        progress: 0,
        uploading: true,
        error: null,
      }));
      newEntries.forEach((entry) => startUpload(entry.id, entry.file));
      return [...prev, ...newEntries];
    });
  }, [startUpload]);

  const removeFile = useCallback((index: number) => {
    setEntries((prev) => {
      const entry = prev[index];
      if (entry?.url) {
        const key = entry.url.replace("/api/posts/media/", "");
        getTokenRef.current().then((token) => {
          fetch(`${API_URL}/posts/media/${key}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        });
      }
      return prev.filter((_, i) => i !== index);
    });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).filter((f) => isAllowedMedia(f.type));
    if (selected.length) addFiles(selected);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const mediaFiles: File[] = [];
    for (const item of items) {
      if (isAllowedMedia(item.type)) {
        const f = item.getAsFile();
        if (f) mediaFiles.push(f);
      }
    }
    if (mediaFiles.length) {
      e.preventDefault();
      addFiles(mediaFiles);
    }
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    const dropped = Array.from(e.dataTransfer?.files ?? []).filter((f) => isAllowedMedia(f.type));
    if (dropped.length) {
      e.preventDefault();
      addFiles(dropped);
    }
  }, [addFiles]);

  const handleSubmit = async () => {
    if (!editor || !selectedCommunityId) return;
    const html = editor.getHTML();
    const isEmpty = editor.isEmpty;
    if (isEmpty && entries.length === 0) return;
    if (entries.some((e) => e.uploading)) return;

    setPosting(true);
    setPostError(null);

    const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
    const markdown = isEmpty ? "" : td.turndown(html);
    const media = entries.filter((e) => e.url && e.type).map((e) => ({ url: e.url!, type: e.type! }));

    try {
      const token = await getTokenRef.current();
      const formData = new FormData();
      formData.append("content", markdown.trim());
      media.forEach((m) => {
        formData.append("mediaUrls", m.url);
        formData.append("mediaTypes", m.type);
      });

      const res = await fetch(`${API_URL}/posts/community/${selectedCommunityId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        let message = "Failed to create post";
        try {
          const text = await res.text();
          const body = JSON.parse(text);
          if (body?.error) message = body.error;
          else if (body?.message) message = body.message;
        } catch {
          // ignore
        }
        setPostError(message);
        return;
      }

      const newPost = await res.json();
      window.dispatchEvent(new CustomEvent("post-created", { detail: { post: newPost, communityId: selectedCommunityId } }));
      editor.commands.clearContent();
      setEntries([]);
      if (fileRef.current) fileRef.current.value = "";
      onClose();
    } catch {
      setPostError("Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const tbtn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-surface-container-high"}`;

  const selectedCommunity = communities.find((c) => c.id === selectedCommunityId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-xl max-h-[90dvh] bg-surface border border-white/20 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-surface-container-high/50 shrink-0">
          <h2 className="text-base font-bold text-on-surface">New Post</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Community picker */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div ref={pickerRef} className="relative">
            <button
              onClick={() => setCommunityPickerOpen((o) => !o)}
              className="flex items-center gap-2 text-sm font-semibold rounded-full px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest transition-colors max-w-full"
            >
              <span
                className="material-symbols-outlined text-primary shrink-0"
                style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
              >
                group
              </span>
              <span className="truncate text-on-surface">
                {selectedCommunity ? selectedCommunity.name : "Select a community"}
              </span>
              <span
                className={`material-symbols-outlined text-on-surface-variant shrink-0 transition-transform ${communityPickerOpen ? "rotate-180" : ""}`}
                style={{ fontSize: 16 }}
              >
                expand_more
              </span>
            </button>

            {communityPickerOpen && (
              <div className="absolute left-0 top-full mt-1 z-10 w-64 bg-surface-container-lowest border border-white/80 rounded-xl shadow-lg overflow-hidden py-1 max-h-52 overflow-y-auto">
                {communities.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-on-surface-variant">You haven&apos;t joined any communities yet.</p>
                ) : (
                  communities.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCommunityId(c.id);
                        setCommunityPickerOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                        c.id === selectedCommunityId
                          ? "text-primary bg-primary/10"
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined shrink-0"
                        style={{ fontSize: 16, fontVariationSettings: c.id === selectedCommunityId ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        group
                      </span>
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Editor area */}
        <div className="px-5 py-2 flex-1 overflow-y-auto">
          <EditorContent editor={editor} />

          {/* Formatting toolbar */}
          {editor && (
            <div className="flex items-center gap-0.5 pb-2 mt-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (editor.isActive("heading", { level: 1 })) {
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                  } else if (editor.state.selection.$from.parent.textContent) {
                    editor.chain().focus().splitBlock().setHeading({ level: 1 }).run();
                  } else {
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                  }
                }}
                className={tbtn(editor.isActive("heading", { level: 1 }))}
                title="Heading"
              >
                <span className="text-xs font-bold">H</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={tbtn(editor.isActive("bold"))}
                title="Bold"
              >
                <span className="text-xs font-bold">B</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={tbtn(editor.isActive("italic"))}
                title="Italic"
              >
                <span className="text-xs italic">I</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={tbtn(editor.isActive("strike"))}
                title="Strikethrough"
              >
                <span className="text-xs line-through">S</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={tbtn(editor.isActive("code"))}
                title="Inline code"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>code</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={tbtn(editor.isActive("blockquote"))}
                title="Quote"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>format_quote</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={tbtn(editor.isActive("bulletList"))}
                title="List"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>format_list_bulleted</span>
              </button>
            </div>
          )}

          {/* Media previews */}
          {entries.length > 0 && (() => {
            const count = entries.length;
            const inGrid = count > 1;
            return (
              <div className={`mt-2 mb-3${inGrid ? " grid grid-cols-2 gap-1" : ""}`}>
                {entries.map((entry, index) => {
                  const { file, preview, progress, uploading, error: uploadError } = entry;
                  const isImage = file.type.startsWith("image/");
                  const isVideo = file.type.startsWith("video/");
                  const isAudio = file.type.startsWith("audio/");
                  const spanFull = inGrid && (isAudio || (count === 3 && index === 0));
                  const mediaClass = inGrid && !isAudio
                    ? "w-full h-48 object-cover rounded-xl"
                    : isImage ? "max-w-full max-h-48 object-cover rounded-xl" : isVideo ? "max-w-full max-h-48 rounded-xl" : undefined;
                  return (
                    <div key={entry.id} className={`relative${spanFull ? " col-span-2" : ""}`}>
                      {isVideo ? (
                        <video src={preview} controls className={mediaClass} />
                      ) : isAudio ? (
                        <div className="flex items-center gap-3 bg-surface-container-high rounded-xl px-4 py-3">
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>music_note</span>
                          <audio src={preview} controls className="flex-1 h-8" />
                        </div>
                      ) : isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="Preview" className={mediaClass} />
                      ) : (
                        <div className="flex items-center gap-2 bg-surface-container-high rounded-xl px-3 py-2">
                          <span className="material-symbols-outlined text-on-surface-variant text-base">attach_file</span>
                          <span className="text-xs text-on-surface-variant truncate flex-1">{file.name}</span>
                        </div>
                      )}
                      {uploading && (
                        <div className="mt-1 px-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-on-surface-variant">
                              {progress < 100 ? "Uploading…" : "Processing…"}
                            </span>
                            {progress < 100 && (
                              <span className="text-[10px] text-on-surface-variant">{progress}%</span>
                            )}
                          </div>
                          <div className="h-1 bg-surface-container-high rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-primary rounded-full ${progress < 100 ? "transition-all duration-150" : "animate-pulse w-full"}`}
                              style={progress < 100 ? { width: `${progress}%` } : undefined}
                            />
                          </div>
                        </div>
                      )}
                      {uploadError && (
                        <p className="text-[10px] text-error mt-0.5 px-1">{uploadError}</p>
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className={`${isAudio ? "absolute -top-1 -right-1" : "absolute top-2 right-2"} w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-container-high/50 shrink-0">
          {postError && <p className="text-xs text-error mb-2">{postError}</p>}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={entries.length >= 4}
                className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 relative"
              >
                <span className="material-symbols-outlined text-lg">image</span>
                {entries.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                    {entries.length}
                  </span>
                )}
              </button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={
                posting ||
                !selectedCommunityId ||
                (!!editor?.isEmpty && entries.length === 0) ||
                entries.some((e) => e.uploading)
              }
              className="px-5 py-1.5 rounded-full text-sm font-bold text-on-primary bg-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {(posting || entries.some((e) => e.uploading)) && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {posting ? "Posting..." : entries.some((e) => e.uploading) ? "Uploading..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
