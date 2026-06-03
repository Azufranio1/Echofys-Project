import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Music2, Download, ChevronUp, Maximize2
} from 'lucide-react';
import ExpandedPlayer from './ExpandedPlayer';
import FullscreenPlayer from './FullscreenPlayer';
import HeartButton from './HeartButton';
import { useQueue } from '../hooks/useQueue';
import { useDJSession, type ListenSignal } from '../hooks/usedjsessions';
import { API, authHeaders } from '../lib/api';

const Player = () => {
  const { currentSong, isPlaying, togglePlay, setCurrentSong, setPlaying } = usePlayerStore();
  const { queue, meta, registerPlay, loadQueue, getNext } = useQueue();
  const { djState, startDJ, nextDJ, endDJ } = useDJSession();

  const audioRef     = useRef<HTMLAudioElement>(null);
  const historyRef   = useRef<any[]>([]);           // historial para skip back
  const preloadedRef = useRef(false);               // evitar doble pre-carga en modo DJ
  const listenStart  = useRef<number>(0);           // timestamp cuando empezó a sonar
  const listenSongId = useRef<string>('');          // canción que se está midiendo

  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [isMuted,     setIsMuted]     = useState(false);
  const [volume,      setVolume]      = useState(70);
  const [isDragging,  setIsDragging]  = useState(false);
  const [isExpanded,  setIsExpanded]  = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const volDisplay = isMuted ? 0 : volume;

  // Enviar métricas/señales de escucha al servidor DJ
  const sendListenSignal = useCallback(async (signal: ListenSignal, elapsedSec: number) => {
    if (!listenSongId.current) return;
    try {
      await fetch(`${API.player}/listen-signal`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          songId: listenSongId.current,
          signal,
          elapsedSeconds: Math.round(elapsedSec),
          djSessionId: djState.mode ? djState.sessionId : null
        })
      });
    } catch (e) {
      console.error('Error sending listen signal:', e);
    }
  }, [djState.mode, djState.sessionId]);

  // Manejar el término de una canción o el salto manual
  const handleSongChangeOrEnd = useCallback((signal: ListenSignal) => {
    if (listenStart.current > 0 && listenSongId.current) {
      const elapsed = (Date.now() - listenStart.current) / 1000;
      sendListenSignal(signal, elapsed);
    }
    listenStart.current = isPlaying ? Date.now() : 0;
    listenSongId.current = currentSong?._id || '';
  }, [currentSong?._id, isPlaying, sendListenSignal]);

  // Cargar cola inicial si hay canción pero no cola
  useEffect(() => {
    if (currentSong && queue.length === 0 && !djState.mode) {
      loadQueue(currentSong);
    }
  }, [currentSong, queue.length, loadQueue, djState.mode]);

  // Sincronizar estado de reproducción del audio nativo
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setPlaying(false));
      if (listenStart.current === 0 && listenSongId.current === currentSong._id) {
        listenStart.current = Date.now();
      }
    } else {
      audioRef.current.pause();
      if (listenStart.current > 0) {
        const elapsed = (Date.now() - listenStart.current) / 1000;
        sendListenSignal('pause', elapsed);
        listenStart.current = 0;
      }
    }
  }, [isPlaying, currentSong, sendListenSignal, setPlaying]);

  // Sincronizar volumen del elemento de audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volDisplay / 100;
    }
  }, [volDisplay]);

  // Monitorear y reportar logs de reproducción completa (30s)
  useEffect(() => {
    if (!currentSong?._id) return;
    handleSongChangeOrEnd('track_changed');
    preloadedRef.current = false;

    const t = setTimeout(() => {
      registerPlay(currentSong._id);
    }, 30000);

    return () => clearTimeout(t);
  }, [currentSong?._id, registerPlay, handleSongChangeOrEnd]);

  // Disparar pre-carga de DJ IA cuando falten menos de 12 segundos
  useEffect(() => {
    if (!djState.mode || !isPlaying || duration === 0 || preloadedRef.current) return;
    const remaining = duration - currentTime;
    if (remaining <= 12 && remaining > 0) {
      preloadedRef.current = true;
      nextDJ(currentSong, queue);
    }
  }, [djState.mode, isPlaying, duration, currentTime, currentSong, queue, nextDJ]);

  // Detener la música si se cancela el modo DJ y no quedan canciones
  useEffect(() => {
    if (!djState.mode && djState.reason === 'ended' && !currentSong) {
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [djState.mode, djState.reason, currentSong, setPlaying]);

  if (!currentSong) return null;

  const handleTimeUpdate = () => {
    if (!isDragging && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (t: number) => {
    setCurrentTime(t);
    if (audioRef.current) {
      audioRef.current.currentTime = t;
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (v > 0 && isMuted) setIsMuted(false);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const handleSkipForward = async () => {
    handleSongChangeOrEnd('skip_forward');
    
    if (djState.mode) {
      setPlaying(false);
      setIsBuffering(true);
      await nextDJ(currentSong, queue, true);
      return;
    }

    const next = getNext();
    if (next) {
      historyRef.current = [...historyRef.current, currentSong];
      setCurrentSong(next);
      setPlaying(true);
    }
  };

  const handleSkipBack = () => {
    if (djState.mode) return; // Deshabilitado en sesión DJ por consistencia de continuidad
    
    handleSongChangeOrEnd('skip_back');
    if (currentTime > 4 || historyRef.current.length === 0) {
      handleSeek(0);
    } else {
      const prev = historyRef.current[historyRef.current.length - 1];
      historyRef.current = historyRef.current.slice(0, -1);
      setCurrentSong(prev);
      setPlaying(true);
    }
  };

  const sendListenSignal = async (
    songId: string,
    signal: 'completed' | 'skipped_early' | 'skipped_mid',
    progressPct: number,
  ) => {
    try {
      await fetch(`${API.player}/listen-signal`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ songId, signal, progressPct }),
      });
    } catch {
      // Silenciar — no crítico
    }
  };

  const handleEnded = () => {
    handleSongChangeOrEnd('completed');
    if (djState.mode) {
      // El flujo del DJ se encarga automáticamente mediante la pre-carga/nextDJ
      return;
    }
    const next = getNext();
    if (next) {
      historyRef.current = [...historyRef.current, currentSong];
      setCurrentSong(next);
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`${API.songs}/download/${currentSong.driveId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSong.artist} - ${currentSong.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <style>{`
        .player-mini { position:fixed; bottom:0; left:0; right:0; height:72px; background:#0b0b14; border-top:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:space-between; padding:0 20px; z-index:100; font-family:'Sora',sans-serif; box-shadow:0 -10px 30px rgba(0,0,0,0.5); }
        .player-left { display:flex; align-items:center; gap:12px; width:30%; min-width:0; cursor:pointer; }
        .player-art { width:44px; height:44px; border-radius:8px; overflow:hidden; background:linear-gradient(135deg,#1a1030,#2d1a5e); display:flex; align-items:center; justify-content:center; flex-shrink:0; border:1px solid rgba(255,255,255,0.05); }
        .player-art img { width:100%; height:100%; object-fit:cover; }
        .player-info { min-width:0; display:flex; flex-direction:column; gap:2px; }
        .player-title { font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .player-artist { font-size:11px; color:rgba(255,255,255,0.45); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        
        .player-center { display:flex; flex-direction:column; align-items:center; gap:8px; flex:1; max-width:40%; }
        .player-controls { display:flex; align-items:center; gap:20px; }
        .player-btn { background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; padding:4px; display:flex; align-items:center; transition:color 0.15s, transform 0.15s; }
        .player-btn:hover:not(:disabled) { color:#fff; transform:scale(1.08); }
        .player-btn:disabled { opacity:0.25; cursor:not-allowed; }
        .player-play-btn { width:34px; height:34px; border-radius:50%; background:#fff; color:#000; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform 0.15s, box-shadow 0.15s; }
        .player-play-btn:hover { transform:scale(1.05); box-shadow:0 0 12px rgba(255,255,255,0.25); }
        
        .player-timeline { display:flex; align-items:center; gap:10px; width:100%; }
        .player-time { font-size:10px; color:rgba(255,255,255,0.3); width:32px; font-variant-numeric:tabular-nums; }
        .player-time.right { text-align:right; }
        .player-bar-wrap { flex:1; position:relative; height:4px; border-radius:2px; cursor:pointer; display:flex; align-items:center; }
        .player-bar-wrap:hover .player-thumb { opacity:1; }
        .player-bar-track { position:absolute; left:0; right:0; height:100%; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; }
        .player-bar-fill { height:100%; background:#fff; }
        .player-thumb { position:absolute; width:10px; height:10px; border-radius:50%; background:#fff; transform:translate(-50%,-0.5px); opacity:0; transition:opacity 0.15s; pointer-events:none; box-shadow:0 2px 4px rgba(0,0,0,0.4); }
        .player-range { position:absolute; left:0; right:0; width:100%; height:16px; opacity:0; cursor:pointer; margin:0; }
        
        .player-right { display:flex; align-items:center; gap:12px; width:30%; justify-content:flex-end; }
        .player-icon-btn { background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; padding:4px; display:flex; align-items:center; transition:color 0.15s; }
        .player-icon-btn:hover { color:#fff; }
        .player-icon-btn.dl:hover { color:#10B981; }
        .player-icon-btn.fs:hover { color:#a78bfa; }

        .player-buffering-text { font-size:10px; font-weight:700; letter-spacing:0.08em; color:#a78bfa; animation: pulse-b 1.5s infinite; }
        @keyframes pulse-b { 0%,100%{opacity:0.6} 50%{opacity:1} }

        @media(max-width:640px) {
          .player-center { max-width:50%; }
          .player-right { display:none; }
          .player-left { width:45%; }
        }
      `}</style>

      <div className="player-mini">
        {/* LEFT */}
        <div className="player-left" onClick={() => setIsExpanded(true)}>
          <div className="player-art">
            {currentSong.artwork ? <img src={currentSong.artwork} alt={currentSong.title} /> : <Music2 size={18} color="rgba(255,255,255,0.2)" />}
          </div>
          <div className="player-info">
            <div className="player-title">{currentSong.title}</div>
            <div className="player-artist">{currentSong.artist}</div>
          </div>
          <HeartButton songId={currentSong._id} size={16} />
          <ChevronUp size={16} color="rgba(255,255,255,0.2)" style={{ marginLeft: 4 }} />
        </div>

        {/* CENTER */}
        <div className="player-center">
          <div className="player-controls">
            <button className="player-btn" onClick={handleSkipBack} disabled={djState.mode}>
              <SkipBack size={16} fill="currentColor" />
            </button>
            <button className="player-play-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" style={{ marginLeft: 1.5 }} />}
            </button>
            <button className="player-btn" onClick={handleSkipForward}>
              <SkipForward size={16} fill="currentColor" />
            </button>
          </div>
          <div className="player-timeline">
            <span className="player-time">{formatTime(currentTime)}</span>
            <div className="player-bar-wrap">
              <div className="player-bar-track">
                <div className="player-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="player-thumb" style={{ left: `${progressPercent}%` }} />
              <input
                type="range" className="player-range"
                min={0} max={duration || 0} value={currentTime}
                onChange={(e: any) => handleSeek(Number(e.target.value))}
                onInput={(e: any) => {
                  setIsDragging(true);
                  setCurrentTime(Number(e.target.value));
                }}
                onMouseUp={() => setIsDragging(false)}
                onTouchEnd={() => setIsDragging(false)}
              />
            </div>
            <span className="player-time right">
              {isBuffering ? <span className="player-buffering-text">DJ...</span> : formatTime(duration)}
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="player-right">
          <button className="player-icon-btn fs" onClick={() => setIsFullscreen(true)} title="Pantalla completa">
            <Maximize2 size={17}/>
          </button>
          <button className="player-icon-btn dl" onClick={handleDownload} title="Descargar">
            <Download size={17} />
          </button>
          <button className="player-icon-btn" onClick={toggleMute}>
            {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <div className="player-bar-wrap" style={{ width: '88px' }}>
            <div className="player-bar-track">
              <div className="player-bar-fill" style={{ width: `${volDisplay}%` }} />
            </div>
            <div className="player-thumb" style={{ left: `${volDisplay}%` }} />
            <input
              type="range" className="player-range"
              min={0} max={100} value={volDisplay}
              onChange={(e: any) => handleVolumeChange(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Elemento de Audio Nativo */}
        <audio
          ref={audioRef}
          key={currentSong.driveId}
          src={`${API.songs}/stream/${currentSong.driveId}`}
          preload="auto"
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />

        {/* Modal de Vista Expandida */}
        {isExpanded && (
          <ExpandedPlayer
            song={currentSong}
            queue={queue}
            queueMeta={meta}
            onClose={() => setIsExpanded(false)}
            onSelectSong={(s) => {
              if (djState.mode) endDJ(); // Salir del modo DJ si el usuario fuerza un cambio manual
              historyRef.current = [...historyRef.current, currentSong];
              setCurrentSong(s);
              setPlaying(true);
            }}
            onDownload={handleDownload}
            onFullscreen={() => {
              setIsExpanded(false);
              setIsFullscreen(true);
            }}
            currentTime={currentTime}
            duration={duration}
            isMuted={isMuted}
            volume={volume}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            // Props de DJ IA propagadas al ExpandedPlayer
            djMode={djState.mode}
            djNarration={djState.narration}
            djMood={djState.mood}
            djLoading={djState.loading}
            onDJStart={startDJ}
            onDJEnd={endDJ}
          />
        )}

        {/* Portal de Vista Fullscreen */}
        {isFullscreen &&
          createPortal(
            <FullscreenPlayer
              song={currentSong}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onClose={() => setIsFullscreen(false)}
              onTogglePlay={togglePlay}
              onSeek={handleSeek}
              onSkipBack={handleSkipBack}
              onSkipForward={handleSkipForward}
            />,
            document.body
          )
        }
      </div>
    </>
  );
};

// ── Helpers ───────────────────────────────────────────
function formatTime(t: number): string {
  if (!t || isNaN(t) || !isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default Player;