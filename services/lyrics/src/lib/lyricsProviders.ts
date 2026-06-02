import axios from "axios";

export interface LyricsResult {
  plainLyrics?: string;
  syncedLyrics?: string;
  instrumental: boolean;
  source: string;
}

interface FetchParams {
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
}

// ─── 1. LRCLIB ────────────────────────────────────────────────────────────────
export const fetchFromLrclib = async (params: FetchParams): Promise<LyricsResult | null> => {
  const headers = { "Lrclib-Client": process.env.LRCLIB_USER_AGENT || "Echofys/1.0.0" };

  if (params.duration) {
    try {
      const { data } = await axios.get("https://lrclib.net/api/get", {
        headers,
        params: {
          track_name:  params.trackName,
          artist_name: params.artistName,
          album_name:  params.albumName,
          duration:    params.duration,
        },
        timeout: 5000,
      });
      if (data && (data.plainLyrics || data.syncedLyrics || data.instrumental)) {
        return {
          plainLyrics:  data.plainLyrics  ?? undefined,
          syncedLyrics: data.syncedLyrics ?? undefined,
          instrumental: data.instrumental ?? false,
          source: "lrclib",
        };
      }
    } catch { }
  }

  try {
    const { data } = await axios.get("https://lrclib.net/api/search", {
      headers,
      params: { track_name: params.trackName, artist_name: params.artistName },
      timeout: 5000,
    });
    if (data?.length > 0) {
      const match = data.find((r: any) => r.plainLyrics || r.syncedLyrics || r.instrumental);
      if (match) {
        return {
          plainLyrics:  match.plainLyrics  ?? undefined,
          syncedLyrics: match.syncedLyrics ?? undefined,
          instrumental: match.instrumental ?? false,
          source: "lrclib",
        };
      }
    }
  } catch { }

  return null;
};

// ─── 2. NETEASE ───────────────────────────────────────────────────────────────
export const fetchFromNetease = async (params: FetchParams): Promise<LyricsResult | null> => {
  try {
    // Buscar el ID de la canción
    const searchRes = await axios.get("https://music.163.com/api/search/get", {
      params: {
        s:      `${params.trackName} ${params.artistName}`,
        type:   1,
        limit:  5,
        offset: 0,
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer":    "https://music.163.com",
      },
      timeout: 5000,
    });

    const songs = searchRes.data?.result?.songs;
    if (!songs || songs.length === 0) return null;

    // Tomar el primer resultado
    const songId = songs[0].id;

    // Obtener las letras por ID
    const lyricsRes = await axios.get("https://music.163.com/api/song/lyric", {
      params: { id: songId, lv: 1, kv: 1, tv: -1 },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer":    "https://music.163.com",
      },
      timeout: 5000,
    });

    const lrc = lyricsRes.data?.lrc?.lyric;
    if (!lrc || lrc.trim() === "") return null;

    // Verificar si tiene timestamps reales (formato LRC)
    const hasSynced = /\[\d{2}:\d{2}\.\d{2,3}\]/.test(lrc);

    return {
      syncedLyrics: hasSynced ? lrc : undefined,
      plainLyrics:  hasSynced ? undefined : lrc,
      instrumental: false,
      source: "netease",
    };
  } catch {
    return null;
  }
};

// ─── 3. GENIUS ────────────────────────────────────────────────────────────────
export const fetchFromGenius = async (params: FetchParams): Promise<LyricsResult | null> => {
  const apiKey = process.env.GENIUS_API_KEY;
  if (!apiKey) return null;

  try {
    // Buscar la canción
    const searchRes = await axios.get("https://api.genius.com/search", {
      headers: { Authorization: `Bearer ${apiKey}` },
      params:  { q: `${params.trackName} ${params.artistName}` },
      timeout: 5000,
    });

    const hits = searchRes.data?.response?.hits;
    if (!hits || hits.length === 0) return null;

    // Buscar el hit que mejor coincida
    const hit = hits.find((h: any) => {
      const title  = h.result.title.toLowerCase();
      const artist = h.result.primary_artist.name.toLowerCase();
      return (
        title.includes(params.trackName.toLowerCase()) ||
        artist.includes(params.artistName.toLowerCase())
      );
    }) ?? hits[0];

    const songUrl = hit.result.url;

    // Scrape de la página de Genius para obtener la letra
    const pageRes = await axios.get(songUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 8000,
    });

    const html    = pageRes.data as string;
    const lyrics  = extractGeniusLyrics(html);

    if (!lyrics || lyrics.trim() === "") return null;

    return {
      plainLyrics:  lyrics,
      syncedLyrics: undefined,
      instrumental: false,
      source: "genius",
    };
  } catch {
    return null;
  }
};

// Extrae la letra del HTML de Genius
function extractGeniusLyrics(html: string): string {
  const matches = html.match(/data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g);
  if (!matches) return "";

  return matches
    .map(block =>
      block
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim()
    )
    .join("\n\n");
}

// ─── CASCADA PRINCIPAL ────────────────────────────────────────────────────────
export const fetchLyricsFromAllProviders = async (
  params: FetchParams
): Promise<LyricsResult | null> => {
  // 1. LRCLIB (sincronizada, la mejor calidad)
  const lrclib = await fetchFromLrclib(params);
  if (lrclib) return lrclib;

  // 2. Netease (buena cobertura en español y latino)
  const netease = await fetchFromNetease(params);
  if (netease) return netease;

  // 3. Genius (cobertura enorme, solo texto plano)
  const genius = await fetchFromGenius(params);
  if (genius) return genius;

  return null;
};