import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { API, authHeaders } from '../lib/api';

interface Props {
  song: any;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  volume: number;
  onClose: () => void;
  onSeek: (t: number) => void;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

interface LyricLine { time: number; text: string; }

type LyricsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'synced'; lines: LyricLine[] }
  | { status: 'plain'; text: string }
  | { status: 'none' }
  | { status: 'error' };

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const re = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  for (const line of lrc.split('\n')) {
    const m = line.match(re);
    if (!m) continue;
    const ms = +m[1] * 60_000 + +m[2] * 1_000 + +m[3].padEnd(3, '0');
    const text = m[4].trim();
    if (text) lines.push({ time: ms, text });
  }
  return lines;
}

function useActiveLine(lines: LyricLine[], currentTime: number): number {
  const ms = currentTime * 1000;
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= ms) idx = i;
    else break;
  }
  return idx;
}

function useLyrics(song: any) {
  const [state, setState] = useState<LyricsState>({ status: 'idle' });
  const lastId = useRef<string | null>(null);

  const load = useCallback(async (s: any) => {
    if (!s?._id) return;
    setState({ status: 'loading' });
    try {
      const res = await fetch(`${API.lyrics}/${s._id}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.hasSyncedLyrics && data.syncedLyrics) {
          setState({ status: 'synced', lines: parseLrc(data.syncedLyrics) });
          return;
        }
        if (data.hasPlainLyrics && data.plainLyrics) {
          setState({ status: 'plain', text: data.plainLyrics });
          return;
        }
        if (data.instrumental) { setState({ status: 'none' }); return; }
      }
      if (res.status !== 404) { setState({ status: 'none' }); return; }
      const fetchRes = await fetch(`${API.lyrics}/${s._id}/fetch`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          trackName: s.title,
          artistName: s.artist,
          albumName: s.album,
          duration: s.durationSeconds,
        }),
      });
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        if (data.hasSyncedLyrics && data.syncedLyrics) {
          setState({ status: 'synced', lines: parseLrc(data.syncedLyrics) });
          return;
        }
        if (data.hasPlainLyrics && data.plainLyrics) {
          setState({ status: 'plain', text: data.plainLyrics });
          return;
        }
      }
      setState({ status: 'none' });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    if (!song?._id) return;
    lastId.current = song._id;
    load(song);
  }, [song?._id, load]);

  return state;
}

const fmt = (t: number) => {
  if (!t || isNaN(t) || !isFinite(t)) return '0:00';
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const FullscreenPlayer = ({
  song, currentTime, duration, isMuted, volume,
  onClose, onSeek, onVolumeChange, onToggleMute, onSkipBack, onSkipForward,
}: Props) => {
  const { isPlaying, togglePlay } = usePlayerStore();
  const lyricsState = useLyrics(song);
  const activeLine = useActiveLine(
    lyricsState.status === 'synced' ? lyricsState.lines : [],
    currentTime
  );

  const activeRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prog = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volDisplay = isMuted ? 0 : volume;

  useEffect(() => {
    if (lyricsState.status !== 'synced') return;
    const el = activeRef.current;
    const container = scrollRef.current;
    if (!el || !container) return;
    container.scrollTo({
      top: el.offsetTop - container.clientHeight / 2 + el.offsetHeight / 2,
      behavior: 'smooth',
    });
  }, [activeLine, lyricsState.status]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Sora',sans-serif", overflow: 'hidden',
    }}>
      {/* Fondo */}
      <div style={{ position: 'absolute', inset: 0, background: '#07070f', zIndex: 0 }} />
      {song.artwork && (
        <div style={{
          position: 'absolute', inset: -40, zIndex: 0,
          backgroundImage: `url(${song.artwork})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(80px) brightness(0.25) saturate(2.5)',
          transform: 'scale(1.15)',
        }} />
      )}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(135deg,rgba(7,7,15,0.75) 0%,rgba(7,7,15,0.4) 50%,rgba(7,7,15,0.75) 100%)',
      }} />

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', justifyContent: 'flex-end',
        padding: '20px 28px 0', flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '50%', width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'white',
        }}>
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{
        position: 'relative', zIndex: 10,
        flex: 1, minHeight: 0,
        display: 'flex', alignItems: 'center',
        gap: 60, padding: '20px 80px',
      }}>

        {/* LEFT */}
        <div style={{
          flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 24, width: 340,
        }}>
          {/* Portada */}
          <div style={{
            width: 300, height: 300, borderRadius: 20,
            overflow: 'hidden', flexShrink: 0,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08),0 30px 80px rgba(0,0,0,0.7),0 0 60px rgba(139,92,246,0.2)',
          }}>
            {song.artwork
              ? <img src={song.artwork} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1030,#2d1a5e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Music2 size={80} color="rgba(139,92,246,0.4)" />
                </div>
            }
          </div>

          {/* Título */}
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.2 }}>
            {song.title}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: -16 }}>
            {song.artist}
          </div>

          {/* Controles */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
            {/* Botones */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <button onClick={onSkipBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', padding: 4 }}>
                <SkipBack size={26} fill="currentColor" />
              </button>
              <button onClick={togglePlay} style={{
                width: 56, height: 56, borderRadius: '50%', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg,#9b72f5,#6d28d9)', color: 'white',
                boxShadow: isPlaying ? '0 0 0 3px rgba(139,92,246,0.4),0 0 30px rgba(109,40,217,0.6)' : '0 4px 20px rgba(109,40,217,0.5)',
              }}>
                {isPlaying
                  ? <Pause size={22} fill="white" />
                  : <Play size={22} fill="white" style={{ marginLeft: 3 }} />
                }
              </button>
              <button onClick={onSkipForward} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', padding: 4 }}>
                <SkipForward size={26} fill="currentColor" />
              </button>
            </div>

            {/* Progreso */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 32, textAlign: 'center', flexShrink: 0 }}>
                {fmt(currentTime)}
              </span>
              <div style={{ flex: 1, position: 'relative', height: 4, cursor: 'pointer', borderRadius: 4 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', width: `${prog}%`, transition: 'width 0.1s linear' }} />
                </div>
                <input type="range" min={0} max={duration || 0} value={currentTime}
                  onChange={(e: any) => onSeek(Number(e.target.value))}
                  onInput={(e: any) => onSeek(Number(e.target.value))}
                  style={{ position: 'absolute', inset: '-10px 0', width: '100%', height: 'calc(100% + 20px)', opacity: 0, cursor: 'pointer' }} />
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 32, textAlign: 'center', flexShrink: 0 }}>
                {fmt(duration)}
              </span>
            </div>

            {/* Volumen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={onToggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', padding: 2 }}>
                {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <div style={{ position: 'relative', width: 80, height: 3, cursor: 'pointer', borderRadius: 4 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', width: `${volDisplay}%` }} />
                </div>
                <input type="range" min={0} max={100} value={volDisplay}
                  onChange={(e: any) => onVolumeChange(Number(e.target.value))}
                  style={{ position: 'absolute', inset: '-10px 0', width: '100%', height: 'calc(100% + 20px)', opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — letras */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
            marginBottom: 16, flexShrink: 0,
          }}>
            Letras
          </div>

          {lyricsState.status === 'loading' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.15)', borderTopColor: '#a78bfa', animation: 'spin-l 0.9s linear infinite' }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'Sora,sans-serif' }}>Buscando letras...</p>
              <style>{`@keyframes spin-l { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {lyricsState.status === 'synced' && (
            <div ref={scrollRef} style={{
              flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 8,
              maskImage: 'linear-gradient(to bottom,transparent 0%,black 6%,black 88%,transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom,transparent 0%,black 6%,black 88%,transparent 100%)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '40px 0' }}>
                {lyricsState.lines.map((line, i) => (
                  <div
                    key={i}
                    ref={i === activeLine ? activeRef : null}
                    onClick={() => onSeek(line.time / 1000)}
                    style={{
                      padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                      fontSize: i === activeLine ? 26 : 22,
                      fontWeight: 800, lineHeight: 1.4,
                      color: i === activeLine ? '#ffffff' : i < activeLine ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.18)',
                      transform: i === activeLine ? 'scale(1.02)' : 'scale(1)',
                      transformOrigin: 'left center',
                      transition: 'color 0.4s ease, transform 0.4s ease, font-size 0.25s ease',
                      textShadow: i === activeLine ? '0 0 40px rgba(167,139,250,0.7)' : 'none',
                    }}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lyricsState.status === 'plain' && (
            <div style={{
              flex: 1, overflowY: 'auto', padding: 16,
              fontSize: 16, lineHeight: 2.2, fontWeight: 500,
              color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-wrap',
              fontFamily: 'Sora,sans-serif',
            }}>
              {lyricsState.text}
            </div>
          )}

          {(lyricsState.status === 'none' || lyricsState.status === 'error') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'Sora,sans-serif' }}>
                {lyricsState.status === 'error' ? 'No se pudieron cargar' : 'Sin letras disponibles'}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.15)', fontFamily: 'Sora,sans-serif' }}>
                {lyricsState.status === 'error' ? 'Revisa tu conexión' : 'No encontramos letras para esta canción'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullscreenPlayer;