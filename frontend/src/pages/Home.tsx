import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause, Music2, LayoutGrid, List, Clock, Sparkles, TrendingUp, Compass, Search } from 'lucide-react';
import HeartButton from '../components/HeartButton';
import AddToPlaylistButton from '../components/AddToPlaylistButton';
import SongList from '../components/SongList';
import type { SearchContextType } from '../components/MainLayout';

type ViewMode = 'grid' | 'list';

interface HomeSections {
  recentSongs:  any[];
  tasteRecs:  any[];
  globalTop:     any[];
  exploreSongs: any[];
}

/* ── Carrusel horizontal ── */
const HorizontalRow = ({ songs }: { songs: any[] }) => {
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();
  const isActive   = (s: any) => currentSong?._id === s._id;
  const isPlaying_ = (s: any) => isActive(s) && isPlaying;
  const handlePlay = (song: any) => {
    if (currentSong?._id === song._id) togglePlay(); else setCurrentSong(song);
  };

  return (
    <>
      <style>{`
        .hr-scroll { display:flex; gap:12px; overflow-x:auto; padding-bottom:8px; scrollbar-width:none; }
        .hr-scroll::-webkit-scrollbar { display:none; }
        .hr-card { display:flex; align-items:center; gap:10px; flex-shrink:0; width:220px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:10px; cursor:pointer; transition:all 0.2s; position:relative; }
        .hr-card:hover { background:rgba(139,92,246,0.08); border-color:rgba(139,92,246,0.25); transform:translateY(-2px); }
        .hr-card.active { background:rgba(139,92,246,0.12); border-color:rgba(139,92,246,0.4); }
        .hr-art { width:46px; height:46px; border-radius:8px; flex-shrink:0; overflow:hidden; position:relative; background:linear-gradient(135deg,#1a1030,#2d1a5e); display:flex; align-items:center; justify-content:center; }
        .hr-art img { width:100%; height:100%; object-fit:cover; }
        .hr-art-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.15s; border-radius:7px; }
        .hr-card:hover .hr-art-overlay { opacity:1; }
        .hr-play { background:none; border:none; cursor:pointer; color:white; display:flex; }
        .hr-info { flex:1; min-width:0; }
        .hr-title { font-size:12px; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; font-family:'Sora',sans-serif; }
        .hr-card.active .hr-title { color:#a78bfa; }
        .hr-artist { font-size:10px; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Sora',sans-serif; }
        .hr-active-bar { position:absolute; left:0; top:0; bottom:0; width:3px; background:linear-gradient(to bottom,#7c3aed,#a78bfa); border-radius:12px 0 0 12px; }
      `}</style>
      <div className="hr-scroll">
        {songs.map(song => (
          <div key={song._id} className={`hr-card ${isActive(song)?'active':''}`} onClick={() => handlePlay(song)}>
            {isActive(song) && <div className="hr-active-bar"/>}
            <div className="hr-art">
              {song.artwork ? <img src={song.artwork} alt={song.title} loading="lazy"/> : <Music2 size={18} color="rgba(139,92,246,0.5)"/>}
              <div className="hr-art-overlay">
                <button className="hr-play" onClick={e=>{e.stopPropagation();handlePlay(song);}}>
                  {isPlaying_(song) ? <Pause size={16} fill="white"/> : <Play size={16} fill="white" style={{marginLeft:1}}/>}
                </button>
              </div>
            </div>
            <div className="hr-info">
              <div className="hr-title">{song.title}</div>
              <div className="hr-artist">{song.artist}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

/* ── Lista trending con posición y plays ── */
const TrendingList = ({ songs }: { songs: any[] }) => {
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();
  const isActive   = (s: any) => currentSong?._id === s._id;
  const isPlaying_ = (s: any) => isActive(s) && isPlaying;
  const handlePlay = (song: any) => {
    if (currentSong?._id === song._id) togglePlay(); else setCurrentSong(song);
  };

  return (
    <>
      <style>{`
        .tr-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:6px; }
        .tr-row { display:flex; align-items:center; gap:12px; padding:9px 12px; border-radius:12px; cursor:pointer; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); transition:all 0.18s; position:relative; }
        .tr-row:hover { background:rgba(139,92,246,0.07); border-color:rgba(139,92,246,0.2); }
        .tr-row.active { background:rgba(139,92,246,0.11); border-color:rgba(139,92,246,0.35); }
        .tr-num { width:28px; font-size:13px; font-weight:800; color:rgba(255,255,255,0.2); text-align:center; flex-shrink:0; font-family:'Sora',sans-serif; }
        .tr-row.active .tr-num { color:#a78bfa; }
        .tr-art { width:44px; height:44px; border-radius:8px; flex-shrink:0; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); display:flex; align-items:center; justify-content:center; position:relative; border:1px solid rgba(139,92,246,0.15); }
        .tr-art img { width:100%; height:100%; object-fit:cover; }
        .tr-art-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.15s; border-radius:7px; }
        .tr-row:hover .tr-art-overlay { opacity:1; }
        .tr-play { background:none; border:none; cursor:pointer; color:white; display:flex; }
        .tr-info { flex:1; min-width:0; }
        .tr-title { font-size:13px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; font-family:'Sora',sans-serif; }
        .tr-row.active .tr-title { color:#a78bfa; }
        .tr-artist { font-size:11px; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Sora',sans-serif; }
        .tr-right { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .tr-plays { font-size:10px; color:rgba(255,255,255,0.25); font-family:'Sora',sans-serif; white-space:nowrap; }
        .tr-active-bar { position:absolute; left:0; top:0; bottom:0; width:3px; background:linear-gradient(to bottom,#7c3aed,#a78bfa); border-radius:12px 0 0 12px; }
      `}</style>
      <div className="tr-grid">
        {songs.map((song, i) => (
          <div key={song._id} className={`tr-row ${isActive(song)?'active':''}`} onClick={() => handlePlay(song)}>
            {isActive(song) && <div className="tr-active-bar"/>}
            <span className="tr-num">{isPlaying_(song) ? '▶' : i+1}</span>
            <div className="tr-art">
              {song.artwork ? <img src={song.artwork} alt={song.title} loading="lazy"/> : <Music2 size={16} color="rgba(139,92,246,0.5)"/>}
              <div className="tr-art-overlay">
                <button className="tr-play" onClick={e=>{e.stopPropagation();handlePlay(song);}}>
                  {isPlaying_(song) ? <Pause size={14} fill="white"/> : <Play size={14} fill="white" style={{marginLeft:1}}/>}
                </button>
              </div>
            </div>
            <div className="tr-info">
              <div className="tr-title">{song.title}</div>
              <div className="tr-artist">{song.artist}</div>
            </div>
            <div className="tr-right" onClick={e=>e.stopPropagation()}>
              {song.playCount > 0 && <span className="tr-plays">{song.playCount.toLocaleString()} plays</span>}
              <HeartButton songId={song._id} size={14}/>
              <AddToPlaylistButton songId={song._id} size={14}/>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

/* ── Grid de explorar con badge de género ── */
const ExploreGrid = ({ songs }: { songs: any[] }) => {
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();
  const isActive   = (s: any) => currentSong?._id === s._id;
  const isPlaying_ = (s: any) => isActive(s) && isPlaying;
  const handlePlay = (song: any) => {
    if (currentSong?._id === song._id) togglePlay(); else setCurrentSong(song);
  };

  // Paleta de colores por índice para los badges de género
  const GENRE_COLORS = [
    '#a78bfa', '#60a5fa', '#34d399', '#f59e0b',
    '#f87171', '#e879f9', '#38bdf8', '#4ade80',
  ];

  // Mapa género → color estable
  const genreColorMap = new Map<string, string>();
  let colorIdx = 0;
  songs.forEach(s => {
    if (s.genre && !genreColorMap.has(s.genre)) {
      genreColorMap.set(s.genre, GENRE_COLORS[colorIdx % GENRE_COLORS.length]);
      colorIdx++;
    }
  });

  return (
    <>
      <style>{`
        .ex-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(158px,1fr)); gap:12px; }
        .ex-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; overflow:hidden; cursor:pointer; transition:all 0.22s; position:relative; }
        .ex-card:hover { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); transform:translateY(-3px); box-shadow:0 10px 28px rgba(0,0,0,0.4); }
        .ex-card.active { border-color:rgba(139,92,246,0.4); box-shadow:0 0 0 1px rgba(139,92,246,0.3); }
        .ex-art { width:100%; aspect-ratio:1/1; position:relative; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); }
        .ex-art img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s; }
        .ex-card:hover .ex-art img { transform:scale(1.05); }
        .ex-art-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
        .ex-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; }
        .ex-card:hover .ex-overlay, .ex-card.active .ex-overlay { opacity:1; }
        .ex-play-btn { width:40px; height:40px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#9b72f5,#6d28d9); color:white; transition:transform 0.15s; box-shadow:0 4px 14px rgba(109,40,217,0.6); }
        .ex-play-btn:hover { transform:scale(1.1); }
        .ex-genre-badge { position:absolute; top:8px; left:8px; font-size:9px; font-weight:700; letter-spacing:0.08em; padding:3px 8px; border-radius:20px; text-transform:uppercase; }
        .ex-now-bar { position:absolute; bottom:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#7c3aed,#a78bfa); }
        .ex-body { padding:10px 12px 12px; }
        .ex-title { font-size:12px; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; font-family:'Sora',sans-serif; }
        .ex-card.active .ex-title { color:#a78bfa; }
        .ex-artist { font-size:11px; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Sora',sans-serif; }
        @media(max-width:640px) { .ex-grid { grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; } }
      `}</style>
      <div className="ex-grid">
        {songs.map((song, i) => {
          const color = genreColorMap.get(song.genre) ?? '#a78bfa';
          return (
            <div key={song._id} className={`ex-card ${isActive(song)?'active':''}`}
              style={{ animationDelay:`${Math.min(i*20,280)}ms` }}
              onClick={() => handlePlay(song)}>
              <div className="ex-art">
                {song.artwork
                  ? <img src={song.artwork} alt={song.title} loading="lazy"/>
                  : <div className="ex-art-ph"><Music2 size={30} color="rgba(139,92,246,0.35)"/></div>
                }
                <div className="ex-overlay">
                  <button className="ex-play-btn" onClick={e=>{e.stopPropagation();handlePlay(song);}}>
                    {isPlaying_(song) ? <Pause size={16} fill="white"/> : <Play size={16} fill="white" style={{marginLeft:2}}/>}
                  </button>
                </div>
                {song.genre && (
                  <div className="ex-genre-badge" style={{ background:`${color}22`, color, border:`1px solid ${color}40` }}>
                    {song.genre}
                  </div>
                )}
                {isActive(song) && <div className="ex-now-bar"/>}
              </div>
              <div className="ex-body">
                <div className="ex-title">{song.title}</div>
                <div className="ex-artist">{song.artist}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

/* ── Sección con título ── */
const Section = ({ icon, label, color, count, children }: {
  icon: React.ReactNode; label: string; color: string; count?: number; children: React.ReactNode;
}) => (
  <div style={{ marginBottom:36 }}>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
      <div style={{ width:32, height:32, borderRadius:9, background:`${color}18`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {icon}
      </div>
      <h3 style={{ fontSize:17, fontWeight:800, color:'white', margin:0, fontFamily:"'Sora',sans-serif" }}>{label}</h3>
      {count !== undefined && (
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontFamily:"'Sora',sans-serif", fontWeight:500 }}>{count} canciones</span>
      )}
    </div>
    {children}
  </div>
);

/* ── Página ── */
const Home = () => {
  const { searchQuery } = useOutletContext<SearchContextType>();
  const [sections, setSections] = useState<HomeSections | null>(null);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('echofy-view') as ViewMode) || 'grid'
  );

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      const hdrs  = { Authorization: `Bearer ${token}` };
      try {
        const [homeRes, allRes] = await Promise.all([
          fetch('http://localhost:8080/api/queue/home', { headers: hdrs }),
          fetch('http://localhost:8080/api/songs',      { headers: hdrs }),
        ]);
        const [homeData, allData] = await Promise.all([homeRes.json(), allRes.json()]);
        setSections(homeData);
        setAllSongs(Array.isArray(allData) ? allData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const setView = (v: ViewMode) => { setViewMode(v); localStorage.setItem('echofy-view', v); };

  const isSearching = searchQuery?.trim().length > 0;
  const filtered = isSearching
    ? allSongs.filter(s => {
        const q = searchQuery.toLowerCase();
        return s.title?.toLowerCase().includes(q)  ||
               s.artist?.toLowerCase().includes(q) ||
               s.album?.toLowerCase().includes(q)  ||
               s.genre?.toLowerCase().includes(q);
      })
    : [];

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',gap:14}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(139,92,246,0.15)',borderTopColor:'#8B5CF6',animation:'spin-l 0.8s linear infinite'}}/>
      <p style={{color:'rgba(255,255,255,0.3)',fontSize:13,margin:0,fontFamily:"'Sora',sans-serif"}}>Preparando tu espacio...</p>
      <style>{`@keyframes spin-l{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* BÚSQUEDA */
  if (isSearching) return (
    <>
      <style>{`
        .st { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; gap:12px; flex-wrap:wrap; }
        .st h2 { font-size:20px; font-weight:800; color:white; margin:0; font-family:'Sora',sans-serif; }
        .st h2 span { color:#a78bfa; }
        .st-right { display:flex; align-items:center; gap:10px; }
        .st-count { font-size:12px; color:rgba(255,255,255,0.3); font-family:'Sora',sans-serif; }
        .view-toggle { display:flex; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden; }
        .view-btn { background:none; border:none; cursor:pointer; padding:6px 10px; color:rgba(255,255,255,0.35); display:flex; align-items:center; transition:all 0.15s; }
        .view-btn:hover { color:rgba(255,255,255,0.7); }
        .view-btn.active { background:rgba(139,92,246,0.2); color:#a78bfa; }
      `}</style>
      <div className="st">
        <h2>Resultados para <span>"{searchQuery}"</span></h2>
        <div className="st-right">
          <span className="st-count">{filtered.length} canciones</span>
          <div className="view-toggle">
            <button className={`view-btn ${viewMode==='grid'?'active':''}`} onClick={()=>setView('grid')}><LayoutGrid size={15}/></button>
            <button className={`view-btn ${viewMode==='list'?'active':''}`} onClick={()=>setView('list')}><List size={15}/></button>
          </div>
        </div>
      </div>
      {filtered.length === 0
        ? <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60,gap:12}}>
            <Search size={40} color="rgba(139,92,246,0.3)"/>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:15,fontWeight:600,margin:0,fontFamily:"'Sora',sans-serif"}}>Sin resultados</p>
          </div>
        : <SongList songs={filtered} viewMode={viewMode}/>
      }
    </>
  );

  /* HOME */
  return (
    <div style={{fontFamily:"'Sora',sans-serif"}}>
      <div style={{marginBottom:32}}>
        <h2 style={{fontSize:26,fontWeight:800,color:'white',margin:'0 0 4px'}}>Bienvenido de vuelta 👋</h2>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.35)',margin:0}}>¿Qué quieres escuchar hoy?</p>
      </div>

      {/* 1. Volver a escuchar */}
      {!!sections?.recentSongs?.length && (
        <Section icon={<Clock size={16} color="#34d399"/>} label="Volver a escuchar" color="#34d399">
          <HorizontalRow songs={sections.recentSongs}/>
        </Section>
      )}

      {/* 2. Recomendado */}
      {!!sections?.tasteRecs?.length && (
        <Section icon={<Sparkles size={16} color="#a78bfa"/>} label="Recomendado para ti" color="#8B5CF6" count={sections.tasteRecs.length}>
          <SongList songs={sections.tasteRecs} viewMode="grid"/>
        </Section>
      )}

      {/* 3. Trending */}
      {!!sections?.globalTop?.length && (
        <Section icon={<TrendingUp size={16} color="#f59e0b"/>} label="Éxitos del momento" color="#f59e0b" count={sections.globalTop.length}>
          <TrendingList songs={sections.globalTop}/>
        </Section>
      )}

      {/* 4. Explorar */}
      {!!sections?.exploreSongs?.length && (
        <Section icon={<Compass size={16} color="#38bdf8"/>} label="Explorar nuevos géneros" color="#38bdf8" count={sections.exploreSongs.length}>
          <ExploreGrid songs={sections.exploreSongs}/>
        </Section>
      )}
    </div>
  );
};

export default Home;