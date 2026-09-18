/**
 * Scrolls a message into view by id and briefly highlights it. Used by reply
 * quotes and the pinned-message bar to jump to a referenced message. No-ops if
 * the message isn't currently mounted (e.g. far up the history).
 */
export function scrollToMessage(messageId: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(`msg-${messageId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-primary/50", "rounded-2xl", "transition");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-primary/50", "rounded-2xl", "transition");
  }, 1400);
}
