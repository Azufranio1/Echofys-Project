import React from 'react';
import { ChevronDown, Music2, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import HeartButton from './HeartButton';

interface Props {
  song: any;
  allSongs: any[];
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

const formatTime = (t: number) => {
  if (!t || isNaN(t) || !isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const ExpandedPlayer = ({
  song, allSongs, onClose, onSelectSong, onDownload,
  currentTime, duration, isMuted, volume,
  onSeek, onVolumeChange, onToggleMute, onSkipBack, onSkipForward,
}: Props) => {
  const { isPlaying, togglePlay } = usePlayerStore();

  const prog = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volDisplay = isMuted ? 0 : volume;

  return (
    <>
      <style>{`
        .exp-root {
          position: fixed; inset: 0; z-index: 200;
          display: flex; flex-direction: column;
          font-family: 'Sora', sans-serif; overflow: hidden;
        }
        .exp-bg { position: absolute; inset: 0; background: #07070f; z-index: 0; }
        .exp-bg-art {
          position: absolute; inset: -20px;
          background-size: cover; background-position: center;
          filter: blur(70px) brightness(0.2) saturate(2);
          transform: scale(1.1); z-index: 0;
        }
        .exp-bg-overlay {
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(to bottom,
            rgba(7,7,15,0.6) 0%, rgba(7,7,15,0.25) 35%,
            rgba(7,7,15,0.7) 75%, rgba(7,7,15,0.97) 100%);
        }
        .exp-header {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 28px 0;
        }
        .exp-close-btn {
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50%; width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: white; transition: all 0.2s;
        }
        .exp-close-btn:hover { background: rgba(255,255,255,0.13); transform: translateY(2px); }
        .exp-header-label {
          font-size: 10px; font-weight: 700; letter-spacing: 0.22em;
          color: rgba(255,255,255,0.35); text-transform: uppercase;
        }
        .exp-body {
          position: relative; z-index: 10; flex: 1;
          display: flex; flex-direction: row;
          align-items: flex-start; justify-content: center;
          gap: 48px; padding: 20px 52px 0; overflow: hidden; min-height: 0;
        }
        .exp-left {
          display: flex; flex-direction: column; align-items: center;
          flex-shrink: 0; width: 280px;
        }
        .exp-artwork-wrap {
          width: 230px; height: 230px; border-radius: 14px; overflow: hidden; flex-shrink: 0;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.07), 0 24px 60px rgba(0,0,0,0.65),
            0 0 50px rgba(139,92,246,0.18);
          margin-bottom: 20px;
        }
        .exp-artwork-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .exp-artwork-placeholder {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, #1a1030, #2d1a5e);
          display: flex; align-items: center; justify-content: center;
        }

        /* Título + corazón en fila */
        .exp-title-row {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; width: 100%; margin-bottom: 4px;
        }
        .exp-song-title {
          font-size: 22px; font-weight: 800; color: white;
          text-align: center; line-height: 1.2;
          /* No truncar — el corazón está al lado */
        }
        .exp-song-artist {
          font-size: 14px; color: rgba(255,255,255,0.45);
          text-align: center; margin-bottom: 16px;
        }

        /* Metadata lista plana */
        .exp-meta-list {
          width: 100%; margin-bottom: 12px;
          display: flex; flex-direction: column; gap: 0;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .exp-meta-row {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .exp-meta-key {
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
          color: rgba(255,255,255,0.3); text-transform: uppercase; flex-shrink: 0;
        }
        .exp-meta-val {
          font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.75);
          text-align: right; margin-left: 12px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;
        }

        /* RIGHT: Queue */
        .exp-right {
          width: 340px; display: flex; flex-direction: column;
          flex-shrink: 0; max-height: calc(100vh - 220px);
        }
        .exp-queue-label {
          font-size: 10px; font-weight: 700; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.3); text-transform: uppercase; margin-bottom: 12px;
        }
        .exp-queue-list {
          flex: 1; overflow-y: auto;
          display: flex; flex-direction: column; gap: 3px; padding-right: 4px;
        }
        .exp-queue-list::-webkit-scrollbar { width: 3px; }
        .exp-queue-list::-webkit-scrollbar-track { background: transparent; }
        .exp-queue-list::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 2px; }
        .exp-queue-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 10px; cursor: pointer;
          transition: background 0.15s; border: 1px solid transparent;
        }
        .exp-queue-item:hover { background: rgba(255,255,255,0.05); }
        .exp-queue-item.active { background: rgba(139,92,246,0.14); border-color: rgba(139,92,246,0.28); }
        .exp-queue-thumb {
          width: 40px; height: 40px; border-radius: 7px; flex-shrink: 0;
          background: linear-gradient(135deg, #1a1030, #2d1a5e);
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .exp-queue-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .exp-queue-info { min-width: 0; flex: 1; }
        .exp-queue-title {
          font-size: 12px; font-weight: 600; color: white;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 1px;
        }
        .exp-queue-item.active .exp-queue-title { color: #a78bfa; }
        .exp-queue-artist {
          font-size: 10px; color: rgba(255,255,255,0.3);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .exp-queue-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #8B5CF6; flex-shrink: 0;
          animation: dotPulse 1.2s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.65); }
        }

        /* MINI PLAYER BAR */
        .exp-player-bar {
          position: relative; z-index: 10; flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px; height: 82px;
          background: rgba(5,5,14,0.92);
          border-top: 1px solid rgba(139,92,246,0.15);
          backdrop-filter: blur(20px);
        }
        .exp-player-bar::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg,
            transparent 0%, rgba(139,92,246,0.5) 20%,
            rgba(192,168,255,0.8) 50%, rgba(139,92,246,0.5) 80%, transparent 100%);
        }
        .exp-bar-song {
          display: flex; align-items: center; gap: 10px; width: 26%; min-width: 0;
        }
        .exp-bar-thumb {
          width: 42px; height: 42px; border-radius: 7px; overflow: hidden; flex-shrink: 0;
          background: linear-gradient(135deg, #1a1030, #2d1a5e);
          border: 1px solid rgba(139,92,246,0.25);
          display: flex; align-items: center; justify-content: center;
        }
        .exp-bar-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .exp-bar-title {
          font-size: 12px; font-weight: 600; color: white;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;
        }
        .exp-bar-artist { font-size: 10px; color: #6B7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .exp-bar-center {
          display: flex; flex-direction: column; align-items: center; gap: 7px;
          flex: 1; max-width: 46%;
        }
        .exp-bar-controls { display: flex; align-items: center; gap: 20px; }
        .exp-bar-btn {
          background: none; border: none; cursor: pointer; color: #4B5563;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.15s, transform 0.15s; padding: 3px; border-radius: 50%;
        }
        .exp-bar-btn:hover { color: #E5E7EB; transform: scale(1.1); }
        .exp-bar-btn-play {
          width: 36px; height: 36px; border-radius: 50%; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #9b72f5 0%, #6d28d9 100%);
          color: white; transition: transform 0.15s, box-shadow 0.3s;
          box-shadow: 0 2px 10px rgba(109,40,217,0.4);
        }
        .exp-bar-btn-play:hover { transform: scale(1.06); }
        .exp-bar-btn-play.playing { box-shadow: 0 0 0 2px rgba(139,92,246,0.4), 0 0 20px rgba(109,40,217,0.6); }
        .exp-bar-progress { display: flex; align-items: center; gap: 8px; width: 100%; }
        .exp-bar-time {
          font-size: 9px; color: #6B7280; font-variant-numeric: tabular-nums;
          width: 28px; flex-shrink: 0; text-align: center;
        }
        .exp-bar-track-wrap {
          flex: 1; position: relative; height: 3px; cursor: pointer; border-radius: 4px;
        }
        .exp-bar-track-wrap:hover .exp-bar-thumb-dot { opacity: 1; }
        .exp-bar-track-bg {
          position: absolute; inset: 0; border-radius: 4px;
          background: rgba(255,255,255,0.08); overflow: hidden;
        }
        .exp-bar-track-fill {
          height: 100%; border-radius: 4px;
          background: linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%); transition: width 0.1s linear;
        }
        .exp-bar-thumb-dot {
          position: absolute; top: 50%; transform: translate(-50%, -50%);
          width: 10px; height: 10px; border-radius: 50%; background: white;
          box-shadow: 0 0 6px rgba(139,92,246,0.9); opacity: 0; transition: opacity 0.15s; pointer-events: none;
        }
        .exp-bar-range {
          position: absolute; inset: -8px 0; width: 100%;
          height: calc(100% + 16px); opacity: 0; cursor: pointer;
        }
        .exp-bar-right {
          display: flex; align-items: center; gap: 8px; width: 26%; justify-content: flex-end;
        }
        .exp-bar-icon-btn {
          background: none; border: none; cursor: pointer; color: #4B5563;
          display: flex; align-items: center; transition: color 0.15s; padding: 3px;
        }
        .exp-bar-icon-btn:hover { color: #E5E7EB; }
        .exp-bar-icon-btn.dl:hover { color: #10B981; }
        .exp-vol-bar-wrap {
          position: relative; width: 76px; height: 3px; cursor: pointer; border-radius: 4px;
        }
        .exp-vol-bar-wrap:hover .exp-bar-thumb-dot { opacity: 1; }
      `}</style>

      <div className="exp-root">
        <div className="exp-bg" />
        {song.artwork && <div className="exp-bg-art" style={{ backgroundImage: `url(${song.artwork})` }} />}
        <div className="exp-bg-overlay" />

        <div className="exp-header">
          <button className="exp-close-btn" onClick={onClose}><ChevronDown size={19} /></button>
          <span className="exp-header-label">Reproduciendo ahora</span>
          <div style={{ width: 38 }} />
        </div>

        <div className="exp-body">
          {/* LEFT */}
          <div className="exp-left">
            <div className="exp-artwork-wrap">
              {song.artwork
                ? <img src={song.artwork} alt={song.title} />
                : <div className="exp-artwork-placeholder"><Music2 size={56} color="rgba(139,92,246,0.5)" /></div>
              }
            </div>

            {/* Título + corazón en la misma fila */}
            <div className="exp-title-row">
              <span className="exp-song-title">{song.title}</span>
              <HeartButton songId={song._id} size={22} />
            </div>
            <div className="exp-song-artist">{song.artist}</div>

            <div className="exp-meta-list">
              {song.album  && <div className="exp-meta-row"><span className="exp-meta-key">Álbum</span><span className="exp-meta-val" title={song.album}>{song.album}</span></div>}
              {song.year   && <div className="exp-meta-row"><span className="exp-meta-key">Año</span><span className="exp-meta-val">{song.year}</span></div>}
              {song.genre  && <div className="exp-meta-row"><span className="exp-meta-key">Género</span><span className="exp-meta-val">{song.genre}</span></div>}
              {song.source && <div className="exp-meta-row"><span className="exp-meta-key">Fuente</span><span className="exp-meta-val" style={{ textTransform:'capitalize' }}>{song.source}</span></div>}
            </div>
          </div>

          {/* RIGHT: Queue */}
          <div className="exp-right">
            <div className="exp-queue-label">Siguiente en la lista</div>
            <div className="exp-queue-list">
              {allSongs.map((s: any) => {
                const isActive = s._id === song._id;
                return (
                  <div key={s._id} className={`exp-queue-item ${isActive ? 'active' : ''}`}
                    onClick={() => !isActive && onSelectSong(s)}>
                    <div className="exp-queue-thumb">
                      {s.artwork ? <img src={s.artwork} alt={s.title} /> : <Music2 size={16} color="rgba(139,92,246,0.6)" />}
                    </div>
                    <div className="exp-queue-info">
                      <div className="exp-queue-title">{s.title}</div>
                      <div className="exp-queue-artist">{s.artist}</div>
                    </div>
                    {isActive && isPlaying && <div className="exp-queue-dot" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MINI PLAYER BAR */}
        <div className="exp-player-bar">
          <div className="exp-bar-song">
            <div className="exp-bar-thumb">
              {song.artwork ? <img src={song.artwork} alt={song.title} /> : <Music2 size={16} color="#8B5CF6" />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="exp-bar-title">{song.title}</div>
              <div className="exp-bar-artist">{song.artist}</div>
            </div>
          </div>

          <div className="exp-bar-center">
            <div className="exp-bar-controls">
              <button className="exp-bar-btn" onClick={onSkipBack}><SkipBack size={17} fill="currentColor" /></button>
              <button className={`exp-bar-btn-play ${isPlaying ? 'playing' : ''}`} onClick={togglePlay}>
                {isPlaying ? <Pause size={15} fill="white" /> : <Play size={15} fill="white" style={{ marginLeft:'2px' }} />}
              </button>
              <button className="exp-bar-btn" onClick={onSkipForward}><SkipForward size={17} fill="currentColor" /></button>
            </div>
            <div className="exp-bar-progress">
              <span className="exp-bar-time">{formatTime(currentTime)}</span>
              <div className="exp-bar-track-wrap">
                <div className="exp-bar-track-bg"><div className="exp-bar-track-fill" style={{ width:`${prog}%` }} /></div>
                <div className="exp-bar-thumb-dot" style={{ left:`${prog}%` }} />
                <input type="range" className="exp-bar-range" min={0} max={duration || 0} value={currentTime}
                  onChange={(e: any) => onSeek(Number(e.target.value))}
                  onInput={(e: any) => onSeek(Number(e.target.value))} />
              </div>
              <span className="exp-bar-time">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="exp-bar-right">
            <button className="exp-bar-icon-btn dl" onClick={onDownload} title="Descargar"><Download size={15} /></button>
            <button className="exp-bar-icon-btn" onClick={onToggleMute}>
              {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <div className="exp-vol-bar-wrap">
              <div className="exp-bar-track-bg"><div className="exp-bar-track-fill" style={{ width:`${volDisplay}%` }} /></div>
              <div className="exp-bar-thumb-dot" style={{ left:`${volDisplay}%` }} />
              <input type="range" className="exp-bar-range" min={0} max={100} value={volDisplay}
                onChange={(e: any) => onVolumeChange(Number(e.target.value))} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExpandedPlayer;