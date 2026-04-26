import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Music2, LayoutGrid, List } from 'lucide-react';
import SongList from '../components/SongList';
import type { SearchContextType } from '../components/MainLayout';

type ViewMode = 'grid' | 'list';

const Home = () => {
  const { searchQuery } = useOutletContext<SearchContextType>();
  const [songs, setSongs] = useState<any[]>([]);
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
        setSongs(Array.isArray(data) ? data : []);
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

  const filtered = songs.filter(s => {
    if (!searchQuery?.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.artist?.toLowerCase().includes(q) ||
      s.album?.toLowerCase().includes(q) ||
      s.genre?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <style>{`
        .page-toolbar {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:24px; gap:12px; flex-wrap:wrap;
        }
        .page-title { font-size:22px; font-weight:800; color:white; margin:0; font-family:'Sora',sans-serif; }
        .page-title span { color:#a78bfa; }
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
        .empty-state { display:flex; flex-direction:column; align-items:center; padding-top:80px; gap:10px; }
        .empty-text { color:rgba(255,255,255,0.5); font-size:15px; font-weight:600; margin:0; font-family:'Sora',sans-serif; }
        .empty-sub  { color:rgba(255,255,255,0.25); font-size:12px; margin:0; font-family:'Sora',sans-serif; }
      `}</style>

      <div className="page-toolbar">
        <h2 className="page-title">
          {searchQuery?.trim()
            ? <>Resultados para <span>"{searchQuery}"</span></>
            : 'Descubrir música'
          }
        </h2>
        <div className="toolbar-right">
          <span className="page-count">{filtered.length} canciones</span>
          <div className="view-toggle">
            <button className={`view-btn ${viewMode==='grid'?'active':''}`} onClick={() => setView('grid')} title="Cuadrícula"><LayoutGrid size={15}/></button>
            <button className={`view-btn ${viewMode==='list'?'active':''}`} onClick={() => setView('list')} title="Lista"><List size={15}/></button>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'50vh',gap:14}}>
          <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(139,92,246,0.15)',borderTopColor:'#8B5CF6',animation:'spin-l 0.8s linear infinite'}}/>
          <p style={{color:'rgba(255,255,255,0.3)',fontSize:13,margin:0,fontFamily:'Sora,sans-serif'}}>Cargando biblioteca...</p>
          <style>{`@keyframes spin-l{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <Music2 size={44} color="rgba(139,92,246,0.3)" />
          <p className="empty-text">No se encontraron canciones</p>
          <p className="empty-sub">Intenta con otro término</p>
        </div>
      )}

      {!loading && <SongList songs={filtered} viewMode={viewMode} />}
    </>
  );
};

export default Home;