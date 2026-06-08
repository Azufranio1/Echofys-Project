import { Request, Response } from 'express';
import { Music } from '../models/Music';
import { cacheGet, cacheSet, CACHE_KEYS, TTL } from '../lib/cache';

// Helper: normaliza nombre de artista para slug URL-friendly
const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── 1. Listar todos los artistas con stats agregadas ──────────────────────────
export const getAllArtists = async (req: Request, res: Response) => {
  const cacheKey = CACHE_KEYS.allArtists();
  try {
    const cached = await cacheGet<any[]>(cacheKey);
    if (cached) return res.json(cached);

    const artists = await Music.aggregate([
      { $match: { status: { $regex: /^\s*complete\s*$/i } } },
      {
        $group: {
          _id: '$artist',
          songCount:  { $sum: 1 },
          playCount:  { $sum: '$playCount' },
          likeCount:  { $sum: '$likeCount' },
          genres:     { $addToSet: '$genre' },
          albums:     { $addToSet: '$album' },
          // Tomar la artwork de la canción con más plays del artista
          topArtwork: { $first: '$artwork' },
          // Para ordenar por plays (el $first da el primero, necesitamos sort antes)
        }
      },
      { $sort: { playCount: -1 } },
      {
        $project: {
          _id: 0,
          name:       '$_id',
          slug:       { $toLower: '$_id' },
          songCount:  1,
          playCount:  1,
          likeCount:  1,
          topArtwork: 1,
          albumCount: { $size: { $filter: { input: '$albums', as: 'a', cond: { $ne: ['$$a', null] } } } },
          genres: {
            $slice: [
              { $filter: { input: '$genres', as: 'g', cond: { $ne: ['$$g', null] } } },
              3
            ]
          },
        }
      }
    ]);

    // Enriquecer: buscar la artwork de la canción más escuchada de cada artista
    const enriched = await Promise.all(
      artists.map(async (a) => {
        const topSong = await Music.findOne(
          { artist: a.name, status: { $regex: /^\s*complete\s*$/i } },
          { artwork: 1 }
        ).sort({ playCount: -1 });
        return {
          ...a,
          slug: toSlug(a.name),
          artwork: topSong?.artwork || a.topArtwork || null,
        };
      })
    );

    await cacheSet(cacheKey, enriched, TTL.allArtists);
    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener artistas' });
  }
};

// ── 2. Perfil completo de un artista por slug ─────────────────────────────────
export const getArtistProfile = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const cacheKey = CACHE_KEYS.artistProfile(slug);

  try {
    const cached = await cacheGet<any>(cacheKey);
    if (cached) return res.json(cached);

    // Buscar todas las canciones donde el artista (case-insensitive) coincida con el slug
    const allSongs = await Music.find({
      status: { $regex: /^\s*complete\s*$/i },
    }).lean();

    // Filtrar por slug del artista
    const songs = allSongs.filter(s => toSlug(s.artist) === slug);

    if (songs.length === 0) {
      return res.status(404).json({ error: 'Artista no encontrado' });
    }

    const artistName = songs[0].artist;

    // ── Top songs (ordenado por playCount desc, luego likeCount) ──
    const topSongs = [...songs]
      .sort((a, b) => {
        const playDiff = (b.playCount || 0) - (a.playCount || 0);
        if (playDiff !== 0) return playDiff;
        return (b.likeCount || 0) - (a.likeCount || 0);
      })
      .slice(0, 10);

    // ── Álbumes agrupados ──
    const albumMap = new Map<string, any>();
    for (const song of songs) {
      const albumName = song.album || 'Sencillos';
      if (!albumMap.has(albumName)) {
        albumMap.set(albumName, {
          name:     albumName,
          year:     song.year || null,
          artwork:  song.artwork || null,
          songs:    [],
        });
      }
      const album = albumMap.get(albumName)!;
      album.songs.push(song);
      // Usar año más reciente y artwork de la primera canción con artwork
      if (song.year && (!album.year || song.year > album.year)) album.year = song.year;
      if (!album.artwork && song.artwork) album.artwork = song.artwork;
    }

    // Ordenar canciones dentro de cada álbum por track number si existe, si no por título
    const albums = Array.from(albumMap.values()).map(album => ({
      ...album,
      songs: album.songs.sort((a: any, b: any) =>
        (a.title || '').localeCompare(b.title || '')
      ),
    }));

    // Ordenar álbumes: "Sencillos" al final, luego por año descendente
    albums.sort((a, b) => {
      if (a.name === 'Sencillos') return 1;
      if (b.name === 'Sencillos') return -1;
      return (b.year || '0').localeCompare(a.year || '0');
    });

    // ── Stats generales ──
    const totalPlays  = songs.reduce((s, x) => s + (x.playCount || 0), 0);
    const totalLikes  = songs.reduce((s, x) => s + (x.likeCount || 0), 0);
    const genres      = [...new Set(songs.map(s => s.genre).filter(Boolean))];

    const profile = {
      name:       artistName,
      slug,
      artwork:    topSongs[0]?.artwork || null,
      songCount:  songs.length,
      albumCount: albums.filter(a => a.name !== 'Sencillos').length,
      totalPlays,
      totalLikes,
      genres,
      topSongs,
      albums,
    };

    await cacheSet(cacheKey, profile, TTL.artistProfile);
    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener perfil del artista' });
  }
};
