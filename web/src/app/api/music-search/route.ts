import { NextRequest, NextResponse } from "next/server";
import { searchTracks, searchArtists, searchAlbums } from "@/api/deezer";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");
  const type = searchParams.get("type") ?? "track";

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const searchers = { track: searchTracks, artist: searchArtists, album: searchAlbums };
    const search = searchers[type as keyof typeof searchers];
    const results = search ? await search(query) : [];
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
