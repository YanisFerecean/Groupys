"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { ProfileCustomization } from "@/types/profile";
import {
  type BackendUser,
  backendUserToProfile,
} from "@/lib/api";
import { countryFlag } from "@/lib/countries";
import ProfileWidgetGrid from "./ProfileWidgetGrid";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

const DEFAULT_BANNER =
  "linear-gradient(135deg, #1a1c1d 0%, #2f3132 40%, #5d3f3f 100%)";

function bannerBackground(value?: string): React.CSSProperties {
  if (!value) return { backgroundImage: DEFAULT_BANNER };
  if (
    value.startsWith("linear-gradient") ||
    value.startsWith("radial-gradient")
  ) {
    return { backgroundImage: value };
  }
  return { backgroundImage: `url(${value})` };
}

export default function PublicProfileView({
  username,
}: {
  username: string;
}) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [profile, setProfile] = useState<ProfileCustomization>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Redirect to own profile if viewing self
  useEffect(() => {
    if (clerkUser && clerkUser.username === username) {
      router.replace("/profile");
    }
  }, [clerkUser, username, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/users/username/${encodeURIComponent(username)}`,
        );
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch user");
        const data: BackendUser = await res.json();
        if (!cancelled) {
          setBackendUser(data);
          setProfile(backendUserToProfile(data));
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-primary text-3xl">
            person
          </span>
        </div>
      </div>
    );
  }

  if (notFound || !backendUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <span className="material-symbols-outlined text-primary text-4xl">
          person_off
        </span>
        <p className="text-on-surface font-bold text-lg">User not found</p>
        <button
          onClick={() => router.back()}
          className="text-primary font-semibold text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const displayName =
    profile.displayName || backendUser.displayName || backendUser.username;
  const avatarUrl = backendUser.profileImage || "";
  const memberYear = new Date(backendUser.dateJoined).getFullYear();
  const bannerStyle = bannerBackground(profile.bannerUrl);
  const accentVar = profile.accentColor
    ? ({ "--profile-accent": profile.accentColor } as React.CSSProperties)
    : undefined;

  return (
    <div style={accentVar}>
      {/* Header */}
      <section className="relative">
        {/* Banner */}
        <div
          className="h-48 md:h-64 w-full bg-cover bg-center"
          style={bannerStyle}
        />

        {/* Profile info */}
        <div className="px-6 md:px-12 -mt-16 md:-mt-20 relative z-10">
          <div className="flex flex-col items-center md:flex-row md:items-end gap-6">
            {/* Avatar */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-2xl overflow-hidden shadow-2xl border-4 border-surface bg-surface-container-high">
              {avatarUrl ? (
                <Image
                  alt={displayName}
                  fill
                  className="object-cover"
                  src={avatarUrl}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl">
                    person
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left pb-2">
              <p className="text-sm text-on-surface-variant font-medium mb-2">
                Member since {memberYear}
              </p>
              <h1
                className="text-3xl md:text-[3.2rem] font-extrabold tracking-tighter leading-none mb-1"
                style={
                  profile.nameColor ? { color: profile.nameColor } : undefined
                }
              >
                {displayName}
              </h1>
              <p className="text-sm text-on-surface-variant font-medium mb-2">
                @{backendUser.username}
              </p>
              {profile.bio && (
                <p className="text-on-surface-variant text-sm mb-2 max-w-lg">
                  {profile.bio}
                </p>
              )}
              {profile.country && (
                <span className="inline-block text-xs font-semibold bg-surface-container-high px-3 py-1 rounded-full text-on-surface-variant mb-3">
                  {countryFlag(profile.country)} {profile.country}
                </span>
              )}
              <div className="flex items-center gap-6 md:gap-8 text-on-surface-variant font-medium flex-wrap justify-center md:justify-start mt-2">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-lg"
                    style={{
                      color:
                        "var(--profile-accent, var(--color-primary))",
                    }}
                  >
                    24
                  </span>
                  <span className="text-sm uppercase tracking-wide">
                    Albums Rated
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-lg"
                    style={{
                      color:
                        "var(--profile-accent, var(--color-primary))",
                    }}
                  >
                    3
                  </span>
                  <span className="text-sm uppercase tracking-wide">
                    Communities
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-lg"
                    style={{
                      color:
                        "var(--profile-accent, var(--color-primary))",
                    }}
                  >
                    12
                  </span>
                  <span className="text-sm uppercase tracking-wide">
                    Check-ins
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0 mb-2">
              <button
                className="px-5 py-2.5 text-sm font-bold rounded-full transition-colors"
                style={{
                  backgroundColor:
                    "var(--profile-accent, var(--color-primary))",
                  color: "#fff",
                }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    link
                  </span>
                  Link Up
                </span>
              </button>
              <button
                className="px-5 py-2.5 text-sm font-bold rounded-full bg-surface-container-high hover:bg-surface-container-highest transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    chat
                  </span>
                  Message
                </span>
              </button>
              <button className="p-3 bg-surface-container-high rounded-full hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined text-xl">
                  share
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <ProfileWidgetGrid profile={profile} />
    </div>
  );
}
