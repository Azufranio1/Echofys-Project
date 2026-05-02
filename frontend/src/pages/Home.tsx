import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  Play, Pause, Music2, LayoutGrid, List,
  Clock, Sparkles, Star, TrendingUp, Compass, Search,
  Heart
} from 'lucide-react';
import HeartButton from '../components/HeartButton';
import AddToPlaylistButton from '../components/AddToPlaylistButton';
import SongList from '../components/SongList';
import type { SearchContextType } from '../components/MainLayout';

type ViewMode = 'grid' | 'list';

interface HomeSections {
  recentSongs:      any[];
  personalizedRecs: any[];
  tasteRecs:        any[];
  globalTop:        any[];
  exploreSongs:     any[];
}

/* ─────────────────────────────────────────
   Carrusel horizontal — volver a escuchar
───────────────────────────────────────── */
const HorizontalRow = ({ songs }: { songs: any[] }) => {
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();
  const isActive_  = (s: any) => currentSong?._id === s._id;
  const isPlaying_ = (s: any) => isActive_(s) && isPlaying;
  const play = (song: any) => currentSong?._id === song._id ? togglePlay() : setCurrentSong(song);

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
        .hr-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.15s; border-radius:7px; }
        .hr-card:hover .hr-overlay { opacity:1; }
        .hr-play { background:none; border:none; cursor:pointer; color:white; display:flex; }
        .hr-info { flex:1; min-width:0; }
        .hr-title  { font-size:12px; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; font-family:'Sora',sans-serif; }
        .hr-card.active .hr-title { color:#a78bfa; }
        .hr-artist { font-size:10px; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Sora',sans-serif; }
        .hr-bar { position:absolute; left:0; top:0; bottom:0; width:3px; background:linear-gradient(to bottom,#7c3aed,#a78bfa); border-radius:12px 0 0 12px; }
      `}</style>
      <div className="hr-scroll">
        {songs.map(song => (
          <div key={song._id} className={`hr-card ${isActive_(song)?'active':''}`} onClick={() => play(song)}>
            {isActive_(song) && <div className="hr-bar"/>}
            <div className="hr-art">
              {song.artwork ? <img src={song.artwork} alt={song.title} loading="lazy"/> : <Music2 size={18} color="rgba(139,92,246,0.5)"/>}
              <div className="hr-overlay">
                <button className="hr-play" onClick={e=>{e.stopPropagation();play(song);}}>
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

/* ─────────────────────────────────────────
   Top 20 global — lista con posición, plays y likes
───────────────────────────────────────── */
const GlobalTopList = ({ songs }: { songs: any[] }) => {
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();
  const isActive_  = (s: any) => currentSong?._id === s._id;
  const isPlaying_ = (s: any) => isActive_(s) && isPlaying;
  const play = (song: any) => currentSong?._id === song._id ? togglePlay() : setCurrentSong(song);

  return (
    <>
      <style>{`
        .gt-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:6px; }
        .gt-row { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:12px; cursor:pointer; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); transition:all 0.18s; position:relative; }
        .gt-row:hover { background:rgba(139,92,246,0.07); border-color:rgba(139,92,246,0.2); }
        .gt-row.active { background:rgba(139,92,246,0.11); border-color:rgba(139,92,246,0.35); }
        .gt-bar { position:absolute; left:0; top:0; bottom:0; width:3px; background:linear-gradient(to bottom,#f59e0b,#fbbf24); border-radius:12px 0 0 12px; }
        .gt-num { width:24px; font-size:12px; font-weight:800; text-align:center; flex-shrink:0; font-family:'Sora',sans-serif; }
        .gt-num-top { color:#f59e0b; }
        .gt-num-mid { color:rgba(255,255,255,0.25); }
        .gt-art { width:42px; height:42px; border-radius:8px; flex-shrink:0; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); display:flex; align-items:center; justify-content:center; position:relative; border:1px solid rgba(255,255,255,0.07); }
        .gt-art img { width:100%; height:100%; object-fit:cover; }
        .gt-art-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.15s; border-radius:7px; }
        .gt-row:hover .gt-art-overlay { opacity:1; }
        .gt-art-play { background:none; border:none; cursor:pointer; color:white; display:flex; }
        .gt-info { flex:1; min-width:0; }
        .gt-title  { font-size:13px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; font-family:'Sora',sans-serif; }
        .gt-row.active .gt-title { color:#a78bfa; }
        .gt-artist { font-size:11px; color:rgba(255,255,255,0.4); font-family:'Sora',sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .gt-right { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .gt-stat { display:flex; align-items:center; gap:3px; font-size:10px; color:rgba(255,255,255,0.25); font-family:'Sora',sans-serif; white-space:nowrap; }
        .gt-stat.likes { color:rgba(239,68,68,0.6); }
      `}</style>
      <div className="gt-grid">
        {songs.map((song, i) => (
          <div key={song._id} className={`gt-row ${isActive_(song)?'active':''}`} onClick={() => play(song)}>
            {isActive_(song) && <div className="gt-bar"/>}
            <span className={`gt-num ${i < 3 ? 'gt-num-top' : 'gt-num-mid'}`}>
              {isPlaying_(song) ? '▶' : i+1}
            </span>
            <div className="gt-art">
              {song.artwork ? <img src={song.artwork} alt={song.title} loading="lazy"/> : <Music2 size={15} color="rgba(139,92,246,0.5)"/>}
              <div className="gt-art-overlay">
                <button className="gt-art-play" onClick={e=>{e.stopPropagation();play(song);}}>
                  {isPlaying_(song) ? <Pause size={13} fill="white"/> : <Play size={13} fill="white" style={{marginLeft:1}}/>}
                </button>
              </div>
            </div>
            <div className="gt-info">
              <div className="gt-title">{song.title}</div>
              <div className="gt-artist">{song.artist}</div>
            </div>
            <div className="gt-right" onClick={e => e.stopPropagation()}>
              {(song.likeCount > 0) && (
                <span className="gt-stat likes">
                  <Heart size={10} fill="currentColor"/> {song.likeCount}
                </span>
              )}
              {(song.playCount > 0) && (
                <span className="gt-stat">▶ {song.playCount.toLocaleString()}</span>
              )}
              <HeartButton songId={song._id} size={14}/>
              <AddToPlaylistButton songId={song._id} size={14}/>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

/* ─────────────────────────────────────────
   Explorar — grid con badge de género
───────────────────────────────────────── */
const ExploreGrid = ({ songs }: { songs: any[] }) => {
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();
  const isActive_  = (s: any) => currentSong?._id === s._id;
  const isPlaying_ = (s: any) => isActive_(s) && isPlaying;
  const play = (song: any) => currentSong?._id === song._id ? togglePlay() : setCurrentSong(song);

  const PALETTE = ['#a78bfa','#60a5fa','#34d399','#f59e0b','#f87171','#e879f9','#38bdf8','#4ade80'];
  const colorMap = new Map<string, string>();
  let ci = 0;
  songs.forEach(s => { if (s.genre && !colorMap.has(s.genre)) { colorMap.set(s.genre, PALETTE[ci++ % PALETTE.length]); } });

  return (
    <>
      <style>{`
        .ex-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(155px,1fr)); gap:12px; }
        .ex-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; overflow:hidden; cursor:pointer; transition:all 0.22s; position:relative; }
        .ex-card:hover { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); transform:translateY(-3px); box-shadow:0 10px 28px rgba(0,0,0,0.4); }
        .ex-card.active { border-color:rgba(139,92,246,0.4); box-shadow:0 0 0 1px rgba(139,92,246,0.3); }
        .ex-art { width:100%; aspect-ratio:1/1; position:relative; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); }
        .ex-art img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s; }
        .ex-card:hover .ex-art img { transform:scale(1.05); }
        .ex-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
        .ex-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; }
        .ex-card:hover .ex-overlay, .ex-card.active .ex-overlay { opacity:1; }
        .ex-btn { width:40px; height:40px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#9b72f5,#6d28d9); color:white; transition:transform 0.15s; }
        .ex-btn:hover { transform:scale(1.1); }
        .ex-badge { position:absolute; top:8px; left:8px; font-size:9px; font-weight:700; letter-spacing:0.07em; padding:3px 8px; border-radius:20px; text-transform:uppercase; }
        .ex-nowbar { position:absolute; bottom:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#7c3aed,#a78bfa); }
        .ex-body { padding:10px 12px 12px; }
        .ex-title  { font-size:12px; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; font-family:'Sora',sans-serif; }
        .ex-card.active .ex-title { color:#a78bfa; }
        .ex-artist { font-size:11px; color:rgba(255,255,255,0.4); font-family:'Sora',sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        @media(max-width:640px) { .ex-grid { grid-template-columns:repeat(auto-fill,minmax(138px,1fr)); } }
      `}</style>
      <div className="ex-grid">
        {songs.map(song => {
          const color = colorMap.get(song.genre) ?? '#a78bfa';
          return (
            <div key={song._id} className={`ex-card ${isActive_(song)?'active':''}`} onClick={() => play(song)}>
              <div className="ex-art">
                {song.artwork ? <img src={song.artwork} alt={song.title} loading="lazy"/> : <div className="ex-ph"><Music2 size={30} color="rgba(139,92,246,0.35)"/></div>}
                <div className="ex-overlay">
                  <button className="ex-btn" onClick={e=>{e.stopPropagation();play(song);}}>
                    {isPlaying_(song) ? <Pause size={16} fill="white"/> : <Play size={16} fill="white" style={{marginLeft:2}}/>}
                  </button>
                </div>
                {song.genre && (
                  <div className="ex-badge" style={{background:`${color}22`,color,border:`1px solid ${color}40`}}>{song.genre}</div>
                )}
                {isActive_(song) && <div className="ex-nowbar"/>}
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

/* ─────────────────────────────────────────
   Sección con cabecera
───────────────────────────────────────── */
const Section = ({ icon, label, color, count, delay = '0ms', children }: {
  icon: React.ReactNode; label: string; color: string;
  count?: number; delay?: string; children: React.ReactNode;
}) => (
  <div style={{marginBottom:36, animation:'fadeUp 0.4s ease both', animationDelay:delay}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
      <div style={{width:32,height:32,borderRadius:9,background:`${color}18`,border:`1px solid ${color}28`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {icon}
      </div>
      <h3 style={{fontSize:17,fontWeight:800,color:'white',margin:0,fontFamily:"'Sora',sans-serif"}}>{label}</h3>
      {count !== undefined && (
        <span style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontFamily:"'Sora',sans-serif",fontWeight:500}}>{count} canciones</span>
      )}
    </div>
    {children}
  </div>
);

/* ─────────────────────────────────────────
   Página principal
───────────────────────────────────────── */
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

  const isSearching = (searchQuery?.trim().length ?? 0) > 0;
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
      <style>{`
        @keyframes spin-l { to { transform:rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );

  /* ── BÚSQUEDA ── */
  if (isSearching) return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .sr-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; gap:12px; flex-wrap:wrap; }
        .sr-title { font-size:20px; font-weight:800; color:white; margin:0; font-family:'Sora',sans-serif; }
        .sr-title span { color:#a78bfa; }
        .sr-right { display:flex; align-items:center; gap:10px; }
        .sr-count { font-size:12px; color:rgba(255,255,255,0.3); font-family:'Sora',sans-serif; }
        .view-toggle { display:flex; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden; }
        .view-btn { background:none; border:none; cursor:pointer; padding:6px 10px; color:rgba(255,255,255,0.35); display:flex; align-items:center; transition:all 0.15s; }
        .view-btn:hover { color:rgba(255,255,255,0.7); }
        .view-btn.active { background:rgba(139,92,246,0.2); color:#a78bfa; }
      `}</style>
      <div className="sr-toolbar">
        <h2 className="sr-title">Resultados para <span>"{searchQuery}"</span></h2>
        <div className="sr-right">
          <span className="sr-count">{filtered.length} canciones</span>
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
            <p style={{color:'rgba(255,255,255,0.25)',fontSize:13,margin:0,fontFamily:"'Sora',sans-serif"}}>Prueba con otro término</p>
          </div>
        : <SongList songs={filtered} viewMode={viewMode}/>
      }
    </>
  );

  /* ── HOME ── */
  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{fontFamily:"'Sora',sans-serif"}}>

        {/* Greeting */}
        <div style={{marginBottom:32, animation:'fadeUp 0.4s ease both'}}>
          <h2 style={{fontSize:26,fontWeight:800,color:'white',margin:'0 0 4px'}}>Bienvenido de vuelta 👋</h2>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.35)',margin:0}}>¿Qué quieres escuchar hoy?</p>
        </div>

        {/* 1. Volver a escuchar */}
        {!!sections?.recentSongs?.length && (
          <Section icon={<Clock size={16} color="#34d399"/>} label="Volver a escuchar" color="#34d399" delay="60ms">
            <HorizontalRow songs={sections.recentSongs}/>
          </Section>
        )}

        {/* 2. Recomendaciones personalizadas (mismo artista) */}
        {!!sections?.personalizedRecs?.length && (
          <Section icon={<Sparkles size={16} color="#a78bfa"/>} label="Recomendado para ti" color="#8B5CF6" count={sections.personalizedRecs.length} delay="120ms">
            <SongList songs={sections.personalizedRecs} viewMode="grid"/>
          </Section>
        )}

        {/* 3. Según tus gustos (mismo género) */}
        {!!sections?.tasteRecs?.length && (
          <Section icon={<Star size={16} color="#f59e0b"/>} label="Según tus gustos" color="#f59e0b" count={sections.tasteRecs.length} delay="180ms">
            <SongList songs={sections.tasteRecs} viewMode="grid"/>
          </Section>
        )}

        {/* 4. Top 20 global */}
        {!!sections?.globalTop?.length && (
          <Section icon={<TrendingUp size={16} color="#f87171"/>} label="Top 20 Global" color="#f87171" count={sections.globalTop.length} delay="240ms">
            <GlobalTopList songs={sections.globalTop}/>
          </Section>
        )}

        {/* 5. Explorar nuevos géneros */}
        {!!sections?.exploreSongs?.length && (
          <Section icon={<Compass size={16} color="#38bdf8"/>} label="Explorar nuevos géneros" color="#38bdf8" count={sections.exploreSongs.length} delay="300ms">
            <ExploreGrid songs={sections.exploreSongs}/>
          </Section>
        )}

      </div>
    </>
  );
};

export default Home;