import { useEffect, useState } from 'react';
import { Clock, LayoutGrid, List, Music2 } from 'lucide-react';
import SongList from '../components/SongList';

type ViewMode = 'grid' | 'list';

interface RecentEntry {
  song: any;
  playedAt: string;
}

const RecentlyPlayedPage = () => {
  const [entries,  setEntries]  = useState<RecentEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('echofy-view') as ViewMode) || 'list'
  );

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('token');
        const res   = await fetch('http://localhost:8080/api/queue/recent?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
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

  // Formato relativo de tiempo
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  <  1) return 'Ahora mismo';
    if (mins  < 60) return `Hace ${mins} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days  <  7) return `Hace ${days}d`;
    return new Date(iso).toLocaleDateString('es', { day:'numeric', month:'short' });
  };

  const songs = entries.map(e => e.song).filter(Boolean);

  return (
    <>
      <style>{`
        .rp-toolbar {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:24px; gap:12px; flex-wrap:wrap;
        }
        .rp-title-row { display:flex; align-items:center; gap:10px; }
        .rp-title-icon {
          width:36px; height:36px; border-radius:10px;
          background:rgba(52,211,153,0.1); border:1px solid rgba(52,211,153,0.2);
          display:flex; align-items:center; justify-content:center;
        }
        .rp-title { font-size:22px; font-weight:800; color:white; margin:0; font-family:'Sora',sans-serif; }
        .rp-toolbar-right { display:flex; align-items:center; gap:10px; }
        .rp-count { font-size:12px; color:rgba(255,255,255,0.3); font-weight:500; font-family:'Sora',sans-serif; }
        .view-toggle { display:flex; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden; }
        .view-btn { background:none; border:none; cursor:pointer; padding:6px 10px; color:rgba(255,255,255,0.35); display:flex; align-items:center; transition:all 0.15s; }
        .view-btn:hover { color:rgba(255,255,255,0.7); }
        .view-btn.active { background:rgba(139,92,246,0.2); color:#a78bfa; }

        /* Timeline — solo en vista lista */
        .rp-timeline { display:flex; flex-direction:column; gap:0; }
        .rp-group { margin-bottom:24px; }
        .rp-group-label {
          font-size:10px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase;
          color:rgba(255,255,255,0.25); font-family:'Sora',sans-serif;
          margin-bottom:8px; padding-left:2px;
          display:flex; align-items:center; gap:6px;
        }
        .rp-group-label::after {
          content:''; flex:1; height:1px; background:rgba(255,255,255,0.06);
        }

        /* Badge de tiempo sobre las filas */
        .rp-entry { position:relative; }
        .rp-time-badge {
          position:absolute; right:0; top:50%; transform:translateY(-50%);
          font-size:10px; color:rgba(255,255,255,0.2); font-family:'Sora',sans-serif;
          pointer-events:none; padding-right:4px;
          display:none; /* se muestra solo en lista */
        }

        .rp-empty { display:flex; flex-direction:column; align-items:center; padding-top:80px; gap:14px; text-align:center; }
        .rp-empty-icon { width:72px; height:72px; border-radius:20px; background:rgba(52,211,153,0.07); border:1px solid rgba(52,211,153,0.12); display:flex; align-items:center; justify-content:center; }
        .rp-empty-title { font-size:16px; font-weight:700; color:rgba(255,255,255,0.5); margin:0; font-family:'Sora',sans-serif; }
        .rp-empty-sub   { font-size:13px; color:rgba(255,255,255,0.25); margin:0; font-family:'Sora',sans-serif; }
      `}</style>

      {/* TOOLBAR */}
      <div className="rp-toolbar">
        <div className="rp-title-row">
          <div className="rp-title-icon">
            <Clock size={18} color="#34d399" />
          </div>
          <h2 className="rp-title">Escuchado recientemente</h2>
        </div>
        <div className="rp-toolbar-right">
          {!loading && <span className="rp-count">{songs.length} canciones</span>}
          <div className="view-toggle">
            <button className={`view-btn ${viewMode==='grid'?'active':''}`} onClick={() => setView('grid')} title="Cuadrícula"><LayoutGrid size={15}/></button>
            <button className={`view-btn ${viewMode==='list'?'active':''}`} onClick={() => setView('list')} title="Lista"><List size={15}/></button>
          </div>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'50vh',gap:14}}>
          <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(52,211,153,0.15)',borderTopColor:'#34d399',animation:'spin-l 0.8s linear infinite'}}/>
          <p style={{color:'rgba(255,255,255,0.3)',fontSize:13,margin:0,fontFamily:'Sora,sans-serif'}}>Cargando historial...</p>
          <style>{`@keyframes spin-l{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* EMPTY */}
      {!loading && songs.length === 0 && (
        <div className="rp-empty">
          <div className="rp-empty-icon"><Clock size={32} color="rgba(52,211,153,0.4)"/></div>
          <p className="rp-empty-title">Nada por aquí aún</p>
          <p className="rp-empty-sub">Las canciones que reproduzcas aparecerán aquí</p>
        </div>
      )}

      {/* CONTENIDO */}
      {!loading && songs.length > 0 && viewMode === 'grid' && (
        <SongList songs={songs} viewMode="grid" />
      )}

      {/* LISTA CON GRUPOS DE TIEMPO */}
      {!loading && songs.length > 0 && viewMode === 'list' && (() => {
        // Agrupar por "Hoy", "Ayer", "Esta semana", "Antes"
        const now   = Date.now();
        const DAY   = 86400000;
        const groups: { label: string; entries: RecentEntry[] }[] = [
          { label: 'Hoy',         entries: [] },
          { label: 'Ayer',        entries: [] },
          { label: 'Esta semana', entries: [] },
          { label: 'Antes',       entries: [] },
        ];
        entries.forEach(entry => {
          const diff = now - new Date(entry.playedAt).getTime();
          if (diff < DAY)       groups[0].entries.push(entry);
          else if (diff < 2*DAY) groups[1].entries.push(entry);
          else if (diff < 7*DAY) groups[2].entries.push(entry);
          else                   groups[3].entries.push(entry);
        });

        return (
          <div className="rp-timeline">
            {groups.filter(g => g.entries.length > 0).map(group => (
              <div key={group.label} className="rp-group">
                <div className="rp-group-label">
                  {group.label}
                </div>
                {/* Usamos SongList en modo lista para las filas */}
                <SongList
                  songs={group.entries.map(e => e.song).filter(Boolean)}
                  viewMode="list"
                />
              </div>
            ))}
          </div>
        );
      })()}
    </>
  );
};

export default RecentlyPlayedPage;