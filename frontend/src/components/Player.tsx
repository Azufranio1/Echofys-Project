import React, { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2 } from 'lucide-react';

const Player = () => {
  const { currentSong, isPlaying, togglePlay } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v / 100;
      setIsMuted(v === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !isMuted;
    audioRef.current.muted = next;
    setIsMuted(next);
  };

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
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          background: #05050e;
          font-family: 'Sora', sans-serif;
        }

        /* LEFT */
        .player-song-info {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 28%;
          min-width: 0;
        }
        .player-artwork {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1030 0%, #2d1a5e 100%);
          border: 1px solid rgba(139,92,246,0.3);
          transition: box-shadow 0.4s ease;
        }
        .player-artwork.playing {
          box-shadow: 0 0 0 1px rgba(139,92,246,0.4), 0 0 20px rgba(139,92,246,0.35);
        }
        .player-song-title {
          font-size: 13px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 3px;
        }
        .player-song-artist {
          font-size: 11px;
          color: #6B7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* CENTER */
        .player-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          flex: 1;
          max-width: 44%;
        }
        .player-controls {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .player-btn-skip {
          background: none;
          border: none;
          cursor: pointer;
          color: #4B5563;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s, transform 0.15s;
          padding: 4px;
          border-radius: 50%;
        }
        .player-btn-skip:hover {
          color: #E5E7EB;
          transform: scale(1.1);
        }
        .player-btn-play {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #9b72f5 0%, #6d28d9 100%);
          color: white;
          transition: transform 0.15s, box-shadow 0.3s;
          box-shadow: 0 2px 10px rgba(109,40,217,0.4);
        }
        .player-btn-play:hover { transform: scale(1.06); }
        .player-btn-play:active { transform: scale(0.95); }
        .player-btn-play.playing {
          box-shadow: 0 0 0 2px rgba(139,92,246,0.4), 0 0 24px rgba(109,40,217,0.6);
        }

        /* Progress bar */
        .player-progress-row {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
        }
        .player-time {
          font-size: 10px;
          color: #6B7280;
          font-variant-numeric: tabular-nums;
          width: 30px;
          flex-shrink: 0;
          text-align: center;
        }
        .player-bar-wrap {
          flex: 1;
          position: relative;
          height: 4px;
          cursor: pointer;
          border-radius: 4px;
        }
        .player-bar-wrap:hover .player-thumb { opacity: 1; }
        .player-bar-track {
          position: absolute;
          inset: 0;
          border-radius: 4px;
          background: rgba(255,255,255,0.08);
          overflow: hidden;
        }
        .player-bar-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%);
          transition: width 0.1s linear;
        }
        .player-thumb {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 8px rgba(139,92,246,0.9);
          opacity: 0;
          transition: opacity 0.15s;
          pointer-events: none;
        }
        .player-range {
          position: absolute;
          inset: -8px 0;
          width: 100%;
          height: calc(100% + 16px);
          opacity: 0;
          cursor: pointer;
        }

        /* RIGHT: volume */
        .player-right {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 28%;
          justify-content: flex-end;
        }
        .player-vol-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #4B5563;
          display: flex;
          align-items: center;
          transition: color 0.15s;
          padding: 4px;
        }
        .player-vol-btn:hover { color: #E5E7EB; }
      `}</style>

      <div className="player-root">

        {/* LEFT */}
        <div className="player-song-info">
          <div className={`player-artwork ${isPlaying ? 'playing' : ''}`}>
            <Music2 size={20} color="#8B5CF6" style={{ opacity: 0.8 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="player-song-title">{currentSong.title}</div>
            <div className="player-song-artist">{currentSong.artist}</div>
          </div>
        </div>

        {/* CENTER */}
        <div className="player-center">
          <div className="player-controls">
            <button className="player-btn-skip">
              <SkipBack size={20} fill="currentColor" />
            </button>

            <button
              className={`player-btn-play ${isPlaying ? 'playing' : ''}`}
              onClick={togglePlay}
            >
              {isPlaying
                ? <Pause size={18} fill="white" />
                : <Play size={18} fill="white" style={{ marginLeft: '2px' }} />
              }
            </button>

            <button className="player-btn-skip">
              <SkipForward size={20} fill="currentColor" />
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
                type="range"
                className="player-range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onInput={(e: any) => setCurrentTime(Number(e.target.value))}
                onChange={(e: any) => {
                  const t = Number(e.target.value);
                  if (audioRef.current) audioRef.current.currentTime = t;
                  setCurrentTime(t);
                }}
              />
            </div>

            <span className="player-time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="player-right">
          <button className="player-vol-btn" onClick={toggleMute}>
            {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>

          <div className="player-bar-wrap" style={{ width: '90px' }}>
            <div className="player-bar-track">
              <div className="player-bar-fill" style={{ width: `${volDisplay}%` }} />
            </div>
            <div className="player-thumb" style={{ left: `${volDisplay}%` }} />
            <input
              type="range"
              className="player-range"
              min={0}
              max={100}
              value={volDisplay}
              onChange={handleVolumeChange}
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
        />
      </div>
    </>
  );
};

export default Player;