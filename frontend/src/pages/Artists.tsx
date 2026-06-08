import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../lib/api';
import { Users, Music2, Play, TrendingUp, Search, Mic2 } from 'lucide-react';

const Artists = () => {
  const [artists, setArtists]   = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(`${API.artists}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        setArtists(Array.isArray(data) ? data : []);
        setFiltered(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setFiltered(artists);
    } else {
      const q = query.toLowerCase();
      setFiltered(artists.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.genres?.some((g: string) => g?.toLowerCase().includes(q))
      ));
    }
  }, [query, artists]);

  const GENRE_COLORS: Record<string, string> = {
    Pop:       '#a78bfa', Rock: '#f87171', Electronic: '#38bdf8',
    Jazz:      '#34d399', 'Hip-Hop': '#fbbf24', 'R&B': '#f472b6',
    Classical: '#e2e8f0', Latin: '#fb923c', Reggaeton: '#4ade80',
    Metal:     '#94a3b8',
  };
  const getGenreColor = (genre: string) =>
    GENRE_COLORS[genre] ?? '#a78bfa';

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.15)', borderTopColor: '#8B5CF6', animation: 'spin-l 0.8s linear infinite' }} />
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0, fontFamily: "'Sora',sans-serif" }}>Cargando artistas...</p>
      <style>{`@keyframes spin-l { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

        .art-page-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:28px; animation:fadeUp 0.3s ease both; }
        .art-page-title  { display:flex; align-items:center; gap:10px; }
        .art-page-title h2 { font-size:22px; font-weight:800; color:white; margin:0; font-family:'Sora',sans-serif; }
        .art-page-title span { font-size:12px; color:rgba(255,255,255,0.3); font-family:'Sora',sans-serif; margin-left:4px; }

        .art-search-wrap { position:relative; width:260px; }
        .art-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); pointer-events:none; color:rgba(255,255,255,0.25); }
        .art-search-input { width:100%; height:36px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:40px; color:white; font-family:'Sora',sans-serif; font-size:13px; padding:0 16px 0 36px; outline:none; transition:all 0.25s; }
        .art-search-input::placeholder { color:rgba(255,255,255,0.2); }
        .art-search-input:focus { background:rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.5); box-shadow:0 0 0 3px rgba(139,92,246,0.1); }

        .art-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:16px; }

        .art-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:16px; overflow:hidden; cursor:pointer; transition:all 0.25s; animation:fadeUp 0.35s ease both; }
        .art-card:hover { background:rgba(139,92,246,0.08); border-color:rgba(139,92,246,0.28); transform:translateY(-4px); box-shadow:0 14px 32px rgba(0,0,0,0.5), 0 0 20px rgba(139,92,246,0.08); }

        .art-card-img-wrap { position:relative; width:100%; aspect-ratio:1/1; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); }
        .art-card-img-wrap img { width:100%; height:100%; object-fit:cover; transition:transform 0.35s; }
        .art-card:hover .art-card-img-wrap img { transform:scale(1.07); }

        .art-card-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
        .art-card-ph-inner { width:72px; height:72px; border-radius:50%; background:rgba(139,92,246,0.15); display:flex; align-items:center; justify-content:center; }

        .art-card-overlay { position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%); opacity:0; transition:opacity 0.25s; display:flex; align-items:flex-end; justify-content:flex-end; padding:10px; }
        .art-card:hover .art-card-overlay { opacity:1; }
        .art-card-play { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#9b72f5,#6d28d9); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:white; box-shadow:0 4px 12px rgba(109,40,217,0.5); transition:transform 0.15s; }
        .art-card-play:hover { transform:scale(1.1); }

        .art-card-body { padding:12px 14px 14px; }
        .art-card-name { font-size:14px; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px; font-family:'Sora',sans-serif; }
        .art-card-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
        .art-card-stat { display:flex; align-items:center; gap:3px; font-size:10px; color:rgba(255,255,255,0.3); font-family:'Sora',sans-serif; }
        .art-card-genres { display:flex; gap:4px; flex-wrap:wrap; }
        .art-genre-badge { font-size:9px; font-weight:700; letter-spacing:0.06em; padding:2px 7px; border-radius:20px; text-transform:uppercase; }

        .art-empty { display:flex; flex-direction:column; align-items:center; padding-top:60px; gap:12px; }

        @media(max-width:640px) { .art-grid { grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; } .art-search-wrap { width:100%; } .art-page-header { flex-direction:column; align-items:flex-start; } }
      `}</style>

      {/* Header */}
      <div className="art-page-header">
        <div className="art-page-title">
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic2 size={17} color="#a78bfa" />
          </div>
          <h2>Artistas <span>{filtered.length} artistas</span></h2>
        </div>
        <div className="art-search-wrap">
          <Search size={14} className="art-search-icon" />
          <input
            className="art-search-input"
            type="text"
            placeholder="Buscar artista o género..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="art-empty">
          <Users size={42} color="rgba(139,92,246,0.25)" />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 600, margin: 0, fontFamily: "'Sora',sans-serif" }}>
            {query ? 'Sin resultados' : 'No hay artistas'}
          </p>
        </div>
      ) : (
        <div className="art-grid">
          {filtered.map((artist, i) => (
            <div
              key={artist.slug}
              className="art-card"
              style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}
              onClick={() => navigate(`/artists/${artist.slug}`)}
            >
              <div className="art-card-img-wrap">
                {artist.artwork
                  ? <img src={artist.artwork} alt={artist.name} loading="lazy" />
                  : (
                    <div className="art-card-ph">
                      <div className="art-card-ph-inner">
                        <Mic2 size={30} color="rgba(139,92,246,0.5)" />
                      </div>
                    </div>
                  )
                }
                <div className="art-card-overlay">
                  <button className="art-card-play" onClick={e => { e.stopPropagation(); navigate(`/artists/${artist.slug}`); }}>
                    <Play size={14} fill="white" style={{ marginLeft: 2 }} />
                  </button>
                </div>
              </div>

              <div className="art-card-body">
                <div className="art-card-name">{artist.name}</div>
                <div className="art-card-meta">
                  <span className="art-card-stat"><Music2 size={9} /> {artist.songCount}</span>
                  {artist.albumCount > 0 && (
                    <span className="art-card-stat">· {artist.albumCount} álb.</span>
                  )}
                  {(artist.playCount > 0) && (
                    <span className="art-card-stat"><TrendingUp size={9} /> {artist.playCount.toLocaleString()}</span>
                  )}
                </div>
                {artist.genres?.length > 0 && (
                  <div className="art-card-genres">
                    {artist.genres.slice(0, 2).filter(Boolean).map((g: string) => (
                      <span
                        key={g}
                        className="art-genre-badge"
                        style={{
                          background: `${getGenreColor(g)}18`,
                          color: getGenreColor(g),
                          border: `1px solid ${getGenreColor(g)}30`,
                        }}
                      >{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Artists;
