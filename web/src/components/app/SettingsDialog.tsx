"use client";

import { useEffect, useState } from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { connectAppleMusicWeb, disconnectMusic, isAppleMusicWebMockEnabled } from "@/lib/appleMusic";
import { fetchUserByClerkId, updateUserPrivacy, type BackendUser } from "@/lib/api";
import { useUserStore } from "@/store/userStore";
import DeleteAccountModal from "@/components/app/DeleteAccountModal";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  musicConnected: boolean;
  onMusicConnected: () => void;
  onMusicDisconnected: () => void;
}

function Toggle({
  enabled,
  onChange,
  disabled,
  label,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
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

function AppleMusicIcon({ size = 20, monochrome = false }: { size?: number; monochrome?: boolean }) {
  return (
    <Image
      src="/logos/applemusic.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={monochrome ? "brightness-0 invert" : ""}
    />
  );
}

export default function SettingsDialog({
  open,
  onOpenChange,
  musicConnected,
  onMusicConnected,
  onMusicDisconnected,
}: SettingsDialogProps) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { backendUsername } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const mockEnabled = isAppleMusicWebMockEnabled();

  // Load discoverability prefs when the dialog opens.
  useEffect(() => {
    if (!open || !user || backendUser) return;
    getToken().then((token) => {
      fetchUserByClerkId(user.id, token)
        .then((bu) => { if (bu) setBackendUser(bu); })
        .catch(() => {/* non-critical */});
    });
  }, [open, user, backendUser, getToken]);

  const discoveryVisible = backendUser?.discoveryVisible ?? true;
  const recommendationOptOut = backendUser?.recommendationOptOut ?? false;

  const savePrivacy = async (changes: { discoveryVisible?: boolean; recommendationOptOut?: boolean }) => {
    if (!backendUser || privacySaving) return;
    const previous = backendUser;
    // Optimistic update.
    setBackendUser({ ...backendUser, ...changes });
    setPrivacySaving(true);
    try {
      const token = await getToken();
      const updated = await updateUserPrivacy(backendUser, changes, token);
      setBackendUser(updated);
    } catch (err) {
      console.error("Failed to update settings:", err);
      setBackendUser(previous);
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } catch {
      setSigningOut(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      await connectAppleMusicWeb(token);
      onMusicConnected();
    } catch (err) {
      console.error("Failed to connect Apple Music:", err);
      setError(err instanceof Error ? err.message : "Failed to connect Apple Music.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      await disconnectMusic(token);
      onMusicDisconnected();
    } catch (err) {
      console.error("Failed to disconnect Apple Music:", err);
      setError(err instanceof Error ? err.message : "Failed to disconnect Apple Music.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 rounded-3xl">
        <div className="px-7 pt-7 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Settings</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-7 pb-7 space-y-6">
          {/* Connections section */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">
              Connections
            </p>

            {/* Apple Music card */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{ background: "linear-gradient(135deg, #2d0b12 0%, #45131f 60%, #2a0d15 100%)" }}
            >
              {/* Subtle background circles */}
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: "#FA243C" }} />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-[0.07]" style={{ background: "#FA243C" }} />

              <div className="relative p-5">
                <div className="flex items-start gap-4">
                  {/* Apple Music icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.95)" }}
                  >
                    <AppleMusicIcon size={24} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-white">Apple Music</p>
                      {musicConnected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(250,36,60,0.2)", color: "#FA243C" }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FA243C] inline-block" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 leading-snug">
                      {musicConnected
                        ? "Your music data is synced to your profile"
                        : mockEnabled
                          ? "Developer mock mode enabled for local Apple Music sync"
                          : "Connect to import your top tracks, artists, and currently playing"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  {musicConnected ? (
                    <>
                      <div className="flex items-center gap-1.5 text-white/40 text-xs">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                        Account linked
                      </div>
                      <button
                        onClick={handleDisconnect}
                        disabled={loading}
                        className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                      >
                        {loading ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleConnect}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 hover:brightness-110 active:scale-[0.98]"
                      style={{ background: "#FA243C", color: "#fff" }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                          Connecting…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <AppleMusicIcon size={16} monochrome />
                          Connect Apple Music
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {error && (
                  <p className="mt-3 text-xs text-red-300">{error}</p>
                )}
              </div>
            </div>
          </div>

          {/* Discoverability section */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">
              Discoverability
            </p>
            <p className="text-xs text-on-surface-variant/70 mb-3">
              Control how others find you across Groupys.
            </p>

            <div className="rounded-2xl bg-surface-container-lowest divide-y divide-surface-container">
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>visibility_off</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface">Go invisible</p>
                  <p className="text-xs text-on-surface-variant">Hide from discovery and matching</p>
                </div>
                <Toggle
                  label="Go invisible"
                  enabled={!discoveryVisible}
                  disabled={!backendUser || privacySaving}
                  onChange={(invisible) => savePrivacy({ discoveryVisible: !invisible })}
                />
              </div>

              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>recommend</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface">Personalized recommendations</p>
                  <p className="text-xs text-on-surface-variant">Use my taste to suggest people and communities</p>
                </div>
                <Toggle
                  label="Personalized recommendations"
                  enabled={!recommendationOptOut}
                  disabled={!backendUser || privacySaving}
                  onChange={(on) => savePrivacy({ recommendationOptOut: !on })}
                />
              </div>
            </div>
          </div>

          {/* Legal section */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">
              Legal
            </p>
            <div className="rounded-2xl bg-surface-container-lowest divide-y divide-surface-container">
              {[
                { href: "/privacy", icon: "shield", label: "Privacy Policy" },
                { href: "/terms", icon: "description", label: "Terms of Use" },
                { href: "/impressum", icon: "gavel", label: "Legal Notice" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 p-4 hover:bg-surface-container transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>{item.icon}</span>
                  </div>
                  <span className="flex-1 text-sm font-semibold text-on-surface">{item.label}</span>
                  <span className="material-symbols-outlined text-on-surface-variant/60" style={{ fontSize: 18 }}>open_in_new</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Account section */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">
              Account
            </p>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full mb-3 py-2.5 rounded-2xl text-sm font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full py-2.5 rounded-2xl text-sm font-bold border border-error/30 text-error hover:bg-error/10 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </DialogContent>

      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        username={backendUsername ?? ""}
      />
    </Dialog>
  );
}
