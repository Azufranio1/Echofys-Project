import React from 'react';
import { ChevronDown, Music2, Play, Pause, SkipBack, SkipForward,
         Volume2, VolumeX, Download, Users, Mic2, Clock, Compass } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import HeartButton from './HeartButton';
import type { QueueMeta } from '../hooks/useQueue';

interface Props {
  song: any;
  queue: any[];
  queueMeta: QueueMeta | null;
  onClose: () => void;
  onSelectSong: (song: any) => void;
  onDownload: () => void;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  volume: number;
  onSeek: (t: number) => void;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

const fmt = (t: number) => {
  if (!t || isNaN(t) || !isFinite(t)) return '0:00';
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Etiquetas para cada sección de la cola
const SECTION_LABELS = [
  { icon: Mic2,    label: 'Mismo artista',      color: '#a78bfa' },
  { icon: Mic2,    label: 'Mismo artista',      color: '#a78bfa' },
  { icon: Users,   label: 'Mismo género',       color: '#60a5fa' },
  { icon: Users,   label: 'Mismo género',       color: '#60a5fa' },
  { icon: Clock,   label: 'Escuchado antes',    color: '#34d399' },
  { icon: Clock,   label: 'Escuchado antes',    color: '#34d399' },
  { icon: Compass, label: 'Explorar',           color: '#f59e0b' },
  { icon: Compass, label: 'Explorar',           color: '#f59e0b' },
];

const ExpandedPlayer = ({
  song, queue, queueMeta, onClose, onSelectSong, onDownload,
  currentTime, duration, isMuted, volume,
  onSeek, onVolumeChange, onToggleMute, onSkipBack, onSkipForward,
}: Props) => {
  const { isPlaying, togglePlay } = usePlayerStore();
  const prog      = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volDisplay = isMuted ? 0 : volume;

  return (
    <>
      <style>{`
        .exp-root {
          position:fixed; inset:0; z-index:200;
          display:flex; flex-direction:column;
          font-family:'Sora',sans-serif; overflow:hidden;
        }

        /* Fondo */
        .exp-bg       { position:absolute; inset:0; background:#07070f; z-index:0; }
        .exp-bg-art   { position:absolute; inset:-20px; background-size:cover; background-position:center; filter:blur(70px) brightness(0.2) saturate(2); transform:scale(1.1); z-index:0; }
        .exp-bg-over  { position:absolute; inset:0; z-index:1; background:linear-gradient(to bottom,rgba(7,7,15,0.6) 0%,rgba(7,7,15,0.25) 35%,rgba(7,7,15,0.7) 75%,rgba(7,7,15,0.97) 100%); }

        /* Header */
        .exp-header   { position:relative; z-index:10; display:flex; align-items:center; justify-content:space-between; padding:18px 24px 0; flex-shrink:0; }
        .exp-close    { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:white; transition:all 0.2s; }
        .exp-close:hover { background:rgba(255,255,255,0.13); transform:translateY(2px); }
        .exp-now-label { font-size:10px; font-weight:700; letter-spacing:0.22em; color:rgba(255,255,255,0.35); text-transform:uppercase; }

        /* Body — dos columnas en desktop, columna en móvil */
        .exp-body {
          position:relative; z-index:10; flex:1; min-height:0;
          display:flex; flex-direction:row;
          align-items:flex-start; gap:40px;
          padding:20px 48px 0; overflow:hidden;
        }

        /* LEFT */
        .exp-left { display:flex; flex-direction:column; align-items:center; flex-shrink:0; width:240px; }
        .exp-artwork {
          width:210px; height:210px; border-radius:14px; overflow:hidden; flex-shrink:0;
          box-shadow:0 0 0 1px rgba(255,255,255,0.07),0 20px 50px rgba(0,0,0,0.65),0 0 40px rgba(139,92,246,0.18);
          margin-bottom:18px;
        }
        .exp-artwork img { width:100%; height:100%; object-fit:cover; }
        .exp-artwork-ph { width:100%; height:100%; background:linear-gradient(135deg,#1a1030,#2d1a5e); display:flex; align-items:center; justify-content:center; }
        .exp-title-row { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; margin-bottom:4px; }
        .exp-song-title { font-size:20px; font-weight:800; color:white; text-align:center; line-height:1.2; }
        .exp-song-artist { font-size:13px; color:rgba(255,255,255,0.45); text-align:center; margin-bottom:14px; }

        /* Meta */
        .exp-meta-list { width:100%; border-top:1px solid rgba(255,255,255,0.06); }
        .exp-meta-row { display:flex; justify-content:space-between; align-items:baseline; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
        .exp-meta-key { font-size:9px; font-weight:700; letter-spacing:0.12em; color:rgba(255,255,255,0.3); text-transform:uppercase; }
        .exp-meta-val { font-size:11px; font-weight:500; color:rgba(255,255,255,0.75); text-align:right; margin-left:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:150px; }

        /* RIGHT — cola */
        .exp-right { flex:1; min-width:0; display:flex; flex-direction:column; max-height:100%; }
        .exp-queue-label { font-size:10px; font-weight:700; letter-spacing:0.2em; color:rgba(255,255,255,0.3); text-transform:uppercase; margin-bottom:10px; flex-shrink:0; }
        .exp-queue-list { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:3px; padding-right:4px; min-height:0; }
        .exp-queue-list::-webkit-scrollbar { width:3px; }
        .exp-queue-list::-webkit-scrollbar-thumb { background:rgba(139,92,246,0.3); border-radius:2px; }

        .exp-queue-item { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; cursor:pointer; transition:background 0.15s; border:1px solid transparent; }
        .exp-queue-item:hover { background:rgba(255,255,255,0.05); }
        .exp-queue-thumb { width:38px; height:38px; border-radius:7px; flex-shrink:0; background:linear-gradient(135deg,#1a1030,#2d1a5e); display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .exp-queue-thumb img { width:100%; height:100%; object-fit:cover; }
        .exp-queue-info { flex:1; min-width:0; }
        .exp-queue-title { font-size:12px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:1px; }
        .exp-queue-artist { font-size:10px; color:rgba(255,255,255,0.3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .exp-queue-tag { font-size:9px; font-weight:600; padding:2px 6px; border-radius:20px; white-space:nowrap; flex-shrink:0; }

        /* Player bar */
        .exp-bar {
          position:relative; z-index:10; flex-shrink:0;
          display:flex; align-items:center; justify-content:space-between;
          padding:0 24px; height:80px;
          background:rgba(5,5,14,0.92); backdrop-filter:blur(20px);
        }
        .exp-bar::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(139,92,246,0.5) 20%,rgba(192,168,255,0.8) 50%,rgba(139,92,246,0.5) 80%,transparent); }
        .exp-bar-song { display:flex; align-items:center; gap:10px; width:24%; min-width:0; }
        .exp-bar-thumb { width:40px; height:40px; border-radius:7px; overflow:hidden; flex-shrink:0; background:linear-gradient(135deg,#1a1030,#2d1a5e); display:flex; align-items:center; justify-content:center; border:1px solid rgba(139,92,246,0.2); }
        .exp-bar-thumb img { width:100%; height:100%; object-fit:cover; }
        .exp-bar-title { font-size:11px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .exp-bar-artist { font-size:10px; color:#6B7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .exp-bar-center { display:flex; flex-direction:column; align-items:center; gap:7px; flex:1; max-width:46%; }
        .exp-bar-controls { display:flex; align-items:center; gap:18px; }
        .exp-bar-btn { background:none; border:none; cursor:pointer; color:#4B5563; display:flex; align-items:center; transition:color 0.15s,transform 0.15s; padding:3px; border-radius:50%; }
        .exp-bar-btn:hover { color:#E5E7EB; transform:scale(1.1); }
        .exp-bar-play { width:36px; height:36px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#9b72f5,#6d28d9); color:white; transition:transform 0.15s,box-shadow 0.3s; box-shadow:0 2px 10px rgba(109,40,217,0.4); }
        .exp-bar-play:hover { transform:scale(1.06); }
        .exp-bar-play.playing { box-shadow:0 0 0 2px rgba(139,92,246,0.4),0 0 20px rgba(109,40,217,0.6); }
        .exp-bar-prog { display:flex; align-items:center; gap:8px; width:100%; }
        .exp-bar-time { font-size:9px; color:#6B7280; font-variant-numeric:tabular-nums; width:26px; flex-shrink:0; text-align:center; }
        .exp-track-wrap { flex:1; position:relative; height:3px; cursor:pointer; border-radius:4px; }
        .exp-track-wrap:hover .exp-thumb-dot { opacity:1; }
        .exp-track-bg { position:absolute; inset:0; border-radius:4px; background:rgba(255,255,255,0.08); overflow:hidden; }
        .exp-track-fill { height:100%; border-radius:4px; background:linear-gradient(90deg,#7c3aed,#a78bfa); transition:width 0.1s linear; }
        .exp-thumb-dot { position:absolute; top:50%; transform:translate(-50%,-50%); width:10px; height:10px; border-radius:50%; background:white; box-shadow:0 0 6px rgba(139,92,246,0.9); opacity:0; transition:opacity 0.15s; pointer-events:none; }
        .exp-range { position:absolute; inset:-8px 0; width:100%; height:calc(100% + 16px); opacity:0; cursor:pointer; }
        .exp-bar-right { display:flex; align-items:center; gap:8px; width:24%; justify-content:flex-end; }
        .exp-bar-icon { background:none; border:none; cursor:pointer; color:#4B5563; display:flex; align-items:center; transition:color 0.15s; padding:3px; }
        .exp-bar-icon:hover { color:#E5E7EB; }
        .exp-bar-icon.dl:hover { color:#10B981; }
        .exp-vol-wrap { position:relative; width:72px; height:3px; cursor:pointer; border-radius:4px; }
        .exp-vol-wrap:hover .exp-thumb-dot { opacity:1; }

        /* ── RESPONSIVE MÓVIL ── */
        @media (max-width: 700px) {
          .exp-body {
            flex-direction: column;
            align-items: center;
            padding: 16px 20px 0;
            gap: 16px;
            overflow-y: auto;
          }
          .exp-left { width: 100%; align-items: center; }
          .exp-artwork { width: 160px; height: 160px; margin-bottom: 12px; }
          .exp-song-title { font-size: 17px; }
          .exp-right { width: 100%; max-height: 220px; }
          .exp-bar { padding: 0 14px; height: 72px; }
          .exp-bar-song { width: 30%; }
          .exp-bar-right { width: 22%; }
          .exp-bar-title { font-size: 10px; }
          .exp-bar-artist { display: none; }
        }

        @media (max-width: 400px) {
          .exp-body { padding: 12px 14px 0; }
          .exp-artwork { width: 130px; height: 130px; }
          .exp-bar-song { display: none; }
          .exp-bar-right { width: auto; }
          .exp-bar-center { max-width: 70%; }
        }
      `}</style>

      <div className="exp-root">
        <div className="exp-bg" />
        {song.artwork && <div className="exp-bg-art" style={{ backgroundImage:`url(${song.artwork})` }} />}
        <div className="exp-bg-over" />

        {/* Header */}
        <div className="exp-header">
          <button className="exp-close" onClick={onClose}><ChevronDown size={18}/></button>
          <span className="exp-now-label">Reproduciendo ahora</span>
          <div style={{width:36}}/>
        </div>

        {/* Body */}
        <div className="exp-body">

          {/* LEFT: artwork + info + meta */}
          <div className="exp-left">
            <div className="exp-artwork">
              {song.artwork
                ? <img src={song.artwork} alt={song.title}/>
                : <div className="exp-artwork-ph"><Music2 size={48} color="rgba(139,92,246,0.5)"/></div>
              }
            </div>

            <div className="exp-title-row">
              <span className="exp-song-title">{song.title}</span>
              <HeartButton songId={song._id} size={20}/>
            </div>
            <div className="exp-song-artist">{song.artist}</div>

            <div className="exp-meta-list">
              {song.album  && <div className="exp-meta-row"><span className="exp-meta-key">Álbum</span><span className="exp-meta-val" title={song.album}>{song.album}</span></div>}
              {song.year   && <div className="exp-meta-row"><span className="exp-meta-key">Año</span><span className="exp-meta-val">{song.year}</span></div>}
              {song.genre  && <div className="exp-meta-row"><span className="exp-meta-key">Género</span><span className="exp-meta-val">{song.genre}</span></div>}
              {song.source && <div className="exp-meta-row"><span className="exp-meta-key">Fuente</span><span className="exp-meta-val" style={{textTransform:'capitalize'}}>{song.source}</span></div>}
            </div>
          </div>

          {/* RIGHT: cola recomendada con secciones */}
          <div className="exp-right">
            <div className="exp-queue-label">
              A continuación {queueMeta && `· ${queue.length} canciones`}
            </div>
            <div className="exp-queue-list">
              {queue.length === 0 && (
                <div style={{padding:'24px 0', textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:12}}>
                  Generando recomendaciones...
                </div>
              )}
              {queue.map((s, i) => {
                const section = SECTION_LABELS[i] ?? SECTION_LABELS[SECTION_LABELS.length - 1];
                const Icon    = section.icon;
                return (
                  <div key={s._id} className="exp-queue-item" onClick={() => onSelectSong(s)}>
                    <div className="exp-queue-thumb">
                      {s.artwork
                        ? <img src={s.artwork} alt={s.title}/>
                        : <Music2 size={15} color="rgba(139,92,246,0.6)"/>
                      }
                    </div>
                    <div className="exp-queue-info">
                      <div className="exp-queue-title">{s.title}</div>
                      <div className="exp-queue-artist">{s.artist}</div>
                    </div>
                    <div className="exp-queue-tag" style={{ background:`${section.color}18`, color:section.color, border:`1px solid ${section.color}30` }}>
                      <Icon size={9} style={{display:'inline',marginRight:3}}/>{section.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mini player bar */}
        <div className="exp-bar">
          <div className="exp-bar-song">
            <div className="exp-bar-thumb">
              {song.artwork ? <img src={song.artwork} alt={song.title}/> : <Music2 size={15} color="#8B5CF6"/>}
            </div>
            <div style={{minWidth:0}}>
              <div className="exp-bar-title">{song.title}</div>
              <div className="exp-bar-artist">{song.artist}</div>
            </div>
          </div>

          <div className="exp-bar-center">
            <div className="exp-bar-controls">
              <button className="exp-bar-btn" onClick={onSkipBack}><SkipBack size={17} fill="currentColor"/></button>
              <button className={`exp-bar-play ${isPlaying?'playing':''}`} onClick={togglePlay}>
                {isPlaying ? <Pause size={15} fill="white"/> : <Play size={15} fill="white" style={{marginLeft:2}}/>}
              </button>
              <button className="exp-bar-btn" onClick={onSkipForward}><SkipForward size={17} fill="currentColor"/></button>
            </div>
            <div className="exp-bar-prog">
              <span className="exp-bar-time">{fmt(currentTime)}</span>
              <div className="exp-track-wrap">
                <div className="exp-track-bg"><div className="exp-track-fill" style={{width:`${prog}%`}}/></div>
                <div className="exp-thumb-dot" style={{left:`${prog}%`}}/>
                <input type="range" className="exp-range" min={0} max={duration||0} value={currentTime}
                  onChange={(e:any) => onSeek(Number(e.target.value))}
                  onInput={(e:any) => onSeek(Number(e.target.value))}/>
              </div>
              <span className="exp-bar-time">{fmt(duration)}</span>
            </div>
          </div>

          <div className="exp-bar-right">
            <button className="exp-bar-icon dl" onClick={onDownload} title="Descargar"><Download size={14}/></button>
            <button className="exp-bar-icon" onClick={onToggleMute}>
              {isMuted || volume === 0 ? <VolumeX size={14}/> : <Volume2 size={14}/>}
            </button>
            <div className="exp-vol-wrap">
              <div className="exp-track-bg"><div className="exp-track-fill" style={{width:`${volDisplay}%`}}/></div>
              <div className="exp-thumb-dot" style={{left:`${volDisplay}%`}}/>
              <input type="range" className="exp-range" min={0} max={100} value={volDisplay}
                onChange={(e:any) => onVolumeChange(Number(e.target.value))}/>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExpandedPlayer;