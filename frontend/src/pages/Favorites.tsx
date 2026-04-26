import { useEffect, useState } from 'react';
import { Heart, LayoutGrid, List, Music2 } from 'lucide-react';
import SongList from '../components/SongList';
import { useFavorites } from '../hooks/useFavorites';

type ViewMode = 'grid' | 'list';

const Favorites = () => {
  const { isFavorite } = useFavorites();
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('echofy-view') as ViewMode) || 'grid'
  );

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8080/api/songs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAllSongs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const setView = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem('echofy-view', v);
  };

  // Filtra solo las canciones marcadas como favoritas
  const favorites = allSongs.filter(s => isFavorite(s._id));

  return (
    <>
      <style>{`
        .page-toolbar {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:24px; gap:12px; flex-wrap:wrap;
        }
        .page-title-row { display:flex; align-items:center; gap:10px; }
        .page-title { font-size:22px; font-weight:800; color:white; margin:0; font-family:'Sora',sans-serif; }
        .page-title-icon {
          width:36px; height:36px; border-radius:10px;
          background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.25);
          display:flex; align-items:center; justify-content:center;
        }
        .toolbar-right { display:flex; align-items:center; gap:10px; }
        .page-count { font-size:12px; color:rgba(255,255,255,0.3); font-weight:500; font-family:'Sora',sans-serif; }
        .view-toggle {
          display:flex; background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden;
        }
        .view-btn {
          background:none; border:none; cursor:pointer;
          padding:6px 10px; color:rgba(255,255,255,0.35);
          display:flex; align-items:center; transition:all 0.15s;
        }
        .view-btn:hover { color:rgba(255,255,255,0.7); }
        .view-btn.active { background:rgba(139,92,246,0.2); color:#a78bfa; }

        .fav-empty {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding-top:80px; gap:14px; text-align:center;
        }
        .fav-empty-icon {
          width:72px; height:72px; border-radius:20px;
          background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.15);
          display:flex; align-items:center; justify-content:center;
          animation:heartbeat 2.5s ease-in-out infinite;
        }
        @keyframes heartbeat {
          0%,100% { transform:scale(1); }
          30% { transform:scale(1.08); }
          60% { transform:scale(0.96); }
        }
        .fav-empty-title { font-size:16px; font-weight:700; color:rgba(255,255,255,0.55); margin:0; font-family:'Sora',sans-serif; }
        .fav-empty-sub   { font-size:13px; color:rgba(255,255,255,0.25); margin:0; font-family:'Sora',sans-serif; max-width:260px; line-height:1.5; }
      `}</style>

      <div className="page-toolbar">
        <div className="page-title-row">
          <div className="page-title-icon">
            <Heart size={18} fill="#ef4444" color="#ef4444" />
          </div>
          <h2 className="page-title">Mis favoritos</h2>
        </div>

        <div className="toolbar-right">
          {!loading && <span className="page-count">{favorites.length} canciones</span>}
          <div className="view-toggle">
            <button className={`view-btn ${viewMode==='grid'?'active':''}`} onClick={() => setView('grid')} title="Cuadrícula"><LayoutGrid size={15}/></button>
            <button className={`view-btn ${viewMode==='list'?'active':''}`} onClick={() => setView('list')} title="Lista"><List size={15}/></button>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'50vh',gap:14}}>
          <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(239,68,68,0.15)',borderTopColor:'#ef4444',animation:'spin-l 0.8s linear infinite'}}/>
          <p style={{color:'rgba(255,255,255,0.3)',fontSize:13,margin:0,fontFamily:'Sora,sans-serif'}}>Cargando favoritos...</p>
          <style>{`@keyframes spin-l{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && favorites.length === 0 && (
        <div className="fav-empty">
          <div className="fav-empty-icon">
            <Heart size={32} color="rgba(239,68,68,0.5)" />
          </div>
          <p className="fav-empty-title">Aún no tienes favoritos</p>
          <p className="fav-empty-sub">
            Presiona el corazón en cualquier canción para agregarla aquí
          </p>
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <SongList songs={favorites} viewMode={viewMode} />
      )}
    </>
  );
};

export default Favorites;