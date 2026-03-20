import { NextRequest, NextResponse } from "next/server";

interface DeezerTrack {
  id: number;
  title: string;
  artist: { name: string };
  album: { title: string; cover_medium: string; cover_big: string };
}

interface DeezerArtist {
  id: number;
  name: string;
  picture_medium: string;
  picture_big: string;
}

interface DeezerAlbum {
  id: number;
  title: string;
  artist: { name: string };
  cover_medium: string;
  cover_big: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");
  const type = searchParams.get("type") ?? "track";

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const encoded = encodeURIComponent(query);
  const limit = 8;

  try {
    if (type === "track") {
      const res = await fetch(
        `https://api.deezer.com/search/track?q=${encoded}&limit=${limit}`,
      );
      const data = (await res.json()) as { data?: DeezerTrack[] };
      const results = (data.data ?? []).map((t) => ({
        id: String(t.id),
        title: t.title,
        artist: t.artist.name,
        album: t.album.title,
        coverUrl: t.album.cover_big || t.album.cover_medium,
      }));
      return NextResponse.json({ results });
    }

    if (type === "artist") {
      const res = await fetch(
        `https://api.deezer.com/search/artist?q=${encoded}&limit=${limit}`,
      );
      const data = (await res.json()) as { data?: DeezerArtist[] };
      const results = (data.data ?? []).map((a) => ({
        id: String(a.id),
        name: a.name,
        imageUrl: a.picture_big || a.picture_medium,
      }));
      return NextResponse.json({ results });
    }

    if (type === "album") {
      const res = await fetch(
        `https://api.deezer.com/search/album?q=${encoded}&limit=${limit}`,
      );
      const data = (await res.json()) as { data?: DeezerAlbum[] };
      const results = (data.data ?? []).map((a) => ({
        id: String(a.id),
        title: a.title,
        artist: a.artist.name,
        coverUrl: a.cover_big || a.cover_medium,
      }));
      return NextResponse.json({ results });
    }

    return NextResponse.json({ results: [] });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
