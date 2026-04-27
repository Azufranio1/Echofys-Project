import { useState, useEffect } from 'react';
import { ListMusic, Plus, Globe, Lock, Trash2, Edit3, Play, ChevronRight,
         X, Check, Music2, Pause, ArrowLeft } from 'lucide-react';
import { usePlaylists, type Playlist } from '../hooks/usePlaylists';
import { usePlayerStore } from '../store/usePlayerStore';
import HeartButton from '../components/HeartButton';

/* ────────────── Modal crear/editar ────────────── */
interface ModalProps {
  initial?: Playlist;
  onSave: (name: string, isPublic: boolean) => void;
  onClose: () => void;
}

const PlaylistModal = ({ initial, onSave, onClose }: ModalProps) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await onSave(name.trim(), isPublic);
    setBusy(false);
    onClose();
  };

  return (
    <>
      <style>{`
        .pm-backdrop {
          position:fixed; inset:0; z-index:500;
          background:rgba(0,0,0,0.7); backdrop-filter:blur(6px);
          display:flex; align-items:center; justify-content:center; padding:20px;
          animation: pmFade 0.2s ease;
        }
        @keyframes pmFade { from{opacity:0} to{opacity:1} }
        .pm-box {
          background:#13131f; border:1px solid rgba(139,92,246,0.25);
          border-radius:18px; width:100%; max-width:420px;
          padding:28px; box-shadow:0 24px 64px rgba(0,0,0,0.6);
          animation: pmUp 0.22s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes pmUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .pm-title { font-size:18px; font-weight:800; color:white; margin:0 0 22px; font-family:'Sora',sans-serif; }
        .pm-label { font-size:11px; font-weight:700; letter-spacing:0.12em; color:rgba(255,255,255,0.4); text-transform:uppercase; margin-bottom:7px; font-family:'Sora',sans-serif; }
        .pm-input {
          width:100%; padding:11px 14px; border-radius:10px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          color:white; font-family:'Sora',sans-serif; font-size:14px; outline:none;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .pm-input:focus { border-color:rgba(139,92,246,0.6); box-shadow:0 0 0 3px rgba(139,92,246,0.12); }
        .pm-toggle-row { display:flex; align-items:center; gap:12px; margin:18px 0 24px; }
        .pm-toggle-btn {
          display:flex; align-items:center; gap:8px; padding:9px 16px;
          border-radius:10px; border:1px solid rgba(255,255,255,0.08);
          background:rgba(255,255,255,0.04); cursor:pointer; transition:all 0.2s;
          flex:1; justify-content:center;
          font-family:'Sora',sans-serif; font-size:12px; font-weight:600; color:rgba(255,255,255,0.5);
        }
        .pm-toggle-btn.selected { background:rgba(139,92,246,0.15); border-color:rgba(139,92,246,0.4); color:#a78bfa; }
        .pm-actions { display:flex; gap:10px; }
        .pm-btn-cancel {
          flex:1; padding:11px; border-radius:10px; border:1px solid rgba(255,255,255,0.1);
          background:transparent; color:rgba(255,255,255,0.5); font-family:'Sora',sans-serif;
          font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s;
        }
        .pm-btn-cancel:hover { background:rgba(255,255,255,0.06); color:white; }
        .pm-btn-save {
          flex:2; padding:11px; border-radius:10px; border:none;
          background:linear-gradient(135deg,#9b72f5,#6d28d9);
          color:white; font-family:'Sora',sans-serif; font-size:13px; font-weight:700;
          cursor:pointer; transition:all 0.2s;
          box-shadow:0 4px 14px rgba(109,40,217,0.4);
        }
        .pm-btn-save:hover { transform:scale(1.02); }
        .pm-btn-save:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
      `}</style>

      <div className="pm-backdrop" onClick={onClose}>
        <div className="pm-box" onClick={e => e.stopPropagation()}>
          <p className="pm-title">{initial ? 'Editar playlist' : 'Nueva playlist'}</p>

          <div className="pm-label">Nombre</div>
          <input
            autoFocus
            className="pm-input"
            placeholder="Mi playlist favorita..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            maxLength={100}
          />

          <div className="pm-toggle-row">
            <button className={`pm-toggle-btn ${!isPublic ? 'selected' : ''}`} onClick={() => setIsPublic(false)}>
              <Lock size={14} /> Privada
            </button>
            <button className={`pm-toggle-btn ${isPublic ? 'selected' : ''}`} onClick={() => setIsPublic(true)}>
              <Globe size={14} /> Pública
            </button>
          </div>

          <div className="pm-actions">
            <button className="pm-btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="pm-btn-save" onClick={handleSubmit} disabled={busy || !name.trim()}>
              {busy ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear playlist'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ────────────── Vista detalle playlist ────────────── */
interface DetailProps {
  playlist: Playlist;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  removeSong: (plId: string, songId: string) => void;
  allSongs: any[];
}

const PlaylistDetail = ({ playlist, onBack, onEdit, onDelete, removeSong, allSongs }: DetailProps) => {
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();
  const songs = allSongs.filter(s => playlist.songs.includes(s._id));

  const handlePlay = (song: any) => {
    if (currentSong?._id === song._id) togglePlay();
    else setCurrentSong(song);
  };

  const isActive  = (s: any) => currentSong?._id === s._id;
  const isPlay_   = (s: any) => isActive(s) && isPlaying;

  return (
    <>
      <style>{`
        .pd-header { display:flex; align-items:flex-start; gap:24px; margin-bottom:32px; }
        .pd-cover {
          width:160px; height:160px; border-radius:16px; flex-shrink:0;
          background:linear-gradient(135deg,#1a1030,#3b1f6e);
          border:1px solid rgba(139,92,246,0.25);
          display:flex; align-items:center; justify-content:center;
          overflow:hidden; position:relative;
          box-shadow:0 16px 40px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.15);
        }
        .pd-cover-grid { display:grid; grid-template-columns:1fr 1fr; width:100%; height:100%; }
        .pd-cover-grid img { width:100%; height:100%; object-fit:cover; }
        .pd-info { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:flex-end; padding-bottom:4px; }
        .pd-type { font-size:10px; font-weight:700; letter-spacing:0.2em; color:rgba(255,255,255,0.35); text-transform:uppercase; margin-bottom:8px; font-family:'Sora',sans-serif; }
        .pd-name { font-size:32px; font-weight:800; color:white; margin:0 0 8px; font-family:'Sora',sans-serif; line-height:1.15; }
        .pd-meta { font-size:12px; color:rgba(255,255,255,0.4); margin-bottom:18px; font-family:'Sora',sans-serif; display:flex; align-items:center; gap:8px; }
        .pd-actions { display:flex; gap:10px; }
        .pd-action-btn {
          display:flex; align-items:center; gap:7px; padding:8px 16px;
          border-radius:40px; border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.6);
          font-family:'Sora',sans-serif; font-size:12px; font-weight:600;
          cursor:pointer; transition:all 0.2s;
        }
        .pd-action-btn:hover { background:rgba(255,255,255,0.1); color:white; }
        .pd-action-btn.danger:hover { color:#fca5a5; border-color:rgba(252,165,165,0.3); background:rgba(252,165,165,0.07); }

        .pd-songs-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:0 0 10px; border-bottom:1px solid rgba(255,255,255,0.06); margin-bottom:8px;
        }
        .pd-songs-label { font-size:11px; font-weight:700; letter-spacing:0.15em; color:rgba(255,255,255,0.3); text-transform:uppercase; font-family:'Sora',sans-serif; }

        .pd-song-row {
          display:flex; align-items:center; gap:12px;
          padding:9px 10px; border-radius:10px; cursor:pointer;
          transition:background 0.15s; position:relative; group:true;
        }
        .pd-song-row:hover { background:rgba(255,255,255,0.04); }
        .pd-song-row.active { background:rgba(139,92,246,0.1); }
        .pd-song-num { width:20px; font-size:11px; color:rgba(255,255,255,0.3); text-align:center; flex-shrink:0; font-family:'Sora',sans-serif; }
        .pd-song-row.active .pd-song-num { color:#a78bfa; }
        .pd-song-art {
          width:40px; height:40px; border-radius:7px; flex-shrink:0; overflow:hidden;
          background:linear-gradient(135deg,#1a1030,#2d1a5e);
          display:flex; align-items:center; justify-content:center;
        }
        .pd-song-art img { width:100%; height:100%; object-fit:cover; }
        .pd-song-info { flex:1; min-width:0; }
        .pd-song-title { font-size:13px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; font-family:'Sora',sans-serif; }
        .pd-song-row.active .pd-song-title { color:#a78bfa; }
        .pd-song-artist { font-size:11px; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Sora',sans-serif; }
        .pd-song-actions { display:flex; align-items:center; gap:6px; opacity:0; transition:opacity 0.15s; }
        .pd-song-row:hover .pd-song-actions { opacity:1; }
        .pd-remove-btn {
          background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.3);
          display:flex; align-items:center; padding:4px; border-radius:6px; transition:color 0.15s;
        }
        .pd-remove-btn:hover { color:#fca5a5; }

        .pd-empty { display:flex; flex-direction:column; align-items:center; padding:48px 0; gap:12px; }
        .pd-empty-text { font-size:14px; color:rgba(255,255,255,0.35); font-family:'Sora',sans-serif; }
      `}</style>

      {/* Portada collage con primeras 4 canciones */}
      <div className="pd-header">
        <div className="pd-cover">
          {songs.length >= 4 ? (
            <div className="pd-cover-grid">
              {songs.slice(0,4).map(s => s.artwork
                ? <img key={s._id} src={s.artwork} alt={s.title} />
                : <div key={s._id} style={{background:'#2d1a5e',display:'flex',alignItems:'center',justifyContent:'center'}}><Music2 size={20} color="rgba(139,92,246,0.4)"/></div>
              )}
            </div>
          ) : songs[0]?.artwork ? (
            <img src={songs[0].artwork} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
          ) : (
            <ListMusic size={52} color="rgba(139,92,246,0.4)" />
          )}
        </div>

        <div className="pd-info">
          <div className="pd-type">Playlist</div>
          <h1 className="pd-name">{playlist.name}</h1>
          <div className="pd-meta">
            {playlist.isPublic ? <><Globe size={12}/> Pública</> : <><Lock size={12}/> Privada</>}
            <span>·</span>
            <span>{playlist.songs.length} canciones</span>
          </div>
          <div className="pd-actions">
            <button className="pd-action-btn" onClick={onEdit}><Edit3 size={13}/> Editar</button>
            <button className="pd-action-btn danger" onClick={onDelete}><Trash2 size={13}/> Eliminar</button>
          </div>
        </div>
      </div>

      {/* Lista de canciones */}
      <div className="pd-songs-header">
        <span className="pd-songs-label">Canciones</span>
      </div>

      {songs.length === 0 ? (
        <div className="pd-empty">
          <Music2 size={36} color="rgba(139,92,246,0.25)" />
          <p className="pd-empty-text">Esta playlist está vacía — añade canciones desde el botón <strong>⊕</strong> en cualquier canción</p>
        </div>
      ) : (
        songs.map((song, i) => (
          <div key={song._id} className={`pd-song-row ${isActive(song) ? 'active' : ''}`} onClick={() => handlePlay(song)}>
            <span className="pd-song-num">{isPlay_(song) ? '▶' : i + 1}</span>
            <div className="pd-song-art">
              {song.artwork ? <img src={song.artwork} alt={song.title} /> : <Music2 size={16} color="rgba(139,92,246,0.5)"/>}
            </div>
            <div className="pd-song-info">
              <div className="pd-song-title">{song.title}</div>
              <div className="pd-song-artist">{song.artist}</div>
            </div>
            <div className="pd-song-actions" onClick={e => e.stopPropagation()}>
              <HeartButton songId={song._id} size={14} />
              <button className="pd-remove-btn" title="Quitar de playlist" onClick={() => removeSong(playlist._id, song._id)}>
                <X size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
};

/* ────────────── Página principal ────────────── */
const PlaylistsPage = () => {
  const { playlists, loading, create, update, remove, removeSong } = usePlaylists();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [detail, setDetail] = useState<Playlist | null>(null);
  const [allSongs, setAllSongs] = useState<any[]>([]);

  // Cargar canciones para el detalle
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8080/api/songs', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setAllSongs(Array.isArray(data) ? data : []);
      } catch {}
    };
    fetch_();
  }, []);

  // Mantener detalle sincronizado con playlists
  useEffect(() => {
    if (detail) {
      const updated = playlists.find(p => p._id === detail._id);
      if (updated) setDetail(updated);
      else setDetail(null);
    }
  }, [playlists]);

  const handleCreate = async (name: string, isPublic: boolean) => {
    await create(name, isPublic);
  };

  const handleEdit = async (name: string, isPublic: boolean) => {
    if (!selected) return;
    await update(selected._id, { name, isPublic });
  };

  const handleDelete = async (pl: Playlist) => {
    if (!confirm(`¿Eliminar "${pl.name}"?`)) return;
    await remove(pl._id);
    if (detail?._id === pl._id) setDetail(null);
  };

  return (
    <>
      <style>{`
        .plp-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
        .plp-title-row { display:flex; align-items:center; gap:10px; }
        .plp-title-icon {
          width:36px; height:36px; border-radius:10px;
          background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.25);
          display:flex; align-items:center; justify-content:center;
        }
        .plp-title { font-size:22px; font-weight:800; color:white; margin:0; font-family:'Sora',sans-serif; }
        .plp-new-btn {
          display:flex; align-items:center; gap:7px; padding:9px 18px;
          border-radius:40px; border:none;
          background:linear-gradient(135deg,#9b72f5,#6d28d9);
          color:white; font-family:'Sora',sans-serif; font-size:13px; font-weight:600;
          cursor:pointer; transition:all 0.2s;
          box-shadow:0 4px 14px rgba(109,40,217,0.4);
        }
        .plp-new-btn:hover { transform:scale(1.03); box-shadow:0 6px 20px rgba(109,40,217,0.5); }

        .plp-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill, minmax(190px, 1fr));
          gap:14px;
        }

        .plp-card {
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.06);
          border-radius:14px; overflow:hidden; cursor:pointer;
          transition:all 0.22s; position:relative;
          animation:fadeInUp 0.35s ease both;
        }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .plp-card:hover {
          background:rgba(139,92,246,0.08); border-color:rgba(139,92,246,0.25);
          transform:translateY(-3px);
          box-shadow:0 10px 28px rgba(0,0,0,0.4), 0 0 16px rgba(139,92,246,0.1);
        }
        .plp-card-cover {
          width:100%; aspect-ratio:1/1; position:relative;
          background:linear-gradient(135deg,#1a1030,#3b1f6e);
          display:flex; align-items:center; justify-content:center; overflow:hidden;
        }
        .plp-card-cover-grid { display:grid; grid-template-columns:1fr 1fr; width:100%; height:100%; }
        .plp-card-cover-grid img { width:100%; height:100%; object-fit:cover; }
        .plp-card-play-overlay {
          position:absolute; inset:0; background:rgba(0,0,0,0.3);
          display:flex; align-items:center; justify-content:center;
          opacity:0; transition:opacity 0.2s;
        }
        .plp-card:hover .plp-card-play-overlay { opacity:1; }
        .plp-card-play-btn {
          width:44px; height:44px; border-radius:50%; border:none; cursor:pointer;
          background:linear-gradient(135deg,#9b72f5,#6d28d9); color:white;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 14px rgba(109,40,217,0.6); transition:transform 0.15s;
        }
        .plp-card-play-btn:hover { transform:scale(1.1); }
        .plp-card-badge {
          position:absolute; top:8px; right:8px;
          background:rgba(0,0,0,0.55); backdrop-filter:blur(4px);
          border-radius:6px; padding:3px 7px;
          display:flex; align-items:center; gap:4px;
          font-size:9px; font-weight:700; color:rgba(255,255,255,0.7);
          font-family:'Sora',sans-serif; letter-spacing:0.05em;
        }

        .plp-card-body { padding:12px 14px 14px; }
        .plp-card-name { font-size:13px; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; font-family:'Sora',sans-serif; }
        .plp-card-count { font-size:11px; color:rgba(255,255,255,0.35); font-family:'Sora',sans-serif; margin-bottom:10px; }
        .plp-card-actions { display:flex; gap:6px; }
        .plp-card-btn {
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
          border-radius:7px; padding:5px 9px; cursor:pointer; color:rgba(255,255,255,0.45);
          display:flex; align-items:center; gap:5px;
          font-family:'Sora',sans-serif; font-size:11px; font-weight:500;
          transition:all 0.15s;
        }
        .plp-card-btn:hover { background:rgba(255,255,255,0.1); color:white; }
        .plp-card-btn.del:hover { background:rgba(252,165,165,0.1); border-color:rgba(252,165,165,0.25); color:#fca5a5; }

        .plp-empty { display:flex; flex-direction:column; align-items:center; padding-top:80px; gap:14px; text-align:center; }
        .plp-empty-icon {
          width:72px; height:72px; border-radius:20px;
          background:rgba(139,92,246,0.07); border:1px solid rgba(139,92,246,0.15);
          display:flex; align-items:center; justify-content:center;
        }
        .plp-empty-title { font-size:16px; font-weight:700; color:rgba(255,255,255,0.5); margin:0; font-family:'Sora',sans-serif; }
        .plp-empty-sub   { font-size:13px; color:rgba(255,255,255,0.25); margin:0; font-family:'Sora',sans-serif; }

        .plp-back-btn {
          display:flex; align-items:center; gap:6px; margin-bottom:24px;
          background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.45);
          font-family:'Sora',sans-serif; font-size:13px; font-weight:500;
          transition:color 0.15s; padding:0;
        }
        .plp-back-btn:hover { color:white; }

        @media(max-width:640px) {
          .plp-grid { grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); }
          .pd-header { flex-direction:column; }
          .pd-cover { width:100%; height:auto; aspect-ratio:1/1; }
        }
      `}</style>

      {/* MODALES */}
      {modal === 'create' && (
        <PlaylistModal onSave={handleCreate} onClose={() => setModal(null)} />
      )}
      {modal === 'edit' && selected && (
        <PlaylistModal initial={selected} onSave={handleEdit} onClose={() => { setModal(null); setSelected(null); }} />
      )}

      {/* VISTA DETALLE */}
      {detail ? (
        <>
          <button className="plp-back-btn" onClick={() => setDetail(null)}>
            <ArrowLeft size={16} /> Mis playlists
          </button>
          <PlaylistDetail
            playlist={detail}
            onBack={() => setDetail(null)}
            onEdit={() => { setSelected(detail); setModal('edit'); }}
            onDelete={() => handleDelete(detail)}
            removeSong={removeSong}
            allSongs={allSongs}
          />
        </>
      ) : (
        <>
          {/* TOOLBAR */}
          <div className="plp-toolbar">
            <div className="plp-title-row">
              <div className="plp-title-icon"><ListMusic size={18} color="#a78bfa" /></div>
              <h2 className="plp-title">Mis playlists</h2>
            </div>
            <button className="plp-new-btn" onClick={() => setModal('create')}>
              <Plus size={15} /> Nueva playlist
            </button>
          </div>

          {/* LOADING */}
          {loading && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'40vh'}}>
              <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(139,92,246,0.15)',borderTopColor:'#8B5CF6',animation:'spin-l 0.8s linear infinite'}}/>
              <style>{`@keyframes spin-l{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* EMPTY */}
          {!loading && playlists.length === 0 && (
            <div className="plp-empty">
              <div className="plp-empty-icon"><ListMusic size={32} color="rgba(139,92,246,0.4)" /></div>
              <p className="plp-empty-title">No tienes playlists aún</p>
              <p className="plp-empty-sub">Crea tu primera playlist con el botón de arriba</p>
            </div>
          )}

          {/* GRID DE PLAYLISTS */}
          {!loading && playlists.length > 0 && (
            <div className="plp-grid">
              {playlists.map((pl, i) => {
                const songs = allSongs.filter(s => pl.songs.includes(s._id));
                const covers = songs.filter(s => s.artwork).slice(0, 4);
                return (
                  <div key={pl._id} className="plp-card" style={{ animationDelay:`${i*30}ms` }}
                    onClick={() => setDetail(pl)}>
                    <div className="plp-card-cover">
                      {covers.length >= 4 ? (
                        <div className="plp-card-cover-grid">
                          {covers.map(s => <img key={s._id} src={s.artwork} alt="" />)}
                        </div>
                      ) : covers[0] ? (
                        <img src={covers[0].artwork} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                      ) : (
                        <ListMusic size={40} color="rgba(139,92,246,0.35)" />
                      )}
                      <div className="plp-card-play-overlay">
                        <button className="plp-card-play-btn" onClick={e => { e.stopPropagation(); setDetail(pl); }}>
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      <div className="plp-card-badge">
                        {pl.isPublic ? <><Globe size={9}/> Pública</> : <><Lock size={9}/> Privada</>}
                      </div>
                    </div>
                    <div className="plp-card-body">
                      <div className="plp-card-name">{pl.name}</div>
                      <div className="plp-card-count">{pl.songs.length} canciones</div>
                      <div className="plp-card-actions" onClick={e => e.stopPropagation()}>
                        <button className="plp-card-btn" onClick={() => { setSelected(pl); setModal('edit'); }}>
                          <Edit3 size={11}/> Editar
                        </button>
                        <button className="plp-card-btn del" onClick={() => handleDelete(pl)}>
                          <Trash2 size={11}/> Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default PlaylistsPage;