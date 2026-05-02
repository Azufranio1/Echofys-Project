import { useEffect, useState } from 'react';
import { BarChart2, Music2, Play, Mic2, Clock, Compass, Flame, Users } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

interface StatsData {
  empty:               boolean;
  totalPlays:          number;
  uniqueSongs:         number;
  minutesTotal:        number;
  topSongs:            { song: any; count: number }[];
  topArtists:          { artist: string; count: number; artwork: string | null }[];
  genreDistribution:   { genre: string; count: number; pct: number }[];
  personality:         { title: string; description: string; emoji: string };
  heatmapHours:        { hour: number; count: number }[];
  heatmapDays:         { day: string; count: number }[];
  peakHour:            number;
  timePersona:         { title: string; description: string; emoji: string };
  explorerPct:         number;
  explorerLevel:       { level: string; description: string; color: string };
  allGenresCount:      number;
  listenedGenresCount: number;
}

// Paleta de colores para géneros
const GENRE_PALETTE = [
  '#a78bfa','#60a5fa','#34d399','#f59e0b',
  '#f87171','#e879f9','#38bdf8','#4ade80','#fb923c','#a3e635',
];

const fmt12 = (h: number) => {
  if (h === 0)  return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h-12}pm`;
};

const StatsPage = () => {
  const [data,    setData]    = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { setCurrentSong, setPlaying } = usePlayerStore();

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res   = await fetch('http://localhost:8080/api/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const playTopSongs = () => {
    if (!data?.topSongs?.length) return;
    const first = data.topSongs[0]?.song;
    if (first) { setCurrentSong(first); setPlaying(true); }
  };

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',gap:14}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(139,92,246,0.15)',borderTopColor:'#8B5CF6',animation:'spin-l 0.8s linear infinite'}}/>
      <p style={{color:'rgba(255,255,255,0.3)',fontSize:13,margin:0,fontFamily:"'Sora',sans-serif"}}>Analizando tu música...</p>
      <style>{`@keyframes spin-l{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data || data.empty) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',gap:14,textAlign:'center'}}>
      <div style={s.emptyIcon}><BarChart2 size={36} color="rgba(139,92,246,0.4)"/></div>
      <p style={{fontSize:16,fontWeight:700,color:'rgba(255,255,255,0.5)',margin:0,fontFamily:"'Sora',sans-serif"}}>Aún no hay datos</p>
      <p style={{fontSize:13,color:'rgba(255,255,255,0.25)',margin:0,fontFamily:"'Sora',sans-serif",maxWidth:260}}>
        Escucha algunas canciones y aquí verás tu perfil musical completo
      </p>
    </div>
  );

  const maxHour = Math.max(...data.heatmapHours.map(h => h.count), 1);
  const maxDay  = Math.max(...data.heatmapDays.map(d => d.count), 1);

  return (
    <>
      <style>{`
        @keyframes spin-l { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fillBar { from{width:0} to{width:var(--w)} }
        @keyframes fillPie { from{stroke-dashoffset:var(--full)} to{stroke-dashoffset:var(--offset)} }

        .stats-root { font-family:'Sora',sans-serif; }

        /* Header */
        .stats-header { margin-bottom:32px; }
        .stats-title { font-size:26px; font-weight:800; color:white; margin:0 0 4px; }
        .stats-sub { font-size:13px; color:rgba(255,255,255,0.35); margin:0; }

        /* KPI strip */
        .kpi-strip { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin-bottom:32px; }
        .kpi-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:16px 18px; animation:fadeUp 0.4s ease both; }
        .kpi-label { font-size:10px; font-weight:700; letter-spacing:0.12em; color:rgba(255,255,255,0.3); text-transform:uppercase; margin-bottom:6px; }
        .kpi-value { font-size:26px; font-weight:800; color:white; line-height:1; margin-bottom:4px; }
        .kpi-desc  { font-size:11px; color:rgba(255,255,255,0.3); }

        /* Grid de secciones */
        .stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
        .stats-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:20px; animation:fadeUp 0.4s ease both; }
        .stats-card-title { display:flex; align-items:center; gap:8px; margin-bottom:18px; }
        .stats-card-title h3 { font-size:14px; font-weight:700; color:white; margin:0; }
        .stats-card-icon { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .stats-card.full { grid-column:1/-1; }

        /* Personalidad */
        .personality-box { display:flex; align-items:center; gap:16px; padding:16px; background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.2); border-radius:12px; }
        .personality-emoji { font-size:40px; flex-shrink:0; }
        .personality-title { font-size:18px; font-weight:800; color:white; margin-bottom:4px; }
        .personality-desc  { font-size:12px; color:rgba(255,255,255,0.5); line-height:1.5; }

        /* Pie chart de géneros */
        .genre-wrap { display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
        .genre-legend { flex:1; min-width:120px; display:flex; flex-direction:column; gap:8px; }
        .genre-row { display:flex; align-items:center; gap:8px; }
        .genre-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .genre-name { font-size:12px; color:rgba(255,255,255,0.7); flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .genre-pct  { font-size:11px; color:rgba(255,255,255,0.4); font-weight:600; }

        /* Top rankings */
        .rank-row { display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .rank-row:last-child { border-bottom:none; }
        .rank-num { width:20px; font-size:12px; font-weight:800; color:rgba(255,255,255,0.2); text-align:center; flex-shrink:0; }
        .rank-art { width:38px; height:38px; border-radius:7px; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .rank-art img { width:100%; height:100%; object-fit:cover; }
        .rank-info { flex:1; min-width:0; }
        .rank-title  { font-size:12px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; }
        .rank-sub    { font-size:10px; color:rgba(255,255,255,0.35); }
        .rank-count  { font-size:11px; color:rgba(255,255,255,0.3); font-weight:600; flex-shrink:0; }

        /* Barra */
        .bar-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
        .bar-label { font-size:10px; color:rgba(255,255,255,0.35); width:28px; text-align:center; flex-shrink:0; }
        .bar-track { flex:1; height:6px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden; }
        .bar-fill { height:100%; border-radius:4px; transition:width 0.6s ease; }
        .bar-val { font-size:10px; color:rgba(255,255,255,0.25); width:24px; text-align:right; flex-shrink:0; }

        /* Explorador */
        .explorer-box { display:flex; flex-direction:column; gap:12px; }
        .explorer-header { display:flex; justify-content:space-between; align-items:flex-end; }
        .explorer-pct { font-size:36px; font-weight:800; }
        .explorer-level { font-size:13px; font-weight:700; color:white; margin-bottom:2px; }
        .explorer-desc  { font-size:11px; color:rgba(255,255,255,0.4); line-height:1.5; }
        .explorer-track { width:100%; height:8px; background:rgba(255,255,255,0.07); border-radius:8px; overflow:hidden; }
        .explorer-fill  { height:100%; border-radius:8px; transition:width 0.8s cubic-bezier(0.4,0,0.2,1); }
        .explorer-meta  { display:flex; justify-content:space-between; font-size:10px; color:rgba(255,255,255,0.25); }

        /* Heatmap horas */
        .hm-hours { display:flex; gap:3px; align-items:flex-end; height:60px; }
        .hm-col { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; }
        .hm-bar { width:100%; border-radius:3px; transition:height 0.5s ease; min-height:2px; }
        .hm-hlabel { font-size:8px; color:rgba(255,255,255,0.2); white-space:nowrap; }

        /* Time persona */
        .time-persona { display:flex; align-items:center; gap:12px; padding:14px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid rgba(255,255,255,0.07); margin-top:12px; }
        .time-emoji { font-size:28px; }
        .time-title { font-size:14px; font-weight:700; color:white; margin-bottom:3px; }
        .time-desc  { font-size:11px; color:rgba(255,255,255,0.4); }

        /* Heatmap días */
        .hm-days { display:flex; gap:6px; }
        .hm-day-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; }
        .hm-day-bar { width:100%; border-radius:6px; transition:height 0.5s ease; }
        .hm-day-label { font-size:10px; color:rgba(255,255,255,0.3); }

        /* Play top btn */
        .play-top-btn { display:flex; align-items:center; gap:7px; padding:8px 16px; border-radius:40px; border:none; background:linear-gradient(135deg,#9b72f5,#6d28d9); color:white; font-family:'Sora',sans-serif; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 14px rgba(109,40,217,0.4); }
        .play-top-btn:hover { transform:scale(1.04); }

        @media(max-width:640px) {
          .stats-grid { grid-template-columns:1fr; }
          .kpi-strip  { grid-template-columns:repeat(2,1fr); }
          .genre-wrap { flex-direction:column; }
          .stats-card.full { grid-column:1; }
        }
      `}</style>

      <div className="stats-root">

        {/* Header */}
        <div className="stats-header">
          <h2 className="stats-title">Tu Ritmo 🎵</h2>
          <p className="stats-sub">Una mirada a tu universo musical</p>
        </div>

        {/* KPIs */}
        <div className="kpi-strip">
          {[
            { label:'Reproducciones', value: data.totalPlays.toLocaleString(), desc:'total de plays', delay:'0ms' },
            { label:'Canciones únicas', value: data.uniqueSongs.toLocaleString(), desc:'distintas escuchadas', delay:'60ms' },
            { label:'Minutos',  value: data.minutesTotal > 60 ? `${Math.round(data.minutesTotal/60)}h` : `${data.minutesTotal}m`, desc:'estimado de escucha', delay:'120ms' },
            { label:'Géneros',  value: data.listenedGenresCount.toString(), desc:`de ${data.allGenresCount} disponibles`, delay:'180ms' },
          ].map(k => (
            <div key={k.label} className="kpi-card" style={{animationDelay:k.delay}}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-desc">{k.desc}</div>
            </div>
          ))}
        </div>

        {/* Grid principal */}
        <div className="stats-grid">

          {/* Personalidad */}
          <div className="stats-card" style={{animationDelay:'80ms'}}>
            <div className="stats-card-title">
              <div className="stats-card-icon" style={{background:'rgba(139,92,246,0.15)'}}><Music2 size={14} color="#a78bfa"/></div>
              <h3>Tu ADN Musical</h3>
            </div>
            <div className="personality-box">
              <span className="personality-emoji">{data.personality.emoji}</span>
              <div>
                <div className="personality-title">{data.personality.title}</div>
                <div className="personality-desc">{data.personality.description}</div>
              </div>
            </div>
          </div>

          {/* Pie chart de géneros */}
          <div className="stats-card" style={{animationDelay:'120ms'}}>
            <div className="stats-card-title">
              <div className="stats-card-icon" style={{background:'rgba(96,165,250,0.15)'}}><BarChart2 size={14} color="#60a5fa"/></div>
              <h3>Géneros esta semana</h3>
            </div>
            {data.genreDistribution.length === 0 ? (
              <p style={{color:'rgba(255,255,255,0.25)',fontSize:12,margin:0}}>Sin datos esta semana aún</p>
            ) : (
              <div className="genre-wrap">
                {/* SVG Pie */}
                <svg width="110" height="110" viewBox="0 0 110 110" style={{flexShrink:0}}>
                  {(() => {
                    let offset = 0;
                    const r = 40, cx = 55, cy = 55, circ = 2 * Math.PI * r;
                    return data.genreDistribution.slice(0,6).map((g, i) => {
                      const dash = (g.pct / 100) * circ;
                      const el = (
                        <circle key={g.genre}
                          cx={cx} cy={cy} r={r}
                          fill="none"
                          stroke={GENRE_PALETTE[i % GENRE_PALETTE.length]}
                          strokeWidth="20"
                          strokeDasharray={`${dash} ${circ - dash}`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 55 55)"
                          style={{transition:'stroke-dasharray 0.6s ease'}}
                        />
                      );
                      offset += dash;
                      return el;
                    });
                  })()}
                  <circle cx="55" cy="55" r="28" fill="#0d0d1a"/>
                  <text x="55" y="51" textAnchor="middle" fill="white" fontSize="11" fontWeight="800" fontFamily="Sora">
                    {data.genreDistribution[0]?.pct}%
                  </text>
                  <text x="55" y="64" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="Sora">
                    {data.genreDistribution[0]?.genre?.slice(0,8)}
                  </text>
                </svg>
                <div className="genre-legend">
                  {data.genreDistribution.slice(0,6).map((g, i) => (
                    <div key={g.genre} className="genre-row">
                      <div className="genre-dot" style={{background:GENRE_PALETTE[i % GENRE_PALETTE.length]}}/>
                      <span className="genre-name">{g.genre}</span>
                      <span className="genre-pct">{g.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top 5 canciones */}
          <div className="stats-card" style={{animationDelay:'160ms'}}>
            <div className="stats-card-title">
              <div className="stats-card-icon" style={{background:'rgba(245,158,11,0.15)'}}><Flame size={14} color="#f59e0b"/></div>
              <h3>Tus Top 5 Canciones</h3>
              <button className="play-top-btn" onClick={playTopSongs} style={{marginLeft:'auto'}}>
                <Play size={12} fill="white"/> Reproducir
              </button>
            </div>
            {data.topSongs.map((item, i) => (
              <div key={item.song._id} className="rank-row">
                <span className="rank-num">{i+1}</span>
                <div className="rank-art">
                  {item.song.artwork ? <img src={item.song.artwork} alt={item.song.title}/> : <Music2 size={14} color="rgba(139,92,246,0.5)"/>}
                </div>
                <div className="rank-info">
                  <div className="rank-title">{item.song.title}</div>
                  <div className="rank-sub">{item.song.artist}</div>
                </div>
                <span className="rank-count">{item.count}×</span>
              </div>
            ))}
          </div>

          {/* Top 5 artistas */}
          <div className="stats-card" style={{animationDelay:'200ms'}}>
            <div className="stats-card-title">
              <div className="stats-card-icon" style={{background:'rgba(232,121,249,0.15)'}}><Mic2 size={14} color="#e879f9"/></div>
              <h3>Tus Top 5 Artistas</h3>
            </div>
            {data.topArtists.map((item, i) => (
              <div key={item.artist} className="rank-row">
                <span className="rank-num">{i+1}</span>
                <div className="rank-art">
                  {item.artwork ? <img src={item.artwork} alt={item.artist}/> : <Users size={14} color="rgba(232,121,249,0.5)"/>}
                </div>
                <div className="rank-info">
                  <div className="rank-title">{item.artist}</div>
                  <div className="rank-sub">{item.count} reproducciones</div>
                </div>
                {/* Barra proporcional */}
                <div style={{width:50,flex:'none'}}>
                  <div style={{height:4,background:'rgba(255,255,255,0.07)',borderRadius:4,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.round((item.count/data.totalPlays)*100)}%`,background:'linear-gradient(90deg,#e879f9,#a78bfa)',borderRadius:4,transition:'width 0.6s'}}/>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mapa de calor — horas */}
          <div className="stats-card full" style={{animationDelay:'240ms'}}>
            <div className="stats-card-title">
              <div className="stats-card-icon" style={{background:'rgba(52,211,153,0.15)'}}><Clock size={14} color="#34d399"/></div>
              <h3>¿Cuándo escuchas más?</h3>
            </div>
            <div className="hm-hours">
              {data.heatmapHours.map(h => (
                <div key={h.hour} className="hm-col">
                  <div className="hm-bar" style={{
                    height: `${Math.max((h.count/maxHour)*52, 2)}px`,
                    background: h.hour === data.peakHour
                      ? 'linear-gradient(to top,#34d399,#6ee7b7)'
                      : `rgba(52,211,153,${0.1 + (h.count/maxHour)*0.55})`,
                  }}/>
                  {h.hour % 6 === 0 && <span className="hm-hlabel">{fmt12(h.hour)}</span>}
                </div>
              ))}
            </div>
            <div className="time-persona">
              <span className="time-emoji">{data.timePersona.emoji}</span>
              <div>
                <div className="time-title">{data.timePersona.title}</div>
                <div className="time-desc">{data.timePersona.description}</div>
              </div>
            </div>
          </div>

          {/* Mapa de calor — días */}
          <div className="stats-card" style={{animationDelay:'280ms'}}>
            <div className="stats-card-title">
              <div className="stats-card-icon" style={{background:'rgba(96,165,250,0.15)'}}><BarChart2 size={14} color="#60a5fa"/></div>
              <h3>Actividad por día</h3>
            </div>
            <div className="hm-days" style={{alignItems:'flex-end',height:'80px'}}>
              {data.heatmapDays.map(d => (
                <div key={d.day} className="hm-day-col">
                  <div className="hm-day-bar" style={{
                    height: `${Math.max((d.count/maxDay)*64,4)}px`,
                    background:`rgba(96,165,250,${0.15+(d.count/maxDay)*0.7})`,
                  }}/>
                  <span className="hm-day-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Nivel explorador */}
          <div className="stats-card" style={{animationDelay:'320ms'}}>
            <div className="stats-card-title">
              <div className="stats-card-icon" style={{background:'rgba(245,158,11,0.15)'}}><Compass size={14} color="#f59e0b"/></div>
              <h3>Nivel Explorador</h3>
            </div>
            <div className="explorer-box">
              <div className="explorer-header">
                <div>
                  <div className="explorer-level" style={{color:data.explorerLevel.color}}>{data.explorerLevel.level}</div>
                  <div className="explorer-desc">{data.explorerLevel.description}</div>
                </div>
                <span className="explorer-pct" style={{color:data.explorerLevel.color}}>{data.explorerPct}%</span>
              </div>
              <div className="explorer-track">
                <div className="explorer-fill" style={{width:`${data.explorerPct}%`, background:`linear-gradient(90deg,${data.explorerLevel.color}88,${data.explorerLevel.color})`}}/>
              </div>
              <div className="explorer-meta">
                <span>{data.listenedGenresCount} géneros explorados</span>
                <span>{data.allGenresCount} disponibles</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

const s: Record<string, React.CSSProperties> = {
  emptyIcon: {
    width:72, height:72, borderRadius:20,
    background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.15)',
    display:'flex', alignItems:'center', justifyContent:'center',
  },
};

export default StatsPage;