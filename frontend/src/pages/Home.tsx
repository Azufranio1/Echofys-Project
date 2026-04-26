import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause, Music2, LayoutGrid, List } from 'lucide-react';
import HeartButton from '../components/HeartButton';
import type { SearchContextType } from '../components/MainLayout';

type ViewMode = 'grid' | 'list';

const Home = () => {
  const { searchQuery } = useOutletContext<SearchContextType>();
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();

  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('echofy-view') as ViewMode) || 'grid';
  });

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8080/api/songs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSongs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error cargando canciones:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  const setView = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem('echofy-view', v);
  };

  const filtered = songs.filter((s) => {
    if (!searchQuery?.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.artist?.toLowerCase().includes(q) ||
      s.album?.toLowerCase().includes(q) ||
      s.genre?.toLowerCase().includes(q)
    );
  });

  const handlePlay = (song: any) => {
    if (currentSong?._id === song._id) togglePlay();
    else setCurrentSong(song);
  };

  const isActive = (song: any) => currentSong?._id === song._id;
  const isPlaying_ = (song: any) => isActive(song) && isPlaying;

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:14 }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid rgba(139,92,246,0.15)', borderTopColor:'#8B5CF6', animation:'spin-loader 0.8s linear infinite' }} />
      <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13, margin:0 }}>Cargando biblioteca...</p>
      <style>{`@keyframes spin-loader { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── Toolbar ── */
        .home-toolbar {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 24px; gap: 12px; flex-wrap: wrap;
        }
        .home-title {
          font-size: 22px; font-weight: 800; color: white; margin: 0;
        }
        .home-title span { color: #a78bfa; }
        .home-toolbar-right { display: flex; align-items: center; gap: 10px; }
        .home-count { font-size: 12px; color: rgba(255,255,255,0.3); font-weight: 500; }

        .view-toggle {
          display: flex; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden;
        }
        .view-btn {
          background: none; border: none; cursor: pointer;
          padding: 6px 10px; color: rgba(255,255,255,0.35);
          display: flex; align-items: center; transition: all 0.15s;
        }
        .view-btn:hover { color: rgba(255,255,255,0.7); }
        .view-btn.active {
          background: rgba(139,92,246,0.2); color: #a78bfa;
        }

        /* ── GRID VIEW ── */
        .songs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
          gap: 14px;
        }
        .song-card-grid {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; overflow: hidden; cursor: pointer;
          transition: all 0.22s ease; position: relative;
          animation: fadeInUp 0.35s ease both;
        }
        .song-card-grid:hover {
          background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.25);
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.4), 0 0 16px rgba(139,92,246,0.1);
        }
        .song-card-grid.active {
          background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.4);
          box-shadow: 0 0 0 1px rgba(139,92,246,0.3), 0 8px 20px rgba(109,40,217,0.2);
        }
        .card-art {
          width: 100%; aspect-ratio: 1/1; position: relative; overflow: hidden;
          background: linear-gradient(135deg, #1a1030, #2d1a5e);
        }
        .card-art img { width:100%; height:100%; object-fit:cover; transition: transform 0.3s; }
        .song-card-grid:hover .card-art img { transform: scale(1.05); }
        .card-art-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
        .card-overlay {
          position:absolute; inset:0; background:rgba(0,0,0,0.3);
          display:flex; align-items:center; justify-content:center;
          opacity:0; transition:opacity 0.2s;
        }
        .song-card-grid:hover .card-overlay,
        .song-card-grid.active .card-overlay { opacity:1; }
        .card-play-btn {
          width:42px; height:42px; border-radius:50%; border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          background: linear-gradient(135deg, #9b72f5, #6d28d9);
          color:white; transition:transform 0.15s;
          box-shadow: 0 4px 14px rgba(109,40,217,0.6);
        }
        .card-play-btn:hover { transform:scale(1.1); }
        .card-heart-grid { position:absolute; top:7px; right:7px; }
        .card-now-playing { position:absolute; bottom:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#7c3aed,#a78bfa); }
        .card-body { padding:10px 12px 12px; }
        .card-title { font-size:12px; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; }
        .song-card-grid.active .card-title { color:#a78bfa; }
        .card-artist { font-size:11px; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:7px; }
        .card-tags { display:flex; gap:4px; flex-wrap:wrap; }
        .card-tag {
          font-size:9px; font-weight:600; letter-spacing:0.07em;
          padding:2px 6px; border-radius:20px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
          color:rgba(255,255,255,0.35); text-transform:uppercase;
        }
        .card-tag.genre { background:rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.2); color:#a78bfa; }

        /* ── LIST VIEW ── */
        .songs-list { display:flex; flex-direction:column; gap:6px; }
        .song-row {
          display:flex; align-items:center; gap:14px;
          padding:10px 14px; border-radius:12px; cursor:pointer;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.18s; position:relative;
          animation: fadeInUp 0.3s ease both;
        }
        .song-row:hover {
          background: rgba(139,92,246,0.07); border-color: rgba(139,92,246,0.2);
        }
        .song-row.active {
          background: rgba(139,92,246,0.11); border-color: rgba(139,92,246,0.35);
        }
        .row-art {
          width:52px; height:52px; border-radius:8px; flex-shrink:0;
          overflow:hidden; position:relative;
          background:linear-gradient(135deg,#1a1030,#2d1a5e);
          border:1px solid rgba(139,92,246,0.2);
          display:flex; align-items:center; justify-content:center;
        }
        .row-art img { width:100%; height:100%; object-fit:cover; }
        .row-art-playing {
          box-shadow: 0 0 0 1px rgba(139,92,246,0.4), 0 0 16px rgba(139,92,246,0.3);
        }
        .row-play-overlay {
          position:absolute; inset:0; background:rgba(0,0,0,0.5);
          display:flex; align-items:center; justify-content:center;
          opacity:0; transition:opacity 0.15s; border-radius:7px;
        }
        .song-row:hover .row-play-overlay { opacity:1; }
        .row-play-btn {
          background:none; border:none; cursor:pointer; color:white;
          display:flex; align-items:center; justify-content:center;
        }
        .row-info { flex:1; min-width:0; }
        .row-title { font-size:13px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
        .song-row.active .row-title { color:#a78bfa; }
        .row-artist { font-size:11px; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .row-tags { display:flex; gap:5px; flex-shrink:0; }
        .row-tag {
          font-size:9px; font-weight:600; letter-spacing:0.07em;
          padding:2px 7px; border-radius:20px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
          color:rgba(255,255,255,0.35); text-transform:uppercase; white-space:nowrap;
        }
        .row-tag.genre { background:rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.2); color:#a78bfa; }
        .row-playing-bar {
          position:absolute; left:0; top:0; bottom:0; width:3px;
          background:linear-gradient(to bottom,#7c3aed,#a78bfa); border-radius:12px 0 0 12px;
        }

        /* EMPTY */
        .empty-state { display:flex; flex-direction:column; align-items:center; padding-top:80px; gap:10px; }
        .empty-text { color:rgba(255,255,255,0.5); font-size:15px; font-weight:600; margin:0; }
        .empty-sub { color:rgba(255,255,255,0.25); font-size:12px; margin:0; }

        /* RESPONSIVE */
        @media (max-width: 640px) {
          .songs-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:10px; }
          .row-tags { display:none; }
          .home-title { font-size:18px; }
        }
      `}</style>

      {/* TOOLBAR */}
      <div className="home-toolbar">
        <h2 className="home-title">
          {searchQuery?.trim()
            ? <>Resultados para <span>"{searchQuery}"</span></>
            : 'Descubrir música'
          }
        </h2>

        <div className="home-toolbar-right">
          <span className="home-count">{filtered.length} canciones</span>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')}
              title="Vista cuadrícula"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              title="Vista lista"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* EMPTY */}
      {filtered.length === 0 && (
        <div className="empty-state">
          <Music2 size={44} color="rgba(139,92,246,0.3)" />
          <p className="empty-text">No se encontraron canciones</p>
          <p className="empty-sub">Intenta con otro término</p>
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="songs-grid">
          {filtered.map((song, i) => (
            <div
              key={song._id}
              className={`song-card-grid ${isActive(song) ? 'active' : ''}`}
              style={{ animationDelay:`${Math.min(i*22,260)}ms` }}
              onClick={() => handlePlay(song)}
            >
              <div className="card-art">
                {song.artwork
                  ? <img src={song.artwork} alt={song.title} loading="lazy" />
                  : <div className="card-art-placeholder"><Music2 size={32} color="rgba(139,92,246,0.35)" /></div>
                }
                <div className="card-overlay">
                  <button className="card-play-btn" onClick={(e) => { e.stopPropagation(); handlePlay(song); }}>
                    {isPlaying_(song) ? <Pause size={17} fill="white" /> : <Play size={17} fill="white" style={{marginLeft:2}} />}
                  </button>
                </div>
                <div className="card-heart-grid" onClick={e => e.stopPropagation()}>
                  <HeartButton songId={song._id} size={15} variant="subtle" />
                </div>
                {isActive(song) && <div className="card-now-playing" />}
              </div>
              <div className="card-body">
                <div className="card-title">{song.title}</div>
                <div className="card-artist">{song.artist}</div>
                <div className="card-tags">
                  {song.genre && <span className="card-tag genre">{song.genre}</span>}
                  {song.year  && <span className="card-tag">{song.year}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && filtered.length > 0 && (
        <div className="songs-list">
          {filtered.map((song, i) => (
            <div
              key={song._id}
              className={`song-row ${isActive(song) ? 'active' : ''}`}
              style={{ animationDelay:`${Math.min(i*18,220)}ms` }}
              onClick={() => handlePlay(song)}
            >
              {isActive(song) && <div className="row-playing-bar" />}

              {/* Portada */}
              <div className={`row-art ${isActive(song) ? 'row-art-playing' : ''}`}>
                {song.artwork
                  ? <img src={song.artwork} alt={song.title} loading="lazy" />
                  : <Music2 size={20} color="rgba(139,92,246,0.5)" />
                }
                <div className="row-play-overlay">
                  <button className="row-play-btn" onClick={(e) => { e.stopPropagation(); handlePlay(song); }}>
                    {isPlaying_(song) ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" style={{marginLeft:2}} />}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="row-info">
                <div className="row-title">{song.title}</div>
                <div className="row-artist">{song.artist}</div>
              </div>

              {/* Tags */}
              <div className="row-tags">
                {song.genre && <span className="row-tag genre">{song.genre}</span>}
                {song.year  && <span className="row-tag">{song.year}</span>}
              </div>

              {/* Corazón */}
              <div onClick={e => e.stopPropagation()}>
                <HeartButton songId={song._id} size={16} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Home;