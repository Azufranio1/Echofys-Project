import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/usePlayerStore';
import { API } from '../lib/api';
import {
  ChevronLeft, Music2, Play, Pause, TrendingUp, Heart,
  Disc, BarChart2, ChevronDown, ChevronUp, Mic2
} from 'lucide-react';
import HeartButton from '../components/HeartButton';
import AddToPlaylistButton from '../components/AddToPlaylistButton';

const ArtistProfile = () => {
  const { slug }    = useParams<{ slug: string }>();
  const navigate    = useNavigate();
  const [profile, setProfile]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [expandedAlbums, setExpanded] = useState<Set<string>>(new Set());

  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();
  const isActive   = (s: any) => currentSong?._id === s._id;
  const isPlaying_ = (s: any) => isActive(s) && isPlaying;
  const play       = (song: any) => currentSong?._id === song._id ? togglePlay() : setCurrentSong(song);

  const toggleAlbum = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const res  = await fetch(`${API.artists}/${slug}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) { navigate('/artists'); return; }
        const data = await res.json();
        setProfile(data);
        // Expandir primer álbum por defecto
        if (data.albums?.length > 0) {
          setExpanded(new Set([data.albums[0].name]));
        }
      } catch (err) {
        console.error(err);
        navigate('/artists');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.15)', borderTopColor: '#8B5CF6', animation: 'spin-l 0.8s linear infinite' }} />
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0, fontFamily: "'Sora',sans-serif" }}>Cargando artista...</p>
      <style>{`@keyframes spin-l { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  if (!profile) return null;

  return (
    <>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes spin-l  { to{transform:rotate(360deg)} }

        /* ── Back btn ── */
        .ap-back { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; font-size:13px; font-family:'Sora',sans-serif; padding:0; margin-bottom:24px; transition:color 0.15s; }
        .ap-back:hover { color:white; }

        /* ── Hero ── */
        .ap-hero { display:flex; align-items:flex-end; gap:28px; margin-bottom:36px; animation:fadeUp 0.35s ease both; padding:24px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:20px; position:relative; overflow:hidden; }
        .ap-hero-bg { position:absolute; inset:0; background-size:cover; background-position:center top; filter:blur(60px) saturate(0.5); opacity:0.18; z-index:0; }
        .ap-hero-content { position:relative; z-index:1; display:flex; align-items:flex-end; gap:28px; width:100%; flex-wrap:wrap; }
        .ap-hero-img { width:140px; height:140px; border-radius:50%; flex-shrink:0; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); border:3px solid rgba(139,92,246,0.3); box-shadow:0 0 40px rgba(139,92,246,0.2); display:flex; align-items:center; justify-content:center; }
        .ap-hero-img img { width:100%; height:100%; object-fit:cover; }
        .ap-hero-info { flex:1; min-width:0; }
        .ap-hero-label { font-size:10px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; color:#a78bfa; margin-bottom:6px; font-family:'Sora',sans-serif; }
        .ap-hero-name  { font-size:clamp(24px, 4vw, 38px); font-weight:800; color:white; margin:0 0 10px; font-family:'Sora',sans-serif; line-height:1.1; }
        .ap-hero-stats { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
        .ap-stat { display:flex; align-items:center; gap:5px; font-size:12px; color:rgba(255,255,255,0.4); font-family:'Sora',sans-serif; }
        .ap-stat strong { color:rgba(255,255,255,0.75); font-weight:600; }
        .ap-genres  { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
        .ap-genre-tag { font-size:10px; font-weight:600; padding:3px 10px; border-radius:20px; background:rgba(139,92,246,0.15); color:#a78bfa; border:1px solid rgba(139,92,246,0.25); font-family:'Sora',sans-serif; }

        /* ── Section header ── */
        .ap-section { margin-bottom:36px; animation:fadeUp 0.4s ease both; }
        .ap-section-head { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .ap-section-icon { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ap-section-title { font-size:17px; font-weight:800; color:white; margin:0; font-family:'Sora',sans-serif; }
        .ap-section-count { font-size:11px; color:rgba(255,255,255,0.25); font-family:'Sora',sans-serif; }

        /* ── Top songs ── */
        .ap-top-list { display:flex; flex-direction:column; gap:4px; }
        .ap-top-row  { display:flex; align-items:center; gap:12px; padding:9px 12px; border-radius:12px; cursor:pointer; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); transition:all 0.18s; position:relative; }
        .ap-top-row:hover  { background:rgba(139,92,246,0.07); border-color:rgba(139,92,246,0.2); }
        .ap-top-row.active { background:rgba(139,92,246,0.12); border-color:rgba(139,92,246,0.35); }
        .ap-top-bar { position:absolute; left:0; top:0; bottom:0; width:3px; background:linear-gradient(to bottom,#a78bfa,#7c3aed); border-radius:12px 0 0 12px; }
        .ap-top-num { width:26px; text-align:center; font-size:13px; font-weight:800; font-family:'Sora',sans-serif; flex-shrink:0; }
        .ap-top-num.gold { color:#f59e0b; } .ap-top-num.mid { color:rgba(255,255,255,0.2); }
        .ap-top-art { width:42px; height:42px; border-radius:8px; flex-shrink:0; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); display:flex; align-items:center; justify-content:center; position:relative; border:1px solid rgba(255,255,255,0.07); }
        .ap-top-art img { width:100%; height:100%; object-fit:cover; }
        .ap-top-art-ov { position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.15s; border-radius:7px; }
        .ap-top-row:hover .ap-top-art-ov { opacity:1; }
        .ap-top-play { background:none; border:none; cursor:pointer; color:white; display:flex; }
        .ap-top-info { flex:1; min-width:0; }
        .ap-top-title  { font-size:13px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Sora',sans-serif; margin-bottom:2px; }
        .ap-top-row.active .ap-top-title { color:#a78bfa; }
        .ap-top-album { font-size:11px; color:rgba(255,255,255,0.35); font-family:'Sora',sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ap-top-right { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .ap-top-stat  { display:flex; align-items:center; gap:3px; font-size:10px; color:rgba(255,255,255,0.22); font-family:'Sora',sans-serif; }
        .ap-top-stat.plays { color:rgba(139,92,246,0.55); }
        .ap-top-stat.likes { color:rgba(239,68,68,0.55); }

        /* ── Albums ── */
        .ap-albums-list { display:flex; flex-direction:column; gap:12px; }
        .ap-album { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:16px; overflow:hidden; transition:border-color 0.2s; }
        .ap-album.open { border-color:rgba(139,92,246,0.2); }
        .ap-album-header { display:flex; align-items:center; gap:14px; padding:14px 16px; cursor:pointer; transition:background 0.18s; }
        .ap-album-header:hover { background:rgba(255,255,255,0.03); }
        .ap-album-art { width:56px; height:56px; border-radius:10px; flex-shrink:0; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.07); }
        .ap-album-art img { width:100%; height:100%; object-fit:cover; }
        .ap-album-info { flex:1; min-width:0; }
        .ap-album-name { font-size:15px; font-weight:700; color:white; margin-bottom:3px; font-family:'Sora',sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ap-album-meta { font-size:11px; color:rgba(255,255,255,0.3); font-family:'Sora',sans-serif; }
        .ap-album-chevron { color:rgba(255,255,255,0.3); transition:color 0.15s; flex-shrink:0; }
        .ap-album-header:hover .ap-album-chevron { color:rgba(255,255,255,0.6); }

        /* ── Album tracks ── */
        .ap-album-tracks { border-top:1px solid rgba(255,255,255,0.05); }
        .ap-track { display:flex; align-items:center; gap:10px; padding:8px 16px; cursor:pointer; transition:background 0.15s; border-bottom:1px solid rgba(255,255,255,0.03); }
        .ap-track:last-child { border-bottom:none; }
        .ap-track:hover  { background:rgba(139,92,246,0.06); }
        .ap-track.active { background:rgba(139,92,246,0.1); }
        .ap-track-num  { width:20px; text-align:center; font-size:11px; color:rgba(255,255,255,0.2); font-family:'Sora',sans-serif; flex-shrink:0; }
        .ap-track.active .ap-track-num { color:#a78bfa; }
        .ap-track-art { width:34px; height:34px; border-radius:6px; flex-shrink:0; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); display:flex; align-items:center; justify-content:center; }
        .ap-track-art img { width:100%; height:100%; object-fit:cover; }
        .ap-track-info { flex:1; min-width:0; }
        .ap-track-title  { font-size:12px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Sora',sans-serif; }
        .ap-track.active .ap-track-title { color:#a78bfa; }
        .ap-track-right { display:flex; align-items:center; gap:4px; flex-shrink:0; }
        .ap-track-stat  { font-size:10px; color:rgba(255,255,255,0.2); font-family:'Sora',sans-serif; }

        @media(max-width:640px) {
          .ap-hero { padding:16px; }
          .ap-hero-img { width:100px; height:100px; }
          .ap-hero-content { gap:16px; }
          .ap-hero-name { font-size:22px; }
          .ap-top-right { display:none; }
        }
      `}</style>

      {/* Back */}
      <button className="ap-back" onClick={() => navigate('/artists')}>
        <ChevronLeft size={16} /> Artistas
      </button>

      {/* Hero */}
      <div className="ap-hero">
        {profile.artwork && (
          <div className="ap-hero-bg" style={{ backgroundImage: `url(${profile.artwork})` }} />
        )}
        <div className="ap-hero-content">
          <div className="ap-hero-img">
            {profile.artwork
              ? <img src={profile.artwork} alt={profile.name} />
              : <Mic2 size={50} color="rgba(139,92,246,0.4)" />
            }
          </div>
          <div className="ap-hero-info">
            <div className="ap-hero-label">Artista</div>
            <h1 className="ap-hero-name">{profile.name}</h1>
            <div className="ap-hero-stats">
              <span className="ap-stat"><Music2 size={12} /><strong>{profile.songCount}</strong> canciones</span>
              {profile.albumCount > 0 && (
                <span className="ap-stat"><Disc size={12} /><strong>{profile.albumCount}</strong> álbumes</span>
              )}
              {profile.totalPlays > 0 && (
                <span className="ap-stat"><BarChart2 size={12} /><strong>{profile.totalPlays.toLocaleString()}</strong> reproducciones</span>
              )}
              {profile.totalLikes > 0 && (
                <span className="ap-stat"><Heart size={12} /><strong>{profile.totalLikes}</strong> likes</span>
              )}
            </div>
            {profile.genres?.length > 0 && (
              <div className="ap-genres">
                {profile.genres.filter(Boolean).map((g: string) => (
                  <span key={g} className="ap-genre-tag">{g}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOP SONGS */}
      {profile.topSongs?.length > 0 && (
        <div className="ap-section" style={{ animationDelay: '60ms' }}>
          <div className="ap-section-head">
            <div className="ap-section-icon" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <TrendingUp size={15} color="#f59e0b" />
            </div>
            <h3 className="ap-section-title">Canciones populares</h3>
            <span className="ap-section-count">Top {profile.topSongs.length}</span>
          </div>

          <div className="ap-top-list">
            {profile.topSongs.map((song: any, i: number) => (
              <div
                key={song._id}
                className={`ap-top-row ${isActive(song) ? 'active' : ''}`}
                onClick={() => play(song)}
              >
                {isActive(song) && <div className="ap-top-bar" />}
                <span className={`ap-top-num ${i < 3 ? 'gold' : 'mid'}`}>
                  {isPlaying_(song) ? '▶' : i + 1}
                </span>
                <div className="ap-top-art">
                  {song.artwork
                    ? <img src={song.artwork} alt={song.title} loading="lazy" />
                    : <Music2 size={14} color="rgba(139,92,246,0.4)" />
                  }
                  <div className="ap-top-art-ov">
                    <button className="ap-top-play" onClick={e => { e.stopPropagation(); play(song); }}>
                      {isPlaying_(song)
                        ? <Pause size={13} fill="white" />
                        : <Play size={13} fill="white" style={{ marginLeft: 1 }} />
                      }
                    </button>
                  </div>
                </div>
                <div className="ap-top-info">
                  <div className="ap-top-title">{song.title}</div>
                  {song.album && <div className="ap-top-album">{song.album}</div>}
                </div>
                <div className="ap-top-right" onClick={e => e.stopPropagation()}>
                  {song.playCount > 0 && (
                    <span className="ap-top-stat plays">▶ {song.playCount.toLocaleString()}</span>
                  )}
                  {song.likeCount > 0 && (
                    <span className="ap-top-stat likes"><Heart size={9} fill="currentColor" /> {song.likeCount}</span>
                  )}
                  <HeartButton songId={song._id} size={14} />
                  <AddToPlaylistButton songId={song._id} size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALBUMS */}
      {profile.albums?.length > 0 && (
        <div className="ap-section" style={{ animationDelay: '120ms' }}>
          <div className="ap-section-head">
            <div className="ap-section-icon" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <Disc size={15} color="#a78bfa" />
            </div>
            <h3 className="ap-section-title">Discografía</h3>
            <span className="ap-section-count">{profile.albums.length} álbumes</span>
          </div>

          <div className="ap-albums-list">
            {profile.albums.map((album: any) => {
              const isOpen = expandedAlbums.has(album.name);
              return (
                <div key={album.name} className={`ap-album ${isOpen ? 'open' : ''}`}>
                  {/* Album header */}
                  <div className="ap-album-header" onClick={() => toggleAlbum(album.name)}>
                    <div className="ap-album-art">
                      {album.artwork
                        ? <img src={album.artwork} alt={album.name} loading="lazy" />
                        : <Disc size={22} color="rgba(139,92,246,0.35)" />
                      }
                    </div>
                    <div className="ap-album-info">
                      <div className="ap-album-name">{album.name}</div>
                      <div className="ap-album-meta">
                        {album.year && <span>{album.year} · </span>}
                        <span>{album.songs.length} {album.songs.length === 1 ? 'canción' : 'canciones'}</span>
                      </div>
                    </div>
                    <span className="ap-album-chevron">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </div>

                  {/* Album tracks */}
                  {isOpen && (
                    <div className="ap-album-tracks">
                      {album.songs.map((song: any, i: number) => (
                        <div
                          key={song._id}
                          className={`ap-track ${isActive(song) ? 'active' : ''}`}
                          onClick={() => play(song)}
                        >
                          <span className="ap-track-num">
                            {isPlaying_(song) ? '▶' : i + 1}
                          </span>
                          <div className="ap-track-art">
                            {song.artwork
                              ? <img src={song.artwork} alt={song.title} loading="lazy" />
                              : <Music2 size={12} color="rgba(139,92,246,0.35)" />
                            }
                          </div>
                          <div className="ap-track-info">
                            <div className="ap-track-title">{song.title}</div>
                          </div>
                          <div className="ap-track-right" onClick={e => e.stopPropagation()}>
                            {song.playCount > 0 && (
                              <span className="ap-track-stat">▶ {song.playCount.toLocaleString()}</span>
                            )}
                            <HeartButton songId={song._id} size={13} />
                            <AddToPlaylistButton songId={song._id} size={13} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default ArtistProfile;
