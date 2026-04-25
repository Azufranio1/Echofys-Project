import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause, Music2 } from 'lucide-react';
import type { SearchContextType } from './MainLayout';

const Home = () => {
  const { searchQuery } = useOutletContext<SearchContextType>();
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();

  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8080/api/songs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSongs(data);
      } catch (err) {
        console.error('Error cargando canciones:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  const filtered = songs.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.artist?.toLowerCase().includes(q) ||
      s.album?.toLowerCase().includes(q) ||
      s.genre?.toLowerCase().includes(q)
    );
  });

  const handlePlay = (song: any) => {
    if (currentSong?._id === song._id) {
      togglePlay();
    } else {
      setCurrentSong(song);
    }
  };

  const isCurrentPlaying = (song: any) =>
    currentSong?._id === song._id && isPlaying;

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Cargando tu biblioteca...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .song-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.22s ease;
          position: relative;
          animation: fadeInUp 0.4s ease both;
        }
        .song-card:hover {
          background: rgba(139,92,246,0.08);
          border-color: rgba(139,92,246,0.25);
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.12);
        }
        .song-card.active {
          background: rgba(139,92,246,0.12);
          border-color: rgba(139,92,246,0.4);
          box-shadow: 0 0 0 1px rgba(139,92,246,0.3), 0 8px 24px rgba(109,40,217,0.2);
        }
        .song-card-art {
          width: 100%; aspect-ratio: 1/1; position: relative; overflow: hidden;
          background: linear-gradient(135deg, #1a1030 0%, #2d1a5e 100%);
        }
        .song-card-art img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.3s ease;
        }
        .song-card:hover .song-card-art img { transform: scale(1.05); }
        .song-card-art-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
        }
        .song-card-play-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .song-card:hover .song-card-play-overlay,
        .song-card.active .song-card-play-overlay { opacity: 1; }
        .song-card-play-btn {
          width: 44px; height: 44px; border-radius: 50%; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #9b72f5 0%, #6d28d9 100%);
          color: white; transition: transform 0.15s;
          box-shadow: 0 4px 16px rgba(109,40,217,0.6);
        }
        .song-card-play-btn:hover { transform: scale(1.1); }
        .song-card-body { padding: 12px 14px 14px; }
        .song-card-title {
          font-size: 13px; font-weight: 700; color: white;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 3px;
        }
        .song-card.active .song-card-title { color: #a78bfa; }
        .song-card-artist {
          font-size: 11px; color: rgba(255,255,255,0.4);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 6px;
        }
        .song-card-tags { display: flex; gap: 5px; flex-wrap: wrap; }
        .song-card-tag {
          font-size: 9px; font-weight: 600; letter-spacing: 0.08em;
          padding: 2px 7px; border-radius: 20px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.35); text-transform: uppercase;
        }
        .song-card-tag.genre {
          background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.2); color: #a78bfa;
        }
        .now-playing-bar {
          position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #7c3aed, #a78bfa);
        }
        .songs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
          gap: 18px;
        }
      `}</style>

      <div style={{ fontFamily: "'Sora', sans-serif" }}>

        {/* Cabecera */}
        <div style={styles.pageHeader}>
          <h2 style={styles.pageTitle}>
            {searchQuery.trim()
              ? <>Resultados para <span style={{ color: '#a78bfa' }}>"{searchQuery}"</span></>
              : 'Descubrir música'
            }
          </h2>
          <span style={styles.count}>{filtered.length} canciones</span>
        </div>

        {/* Sin resultados */}
        {filtered.length === 0 && (
          <div style={styles.emptyWrap}>
            <Music2 size={48} color="rgba(139,92,246,0.3)" />
            <p style={styles.emptyText}>No se encontraron canciones</p>
            <p style={styles.emptySubtext}>Intenta con otro término de búsqueda</p>
          </div>
        )}

        {/* Grid de canciones */}
        <div className="songs-grid">
          {filtered.map((song, i) => {
            const active = currentSong?._id === song._id;
            const playing = isCurrentPlaying(song);
            return (
              <div
                key={song._id}
                className={`song-card ${active ? 'active' : ''}`}
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                onClick={() => handlePlay(song)}
              >
                <div className="song-card-art">
                  {song.artwork
                    ? <img src={song.artwork} alt={song.title} loading="lazy" />
                    : <div className="song-card-art-placeholder">
                        <Music2 size={36} color="rgba(139,92,246,0.35)" />
                      </div>
                  }
                  <div className="song-card-play-overlay">
                    <button
                      className="song-card-play-btn"
                      onClick={(e) => { e.stopPropagation(); handlePlay(song); }}
                    >
                      {playing
                        ? <Pause size={18} fill="white" />
                        : <Play size={18} fill="white" style={{ marginLeft: 2 }} />
                      }
                    </button>
                  </div>
                  {active && <div className="now-playing-bar" />}
                </div>

                <div className="song-card-body">
                  <div className="song-card-title">{song.title}</div>
                  <div className="song-card-artist">{song.artist}</div>
                  <div className="song-card-tags">
                    {song.genre && <span className="song-card-tag genre">{song.genre}</span>}
                    {song.year && <span className="song-card-tag">{song.year}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '60vh', gap: 16,
  },
  spinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: '3px solid rgba(139,92,246,0.15)',
    borderTopColor: '#8B5CF6',
    animation: 'spin-slow 0.8s linear infinite',
  },
  loadingText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 },
  pageHeader: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: 26, fontWeight: 800, color: 'white', margin: 0,
  },
  count: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 },
  emptyWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', paddingTop: 80, gap: 10,
  },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: 600, margin: 0 },
  emptySubtext: { color: 'rgba(255,255,255,0.25)', fontSize: 13, margin: 0 },
};

export default Home;