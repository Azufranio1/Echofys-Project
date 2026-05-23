import axios from "axios";

interface LrclibResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

interface FetchParams {
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
}

export const fetchFromLrclib = async (params: FetchParams): Promise<LrclibResponse | null> => {
  const headers = { "Lrclib-Client": process.env.LRCLIB_USER_AGENT || "Echofys/1.0.0" };

  if (params.duration) {
    try {
      const { data } = await axios.get<LrclibResponse>(`https://lrclib.net/api/get`, {
        headers,
        params: {
          track_name: params.trackName,
          artist_name: params.artistName,
          album_name: params.albumName,
          duration: params.duration,
        },
        timeout: 5000,
      });
      if (data && (data.plainLyrics || data.syncedLyrics || data.instrumental)) return data;
    } catch { }
  }

  try {
    const { data } = await axios.get<LrclibResponse[]>(`https://lrclib.net/api/search`, {
      headers,
      params: { track_name: params.trackName, artist_name: params.artistName },
      timeout: 5000,
    });
    if (data?.length > 0) {
      return data.find(r => r.plainLyrics || r.syncedLyrics || r.instrumental) ?? null;
    }
  } catch { }

  return null;
};