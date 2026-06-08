export type StepKey =
  | "welcome"
  | "account"
  | "greeting"
  | "bio"
  | "country"
  | "tags"
  | "musicIntro"
  | "building"
  | "musicReview"
  | "manual"
  | "reveal"
  | "follow";

export interface TopArtist {
  id?: string;
  name: string;
  imageUrl?: string;
}
export interface TopSong {
  title: string;
  artist: string;
  coverUrl?: string;
}
export interface TopAlbum {
  id?: string;
  appleMusicId?: string;
  title: string;
  artist: string;
  coverUrl?: string;
}

export interface OnboardingData {
  displayName: string;
  username: string;
  bio: string;
  country: string;
  tags: string[];
  topArtists: TopArtist[];
  topSongs: TopSong[];
  topAlbums: TopAlbum[];
  /** Catalog artist IDs of manually-picked artists, for discovery seeding. */
  manualArtistIds: string[];
  musicConnected: boolean;
}

export const EMPTY_ONBOARDING: OnboardingData = {
  displayName: "",
  username: "",
  bio: "",
  country: "",
  tags: [],
  topArtists: [],
  topSongs: [],
  topAlbums: [],
  manualArtistIds: [],
  musicConnected: false,
};

/** Major steps shown in the progress bar. Sub-steps map onto these. */
export const PROGRESS_STEPS: StepKey[] = [
  "account",
  "bio",
  "country",
  "tags",
  "musicIntro",
  "reveal",
  "follow",
];

const PROGRESS_GROUP: Partial<Record<StepKey, StepKey>> = {
  greeting: "account",
  building: "musicIntro",
  musicReview: "musicIntro",
  manual: "musicIntro",
};

/** 1-based index of a step within PROGRESS_STEPS, or 0 to hide the bar. */
export function progressIndex(step: StepKey): number {
  if (step === "welcome") return 0;
  const group = PROGRESS_GROUP[step] ?? step;
  const idx = PROGRESS_STEPS.indexOf(group);
  return idx < 0 ? 0 : idx + 1;
}

export function composeTasteSummary(d: OnboardingData): string {
  const artists = d.topArtists.map((a) => a.name).filter(Boolean).slice(0, 3);
  const genres = d.tags.slice(0, 3);
  const parts: string[] = [];
  if (genres.length) parts.push(`${genres.join(", ")} at heart`);
  if (artists.length) parts.push(`always coming back to ${artists.join(", ")}`);
  if (!parts.length) return "A music lover with taste all your own.";
  const text = parts.join(" — ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}
