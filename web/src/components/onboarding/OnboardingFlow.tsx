"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  fetchUserByClerkId,
  createBackendUser,
  updateBackendUser,
  saveOnboardingArtists,
  joinCommunity,
} from "@/lib/api";
import {
  connectAppleMusicWeb,
  fetchMusicTopArtists,
  fetchMusicTopTracks,
  fetchMusicTopAlbums,
} from "@/lib/appleMusic";
import OnboardingShell from "./OnboardingShell";
import StepFooter from "./StepFooter";
import GenreStep from "./GenreStep";
import WelcomeStep from "./steps/WelcomeStep";
import AccountStep from "./steps/AccountStep";
import GreetingStep from "./steps/GreetingStep";
import BioStep from "./steps/BioStep";
import CountryStep from "./steps/CountryStep";
import MusicIntroStep from "./steps/MusicIntroStep";
import BuildingStep from "./steps/BuildingStep";
import MusicReviewStep from "./steps/MusicReviewStep";
import ManualPicksStep from "./steps/ManualPicksStep";
import TasteRevealStep from "./steps/TasteRevealStep";
import FollowNudgeStep from "./steps/FollowNudgeStep";
import {
  EMPTY_ONBOARDING,
  PROGRESS_STEPS,
  composeTasteSummary,
  progressIndex,
  type OnboardingData,
  type StepKey,
  type TopAlbum,
  type TopArtist,
  type TopSong,
} from "./types";

const TOTAL_PROGRESS = PROGRESS_STEPS.length;

function splitName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") || undefined };
}

