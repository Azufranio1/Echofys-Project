import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause, Music2 } from 'lucide-react';
import HeartButton from './HeartButton';

interface SongListProps {
  songs: any[];
  viewMode: 'grid' | 'list';
  animOffset?: number;
}

const SongList = ({ songs, viewMode, animOffset = 0 }: SongListProps) => {
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();

  const isActive  = (s: any) => currentSong?._id === s._id;
  const isPlaying_ = (s: any) => isActive(s) && isPlaying;

  const handlePlay = (song: any) => {
    if (currentSong?._id === song._id) togglePlay();
    else setCurrentSong(song);
  };

  if (songs.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── GRID ── */
        .sl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
          gap: 14px;
        }
        .sl-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; overflow: hidden; cursor: pointer;
          transition: all 0.22s ease; position: relative;
          animation: fadeInUp 0.35s ease both;
        }
        .sl-card:hover {
          background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.25);
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.4), 0 0 16px rgba(139,92,246,0.1);
        }
        .sl-card.active {
          background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.4);
          box-shadow: 0 0 0 1px rgba(139,92,246,0.3), 0 8px 20px rgba(109,40,217,0.2);
        }
        .sl-card-art {
          width:100%; aspect-ratio:1/1; position:relative; overflow:hidden;
          background:linear-gradient(135deg,#1a1030,#2d1a5e);
        }
        .sl-card-art img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s; }
        .sl-card:hover .sl-card-art img { transform:scale(1.05); }
        .sl-card-art-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
        .sl-card-overlay {
          position:absolute; inset:0; background:rgba(0,0,0,0.3);
          display:flex; align-items:center; justify-content:center;
          opacity:0; transition:opacity 0.2s;
        }
        .sl-card:hover .sl-card-overlay,
        .sl-card.active .sl-card-overlay { opacity:1; }
        .sl-play-btn {
          width:42px; height:42px; border-radius:50%; border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          background:linear-gradient(135deg,#9b72f5,#6d28d9); color:white;
          transition:transform 0.15s; box-shadow:0 4px 14px rgba(109,40,217,0.6);
        }
        .sl-play-btn:hover { transform:scale(1.1); }
        .sl-card-heart { position:absolute; top:7px; right:7px; }
        .sl-card-bar { position:absolute; bottom:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#7c3aed,#a78bfa); }
        .sl-card-body { padding:10px 12px 12px; }
        .sl-card-title { font-size:12px; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; }
        .sl-card.active .sl-card-title { color:#a78bfa; }
        .sl-card-artist { font-size:11px; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:7px; }
        .sl-tags { display:flex; gap:4px; flex-wrap:wrap; }
        .sl-tag {
          font-size:9px; font-weight:600; letter-spacing:0.07em;
          padding:2px 6px; border-radius:20px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
          color:rgba(255,255,255,0.35); text-transform:uppercase;
        }
        .sl-tag.genre { background:rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.2); color:#a78bfa; }

        /* ── LIST: columnas de ~320px ── */
        .sl-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 8px;
        }
        .sl-row {
          display:flex; align-items:center; gap:12px;
          padding:9px 12px; border-radius:12px; cursor:pointer;
          background:rgba(255,255,255,0.02);
          border:1px solid rgba(255,255,255,0.05);
          transition:all 0.18s; position:relative;
          animation:fadeInUp 0.3s ease both;
          min-width:0;
        }
        .sl-row:hover { background:rgba(139,92,246,0.07); border-color:rgba(139,92,246,0.2); }
        .sl-row.active { background:rgba(139,92,246,0.11); border-color:rgba(139,92,246,0.35); }
        .sl-row-bar {
          position:absolute; left:0; top:0; bottom:0; width:3px;
          background:linear-gradient(to bottom,#7c3aed,#a78bfa); border-radius:12px 0 0 12px;
        }
        .sl-row-art {
          width:48px; height:48px; border-radius:8px; flex-shrink:0; overflow:hidden;
          background:linear-gradient(135deg,#1a1030,#2d1a5e);
          border:1px solid rgba(139,92,246,0.18);
          display:flex; align-items:center; justify-content:center; position:relative;
          transition:box-shadow 0.3s;
        }
        .sl-row-art.playing { box-shadow:0 0 0 1px rgba(139,92,246,0.4), 0 0 14px rgba(139,92,246,0.3); }
        .sl-row-art img { width:100%; height:100%; object-fit:cover; }
        .sl-row-overlay {
          position:absolute; inset:0; background:rgba(0,0,0,0.5);
          display:flex; align-items:center; justify-content:center;
          opacity:0; transition:opacity 0.15s; border-radius:7px;
        }
        .sl-row:hover .sl-row-overlay { opacity:1; }
        .sl-row-play { background:none; border:none; cursor:pointer; color:white; display:flex; align-items:center; }
        .sl-row-info { flex:1; min-width:0; }
        .sl-row-title { font-size:13px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; }
        .sl-row.active .sl-row-title { color:#a78bfa; }
        .sl-row-artist { font-size:11px; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sl-row-right { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .sl-row-tags { display:flex; gap:4px; }
        .sl-row-tag {
          font-size:9px; font-weight:600; letter-spacing:0.07em;
          padding:2px 6px; border-radius:20px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
          color:rgba(255,255,255,0.35); text-transform:uppercase; white-space:nowrap;
        }
        .sl-row-tag.genre { background:rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.2); color:#a78bfa; }

        @media (max-width:640px) {
          .sl-grid { grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; }
          .sl-list { grid-template-columns:1fr; }
          .sl-row-tags { display:none; }
        }
      `}</style>

      {viewMode === 'grid' ? (
        <div className="sl-grid">
          {songs.map((song, i) => (
            <div
              key={song._id}
              className={`sl-card ${isActive(song) ? 'active' : ''}`}
              style={{ animationDelay:`${Math.min((i+animOffset)*22,300)}ms` }}
              onClick={() => handlePlay(song)}
            >
              <div className="sl-card-art">
                {song.artwork
                  ? <img src={song.artwork} alt={song.title} loading="lazy" />
                  : <div className="sl-card-art-ph"><Music2 size={32} color="rgba(139,92,246,0.35)" /></div>
                }
                <div className="sl-card-overlay">
                  <button className="sl-play-btn" onClick={e => { e.stopPropagation(); handlePlay(song); }}>
                    {isPlaying_(song) ? <Pause size={17} fill="white" /> : <Play size={17} fill="white" style={{marginLeft:2}} />}
                  </button>
                </div>
                <div className="sl-card-heart" onClick={e => e.stopPropagation()}>
                  <HeartButton songId={song._id} size={15} variant="subtle" />
                </div>
                {isActive(song) && <div className="sl-card-bar" />}
              </div>
              <div className="sl-card-body">
                <div className="sl-card-title">{song.title}</div>
                <div className="sl-card-artist">{song.artist}</div>
                <div className="sl-tags">
                  {song.genre && <span className="sl-tag genre">{song.genre}</span>}
                  {song.year  && <span className="sl-tag">{song.year}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sl-list">
          {songs.map((song, i) => (
            <div
              key={song._id}
              className={`sl-row ${isActive(song) ? 'active' : ''}`}
              style={{ animationDelay:`${Math.min((i+animOffset)*18,250)}ms` }}
              onClick={() => handlePlay(song)}
            >
              {isActive(song) && <div className="sl-row-bar" />}

              <div className={`sl-row-art ${isActive(song) ? 'playing' : ''}`}>
                {song.artwork
                  ? <img src={song.artwork} alt={song.title} loading="lazy" />
                  : <Music2 size={18} color="rgba(139,92,246,0.5)" />
                }
                <div className="sl-row-overlay">
                  <button className="sl-row-play" onClick={e => { e.stopPropagation(); handlePlay(song); }}>
                    {isPlaying_(song) ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" style={{marginLeft:2}} />}
                  </button>
                </div>
              </div>

              <div className="sl-row-info">
                <div className="sl-row-title">{song.title}</div>
                <div className="sl-row-artist">{song.artist}</div>
              </div>

              <div className="sl-row-right">
                <div className="sl-row-tags">
                  {song.genre && <span className="sl-row-tag genre">{song.genre}</span>}
                  {song.year  && <span className="sl-row-tag">{song.year}</span>}
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <HeartButton songId={song._id} size={15} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default SongList;