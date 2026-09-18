"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/api";

const DEFAULT_QUIET_START = 22 * 60; // 22:00
const DEFAULT_QUIET_END = 7 * 60; // 07:00

const DEFAULTS: NotificationPreferences = {
  matchesEnabled: true,
  messagesEnabled: true,
  communityEnabled: true,
  hotTakesEnabled: true,
  retentionEnabled: true,
  quietStartMinute: null,
  quietEndMinute: null,
  timezone: null,
};

const CATEGORIES: { key: keyof NotificationPreferences; icon: string; label: string }[] = [
  { key: "matchesEnabled", icon: "favorite", label: "New matches" },
  { key: "messagesEnabled", icon: "chat_bubble", label: "Messages" },
  { key: "communityEnabled", icon: "groups", label: "Community posts" },
  { key: "hotTakesEnabled", icon: "local_fire_department", label: "Hot takes" },
  { key: "retentionEnabled", icon: "auto_awesome", label: "Streaks & reminders" },
];

function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function Toggle({ enabled, onChange, disabled, label }: { enabled: boolean; onChange: (next: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
        enabled ? "bg-primary" : "bg-surface-container-highest"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/**
 * Push-notification preferences. These are account-wide and drive the pushes the mobile app
 * receives (the web has no push channel), so editing them here mirrors the mobile settings
 * screen: per-category toggles plus optional quiet hours.
 */
export default function NotificationPreferencesSection({ active }: { active: boolean }) {
  const { getToken } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!active || prefs) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const loaded = await fetchNotificationPreferences(token);
        if (!cancelled) setPrefs(loaded);
      } catch {
        if (!cancelled) setPrefs(DEFAULTS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, prefs, getToken]);

  const patch = (next: Partial<NotificationPreferences>) => {
    setPrefs((prev) => ({ ...(prev ?? DEFAULTS), ...next }));
    setDirty(true);
  };

  const quietEnabled = !!prefs && prefs.quietStartMinute != null && prefs.quietEndMinute != null;

  const toggleQuiet = (on: boolean) => {
    if (on) patch({ quietStartMinute: DEFAULT_QUIET_START, quietEndMinute: DEFAULT_QUIET_END, timezone: deviceTimezone() });
    else patch({ quietStartMinute: null, quietEndMinute: null });
  };

  const step = (field: "quietStartMinute" | "quietEndMinute", delta: number) => {
    const current = prefs?.[field] ?? 0;
    patch({ [field]: (current + delta + 1440) % 1440 } as Partial<NotificationPreferences>);
  };

  const save = async () => {
    if (!prefs || saving) return;
    setSaving(true);
    try {
      const token = await getToken();
      const saved = await updateNotificationPreferences({ ...prefs, timezone: prefs.timezone ?? deviceTimezone() }, token);
      setPrefs(saved);
      setDirty(false);
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Couldn't save notification preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">
        Notifications
      </p>
      <p className="text-xs text-on-surface-variant/70 mb-3">
        Choose what the Groupys app can ping you about. Applies to push notifications on your phone.
      </p>

      {!prefs ? (
        <div className="rounded-2xl bg-surface-container-lowest p-4 space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-6 rounded-full bg-surface-container-high" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-container-lowest divide-y divide-surface-container">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>{c.icon}</span>
              </div>
              <p className="flex-1 text-sm font-semibold text-on-surface">{c.label}</p>
              <Toggle
                label={c.label}
                enabled={prefs[c.key] as boolean}
                disabled={saving}
                onChange={(v) => patch({ [c.key]: v } as Partial<NotificationPreferences>)}
              />
            </div>
          ))}

          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>bedtime</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface">Quiet hours</p>
                <p className="text-xs text-on-surface-variant">Pause non-urgent notifications overnight. Matches and messages still come through.</p>
              </div>
              <Toggle label="Enable quiet hours" enabled={quietEnabled} disabled={saving} onChange={toggleQuiet} />
            </div>
            {quietEnabled && (
              <div className="grid grid-cols-2 gap-3 pl-13">
                {(["quietStartMinute", "quietEndMinute"] as const).map((field) => (
                  <div key={field} className="flex items-center justify-between gap-2 rounded-xl bg-surface-container px-3 py-2">
                    <span className="text-xs font-semibold text-on-surface-variant">{field === "quietStartMinute" ? "From" : "To"}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => step(field, -30)}
                        className="h-7 w-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-highest"
                        aria-label="Earlier"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-12 text-center text-sm font-semibold text-on-surface tabular-nums">
                        {formatMinute(prefs[field] ?? (field === "quietStartMinute" ? DEFAULT_QUIET_START : DEFAULT_QUIET_END))}
                      </span>
                      <button
                        type="button"
                        onClick={() => step(field, 30)}
                        className="h-7 w-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-highest"
                        aria-label="Later"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {dirty && (
            <div className="p-4">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="w-full py-2.5 rounded-2xl text-sm font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save preferences"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
