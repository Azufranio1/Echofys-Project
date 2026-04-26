import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2, Download, ChevronUp } from 'lucide-react';
import ExpandedPlayer from './ExpandedPlayer';
import HeartButton from './HeartButton';

const Player = () => {
  const { currentSong, isPlaying, togglePlay, setCurrentSong, setPlaying } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [allSongs, setAllSongs] = useState<any[]>([]);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8080/api/songs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAllSongs(data);
      } catch (err) {
        console.error('Error cargando canciones:', err);
      }
    };
    fetchSongs();
  }, []);

  const formatTime = (t: number) => {
    if (!t || isNaN(t) || !isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) setCurrentTime(audioRef.current.currentTime);
  };
  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };
  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (audioRef.current) { audioRef.current.volume = v / 100; setIsMuted(v === 0); }
  };
  const handleSeek = (t: number) => {
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };
  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !isMuted;
    audioRef.current.muted = next;
    setIsMuted(next);
  };
  const handleDownload = () => {
    if (!currentSong) return;
    const link = document.createElement('a');
    link.href = `http://localhost:8080/api/songs/stream/${currentSong.driveId}?download=true`;
    link.setAttribute('download', `${currentSong.title}.mp3`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleEnded = () => {
    if (!allSongs.length || !currentSong) return;
    const idx = allSongs.findIndex((s) => s._id === currentSong._id);
    const next = allSongs[(idx + 1) % allSongs.length];
    if (next) { setCurrentSong(next); setPlaying(true); }
  };
  const handleSkipForward = () => {
    if (!allSongs.length || !currentSong) return;
    const idx = allSongs.findIndex((s) => s._id === currentSong._id);
    const next = allSongs[(idx + 1) % allSongs.length];
    if (next) { setCurrentSong(next); setPlaying(true); }
  };
  const handleSkipBack = () => {
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0; setCurrentTime(0); return;
    }
    if (!allSongs.length || !currentSong) return;
    const idx = allSongs.findIndex((s) => s._id === currentSong._id);
    const prev = allSongs[(idx - 1 + allSongs.length) % allSongs.length];
    if (prev) { setCurrentSong(prev); setPlaying(true); }
  };
  const handleSelectSong = (song: any) => { setCurrentSong(song); setPlaying(true); };

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying, currentSong]);

  const prog = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volDisplay = isMuted ? 0 : volume;

  if (!currentSong) return null;

  return (
    <>
      <style>{`
        .player-root {
          height: 90px; display: flex; align-items: center;
          justify-content: space-between; padding: 0 28px;
          background: #05050e; font-family: 'Sora', sans-serif;
        }
        .player-song-info {
          display: flex; align-items: center; gap: 10px;
          width: 30%; min-width: 0;
        }
        .player-song-clickable {
          display: flex; align-items: center; gap: 10px;
          flex: 1; min-width: 0; cursor: pointer;
        }
        .player-song-clickable:hover .player-song-title { color: #a78bfa; }
        .player-expand-hint {
          display: flex; align-items: center; color: #4B5563;
          transition: color 0.2s, transform 0.2s; flex-shrink: 0;
        }
        .player-song-clickable:hover .player-expand-hint { color: #8B5CF6; transform: translateY(-2px); }
        .player-artwork {
          width: 50px; height: 50px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #1a1030 0%, #2d1a5e 100%);
          border: 1px solid rgba(139,92,246,0.3);
          transition: box-shadow 0.4s ease; overflow: hidden;
        }
        .player-artwork.playing {
          box-shadow: 0 0 0 1px rgba(139,92,246,0.4), 0 0 20px rgba(139,92,246,0.35);
        }
        .player-artwork-img { width: 100%; height: 100%; object-fit: cover; }
        .player-song-title {
          font-size: 13px; font-weight: 600; color: white;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 3px; transition: color 0.2s;
        }
        .player-song-artist {
          font-size: 11px; color: #6B7280;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .player-center {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; flex: 1; max-width: 42%;
        }
        .player-controls { display: flex; align-items: center; gap: 22px; }
        .player-btn-skip {
          background: none; border: none; cursor: pointer; color: #4B5563;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.15s, transform 0.15s; padding: 4px; border-radius: 50%;
        }
        .player-btn-skip:hover { color: #E5E7EB; transform: scale(1.1); }
        .player-btn-play {
          width: 40px; height: 40px; border-radius: 50%; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #9b72f5 0%, #6d28d9 100%);
          color: white; transition: transform 0.15s, box-shadow 0.3s;
          box-shadow: 0 2px 10px rgba(109,40,217,0.4);
        }
        .player-btn-play:hover { transform: scale(1.06); }
        .player-btn-play:active { transform: scale(0.95); }
        .player-btn-play.playing { box-shadow: 0 0 0 2px rgba(139,92,246,0.4), 0 0 22px rgba(109,40,217,0.6); }
        .player-progress-row { display: flex; align-items: center; gap: 10px; width: 100%; }
        .player-time {
          font-size: 10px; color: #6B7280; font-variant-numeric: tabular-nums;
          width: 30px; flex-shrink: 0; text-align: center;
        }
        .player-bar-wrap {
          flex: 1; position: relative; height: 4px; cursor: pointer; border-radius: 4px;
        }
        .player-bar-wrap:hover .player-thumb { opacity: 1; }
        .player-bar-track {
          position: absolute; inset: 0; border-radius: 4px;
          background: rgba(255,255,255,0.08); overflow: hidden;
        }
        .player-bar-fill {
          height: 100%; border-radius: 4px;
          background: linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%);
          transition: width 0.1s linear;
        }
        .player-thumb {
          position: absolute; top: 50%; transform: translate(-50%, -50%);
          width: 12px; height: 12px; border-radius: 50%; background: white;
          box-shadow: 0 0 8px rgba(139,92,246,0.9); opacity: 0;
          transition: opacity 0.15s; pointer-events: none;
        }
        .player-range {
          position: absolute; inset: -8px 0; width: 100%;
          height: calc(100% + 16px); opacity: 0; cursor: pointer;
        }
        .player-right {
          display: flex; align-items: center; gap: 8px;
          width: 28%; justify-content: flex-end;
        }
        .player-icon-btn {
          background: none; border: none; cursor: pointer; color: #4B5563;
          display: flex; align-items: center; transition: color 0.15s; padding: 4px;
        }
        .player-icon-btn:hover { color: #E5E7EB; }
        .player-icon-btn.download:hover { color: #10B981; }
        .expanded-overlay {
          position: fixed; inset: 0; z-index: 200;
          animation: slideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {isExpanded && createPortal(
        <div className="expanded-overlay">
          <ExpandedPlayer
            song={currentSong}
            allSongs={allSongs}
            onClose={() => setIsExpanded(false)}
            onSelectSong={handleSelectSong}
            onDownload={handleDownload}
            currentTime={currentTime}
            duration={duration}
            isMuted={isMuted}
            volume={volume}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
          />
        </div>,
        document.body
      )}

      <div className="player-root">
        {/* LEFT: artwork + info + corazón */}
        <div className="player-song-info">
          <div className="player-song-clickable" onClick={() => setIsExpanded(true)}>
            <div className={`player-artwork ${isPlaying ? 'playing' : ''}`}>
              {currentSong.artwork
                ? <img src={currentSong.artwork} alt={currentSong.title} className="player-artwork-img" />
                : <Music2 size={20} color="#8B5CF6" style={{ opacity: 0.8 }} />
              }
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="player-song-title">{currentSong.title}</div>
              <div className="player-song-artist">{currentSong.artist}</div>
            </div>
            <span className="player-expand-hint"><ChevronUp size={15} /></span>
          </div>

          {/* Corazón — fuera del área clickeable del expanded */}
          <HeartButton songId={currentSong._id} size={18} />
        </div>

        {/* CENTER */}
        <div className="player-center">
          <div className="player-controls">
            <button className="player-btn-skip" onClick={handleSkipBack}>
              <SkipBack size={19} fill="currentColor" />
            </button>
            <button className={`player-btn-play ${isPlaying ? 'playing' : ''}`} onClick={togglePlay}>
              {isPlaying
                ? <Pause size={17} fill="white" />
                : <Play size={17} fill="white" style={{ marginLeft: '2px' }} />
              }
            </button>
            <button className="player-btn-skip" onClick={handleSkipForward}>
              <SkipForward size={19} fill="currentColor" />
            </button>
          </div>
          <div className="player-progress-row">
            <span className="player-time">{formatTime(currentTime)}</span>
            <div className="player-bar-wrap">
              <div className="player-bar-track">
                <div className="player-bar-fill" style={{ width: `${prog}%` }} />
              </div>
              <div className="player-thumb" style={{ left: `${prog}%` }} />
              <input
                type="range" className="player-range"
                min={0} max={duration || 0} value={currentTime}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onInput={(e: any) => setCurrentTime(Number(e.target.value))}
                onChange={(e: any) => handleSeek(Number(e.target.value))}
              />
            </div>
            <span className="player-time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* RIGHT: descarga + volumen */}
        <div className="player-right">
          <button className="player-icon-btn download" onClick={handleDownload} title="Descargar">
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

        <audio
          ref={audioRef}
          key={currentSong.driveId}
          src={`http://localhost:8080/api/songs/stream/${currentSong.driveId}`}
          preload="auto"
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      </div>
    </>
  );
};

export default Player;