export default function OnboardingFlow() {
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [step, setStep] = useState<StepKey>("welcome");
  const [data, setData] = useState<OnboardingData>(EMPTY_ONBOARDING);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [tasteSummary, setTasteSummary] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const backendUserId = useRef<string | null>(null);
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (isAuthLoaded && !isSignedIn) router.replace("/");
  }, [isAuthLoaded, isSignedIn, router]);

  // Prefill from Clerk + existing backend row
  useEffect(() => {
    if (prefilled || !isLoaded || !isAuthLoaded || !isSignedIn || !user) return;
    setData((d) => ({
      ...d,
      displayName: d.displayName || user.fullName || "",
      username: d.username || user.username || "",
    }));
    setPrefilled(true);
    getTokenRef.current().then((token) => {
      fetchUserByClerkId(user.id, token).then((bu) => {
        if (!bu) return;
        backendUserId.current = bu.id;
        setData((d) => ({
          ...d,
          displayName: d.displayName || bu.displayName || "",
          username: d.username || bu.username || "",
          bio: d.bio || (bu.bio ?? ""),
          country: d.country || (bu.country ?? ""),
          tags: d.tags.length ? d.tags : bu.tags ?? [],
        }));
      }).catch(() => {/* non-critical */});
    });
  }, [prefilled, isLoaded, isAuthLoaded, isSignedIn, user]);

  const progress: [number, number] = [progressIndex(step), TOTAL_PROGRESS];

  // ── Account ────────────────────────────────────────────────────────────────
  const handleAccountSubmit = useCallback(
    async (displayName: string, username: string) => {
      if (!user) return;
      setAccountSaving(true);
      setAccountError(null);
      try {
        const { firstName, lastName } = splitName(displayName);
        await user.update({ username, firstName, lastName });

        const token = await getTokenRef.current();
        const bu = await createBackendUser(
          { clerkId: user.id, username, displayName, profileImage: user.imageUrl ?? undefined },
          token,
        );
        backendUserId.current = bu.id;
        setData((d) => ({ ...d, displayName, username }));
        setStep("greeting");
      } catch (e) {
        const message = e instanceof Error ? e.message : "";
        if (message.toLowerCase().includes("username") || message.includes("409")) {
          setAccountError("That username is already taken. Please choose a different one.");
        } else {
          setAccountError("Couldn't save your profile. Please try again.");
        }
      } finally {
        setAccountSaving(false);
      }
    },
    [user],
  );

  // ── Persistence ─────────────────────────────────────────────────────────────
  const persistProfile = useCallback(
    async (synced: boolean, artistIds: string[]) => {
      if (!user) return;
      setSaving(true);
      try {
        const token = await getTokenRef.current();
        let userId = backendUserId.current;
        if (!userId) {
          const bu = await fetchUserByClerkId(user.id, token);
          userId = bu?.id ?? null;
          backendUserId.current = userId;
        }
        if (!userId) throw new Error("Profile not ready");

        await updateBackendUser(
          userId,
          {
            displayName: data.displayName || undefined,
            bio: data.bio || undefined,
            country: data.country || undefined,
            tags: data.tags,
            topArtists: data.topArtists,
            topSongs: data.topSongs,
            topAlbums: data.topAlbums,
            musicSynced: synced
              ? { topArtists: true, topSongs: true, topAlbums: true }
              : undefined,
          },
          token,
        );

        if (artistIds.length) {
          await saveOnboardingArtists(artistIds, token).catch(() => {});
        }

        setTasteSummary(composeTasteSummary(data));
        setStep("reveal");
      } catch {
        setAccountError("Couldn't save your picks. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [data, user],
  );

  // ── Apple Music connect ───────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    setStep("building");
    try {
      const token = await getTokenRef.current();
      await connectAppleMusicWeb(token!);

      const [artists, tracks, albums] = await Promise.all([
        fetchMusicTopArtists(token!),
        fetchMusicTopTracks(token!),
        fetchMusicTopAlbums(token!),
      ]);

      const topArtists: TopArtist[] = artists.slice(0, 3).map((a) => ({ name: a.name, imageUrl: a.imageUrl }));
      const topSongs: TopSong[] = tracks.slice(0, 3).map((t) => ({ title: t.title, artist: t.artist, coverUrl: t.coverUrl }));
      const topAlbums: TopAlbum[] = albums.slice(0, 3).map((a) => ({
        appleMusicId: a.appleMusicId,
        title: a.title,
        artist: a.artist,
        coverUrl: a.coverUrl,
      }));

      if (!topArtists.length && !topSongs.length && !topAlbums.length) {
        setData((d) => ({ ...d, musicConnected: true, topArtists: [], topSongs: [], topAlbums: [] }));
        setStep("manual");
        return;
      }

      setData((d) => ({ ...d, musicConnected: true, topArtists, topSongs, topAlbums }));
      setStep("musicReview");
    } catch {
      setStep("manual");
    }
  }, []);

  const handleManualSave = useCallback(() => {
    const artistIds = data.topArtists.map((a) => a.id).filter((id): id is string => Boolean(id) && /^\d+$/.test(id!));
    persistProfile(false, artistIds);
  }, [data.topArtists, persistProfile]);

  // ── Finish ──────────────────────────────────────────────────────────────────
  const finish = useCallback(
    async (communityIds: string[]) => {
      if (!user) return;
      setFinishing(true);
      try {
        const token = await getTokenRef.current();
        // Sequential — each join triggers a shared taste-profile refresh; parallel
        // joins deadlock on the UserTasteProfile rows.
        for (const id of communityIds) {
          try { await joinCommunity(id, token); } catch {/* non-critical */}
        }
        localStorage.setItem(`onboarding_done_${user.id}`, "true");
        router.replace("/feed");
      } catch {
        setAccountError("Something went wrong. Please try again.");
        setFinishing(false);
      }
    },
    [user, router],
  );

  if (!isAuthLoaded || !isSignedIn) return null;

  const seedArtists = data.topArtists
    .filter((a) => a.id && /^\d+$/.test(a.id))
    .map((a) => ({ id: a.id as string, name: a.name }));

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return <WelcomeStep onStart={() => setStep("account")} />;
      case "account":
        return (
          <AccountStep
            initialDisplayName={data.displayName}
            initialUsername={data.username}
            saving={accountSaving}
            submitError={accountError}
            onBack={() => setStep("welcome")}
            onSubmit={handleAccountSubmit}
          />
        );
      case "greeting":
        return <GreetingStep name={data.displayName} onDone={() => setStep("bio")} />;
      case "bio":
        return (
          <BioStep
            value={data.bio}
            onChange={(bio) => setData((d) => ({ ...d, bio }))}
            onBack={() => setStep("account")}
            onContinue={() => setStep("country")}
            onSkip={() => { setData((d) => ({ ...d, bio: "" })); setStep("country"); }}
          />
        );
      case "country":
        return (
          <CountryStep
            value={data.country}
            onChange={(country) => setData((d) => ({ ...d, country }))}
            onBack={() => setStep("bio")}
            onContinue={() => setStep("tags")}
            onSkip={() => { setData((d) => ({ ...d, country: "" })); setStep("tags"); }}
          />
        );
      case "tags":
        return (
          <div className="space-y-0">
            <GenreStep
              selected={data.tags}
              onToggle={(g) =>
                setData((d) => ({
                  ...d,
                  tags: d.tags.includes(g) ? d.tags.filter((t) => t !== g) : [...d.tags, g],
                }))
              }
            />
            <StepFooter
              onBack={() => setStep("country")}
              onContinue={() => setStep("musicIntro")}
              continueDisabled={data.tags.length === 0}
            />
          </div>
        );
      case "musicIntro":
        return (
          <MusicIntroStep
            onBack={() => setStep("tags")}
            onConnect={handleConnect}
            onManual={() => {
              setData((d) => ({ ...d, topArtists: [], topSongs: [], topAlbums: [] }));
              setStep("manual");
            }}
          />
        );
      case "building":
        return <BuildingStep />;
      case "musicReview":
        return (
          <MusicReviewStep
            topArtists={data.topArtists}
            topSongs={data.topSongs}
            topAlbums={data.topAlbums}
            saving={saving}
            onBack={() => setStep("musicIntro")}
            onLove={() => persistProfile(true, [])}
            onPickManually={() => setStep("manual")}
          />
        );
      case "manual":
        return (
          <ManualPicksStep
            artists={data.topArtists}
            songs={data.topSongs}
            albums={data.topAlbums}
            onChangeArtists={(topArtists) => setData((d) => ({ ...d, topArtists }))}
            onChangeSongs={(topSongs) => setData((d) => ({ ...d, topSongs }))}
            onChangeAlbums={(topAlbums) => setData((d) => ({ ...d, topAlbums }))}
            saving={saving}
            onBack={() => setStep("musicIntro")}
            onSave={handleManualSave}
          />
        );
      case "reveal":
        return (
          <TasteRevealStep
            displayName={data.displayName}
            tasteSummary={tasteSummary}
            tags={data.tags}
            topArtists={data.topArtists}
            topSongs={data.topSongs}
            topAlbums={data.topAlbums}
            onEnter={() => setStep("follow")}
          />
        );
      case "follow":
        return (
          <FollowNudgeStepWrapper
            tags={data.tags}
            seedArtists={seedArtists}
            finishing={finishing}
            onFinish={finish}
          />
        );
      default:
        return null;
    }
  };

  const wide = step === "follow" || step === "manual" || step === "musicReview";

  return (
    <OnboardingShell progress={progress} wide={wide}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.26 } }}
          exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </OnboardingShell>
  );
}

// Pull the auth token for CommunityStep, which expects it as a prop.
function FollowNudgeStepWrapper({
  tags,
  seedArtists,
  finishing,
  onFinish,
}: {
  tags: string[];
  seedArtists: { id: string; name: string }[];
  finishing: boolean;
  onFinish: (communityIds: string[]) => void;
}) {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { getToken().then(setToken); }, [getToken]);
  return (
    <FollowNudgeStep tags={tags} seedArtists={seedArtists} token={token} finishing={finishing} onFinish={onFinish} />
  );
}
