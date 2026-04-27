import React, { useState, useRef, useEffect } from 'react';
import { ListPlus, Check, Plus, Lock, Globe, Loader2 } from 'lucide-react';
import { usePlaylists } from '../hooks/usePlaylists';

interface Props {
  songId: string;
  size?: number;
}

const AddToPlaylistButton = ({ songId, size = 16 }: Props) => {
  const { playlists, hasSong, addSong, removeSong, loading } = usePlaylists();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = async (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    setBusy(playlistId);
    if (hasSong(playlistId, songId)) {
      await removeSong(playlistId, songId);
    } else {
      await addSong(playlistId, songId);
    }
    setBusy(null);
  };

  return (
    <>
      <style>{`
        .atp-wrap { position: relative; display: inline-flex; }
        .atp-btn {
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #6B7280; padding: 4px; border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .atp-btn:hover { color: #a78bfa; background: rgba(139,92,246,0.1); }
        .atp-btn.active { color: #a78bfa; }

        .atp-dropdown {
          position: absolute; bottom: calc(100% + 8px); right: 0;
          min-width: 210px; z-index: 300;
          background: #1a1a2e;
          border: 1px solid rgba(139,92,246,0.25);
          border-radius: 12px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1);
          overflow: hidden;
          animation: dropIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        @keyframes dropIn {
          from { opacity:0; transform:translateY(8px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }

        .atp-header {
          padding: 10px 14px 8px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.15em;
          color: rgba(255,255,255,0.3); text-transform: uppercase;
          font-family: 'Sora', sans-serif;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .atp-list { max-height: 200px; overflow-y: auto; padding: 6px; }
        .atp-list::-webkit-scrollbar { width: 3px; }
        .atp-list::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 2px; }

        .atp-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px; cursor: pointer;
          transition: background 0.15s; border: none; background: none;
          width: 100%; text-align: left;
        }
        .atp-item:hover { background: rgba(139,92,246,0.1); }
        .atp-item.in-playlist { background: rgba(139,92,246,0.08); }

        .atp-item-icon {
          width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
        }
        .atp-item.in-playlist .atp-item-icon {
          background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.3);
        }

        .atp-item-info { flex: 1; min-width: 0; }
        .atp-item-name {
          font-size: 12px; font-weight: 600; color: white;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          font-family: 'Sora', sans-serif;
        }
        .atp-item.in-playlist .atp-item-name { color: #a78bfa; }
        .atp-item-meta {
          font-size: 10px; color: rgba(255,255,255,0.3);
          display: flex; align-items: center; gap: 3px; margin-top: 1px;
          font-family: 'Sora', sans-serif;
        }

        .atp-check { color: #a78bfa; flex-shrink: 0; }

        .atp-empty {
          padding: 16px; text-align: center;
          font-size: 12px; color: rgba(255,255,255,0.3);
          font-family: 'Sora', sans-serif;
        }
      `}</style>

      <div className="atp-wrap" ref={ref}>
        <button
          className={`atp-btn ${open ? 'active' : ''}`}
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          title="Añadir a playlist"
        >
          <ListPlus size={size} />
        </button>

        {open && (
          <div className="atp-dropdown">
            <div className="atp-header">Añadir a playlist</div>

            <div className="atp-list">
              {loading && (
                <div className="atp-empty">
                  <Loader2 size={16} style={{ animation:'spin-l 0.8s linear infinite', display:'inline' }} />
                </div>
              )}

              {!loading && playlists.length === 0 && (
                <div className="atp-empty">No tienes playlists aún</div>
              )}

              {!loading && playlists.map(pl => {
                const inList = hasSong(pl._id, songId);
                const isBusy = busy === pl._id;
                return (
                  <button
                    key={pl._id}
                    className={`atp-item ${inList ? 'in-playlist' : ''}`}
                    onClick={e => toggle(e, pl._id)}
                    disabled={isBusy}
                  >
                    <div className="atp-item-icon">
                      {isBusy
                        ? <Loader2 size={13} color="#a78bfa" style={{ animation:'spin-l 0.6s linear infinite' }} />
                        : inList
                          ? <Check size={13} color="#a78bfa" />
                          : <Plus size={13} color="rgba(255,255,255,0.4)" />
                      }
                    </div>
                    <div className="atp-item-info">
                      <div className="atp-item-name">{pl.name}</div>
                      <div className="atp-item-meta">
                        {pl.isPublic
                          ? <><Globe size={9} /> Pública · {pl.songs.length} canciones</>
                          : <><Lock size={9} /> Privada · {pl.songs.length} canciones</>
                        }
                      </div>
                    </div>
                    {inList && <Check size={14} className="atp-check" />}
                  </button>
                );
              })}
            </div>
            <style>{`@keyframes spin-l { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </>
  );
};

export default AddToPlaylistButton;