import { Outlet, useOutletContext, NavLink, useNavigate } from 'react-router-dom';
import Player from './Player';
import { Search, LogOut, Disc3, Home, Heart, ListMusic, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface MainLayoutProps {
  onLogout: () => void;
}

export type SearchContextType = { searchQuery: string };

const NAV_ITEMS = [
  { to: '/',          icon: Home,      label: 'Inicio' },
  { to: '/favorites', icon: Heart,     label: 'Favoritos' },
  { to: '/playlists', icon: ListMusic, label: 'Playlists' },
];

const MainLayout = ({ onLogout }: MainLayoutProps) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        html, body, #root {
          height: 100%; margin: 0; padding: 0;
          overflow: hidden; background: #080810;
        }

        .echofy-shell {
          display: flex;
          flex-direction: column;
          height: 100dvh;
          width: 100vw;
          font-family: 'Sora', sans-serif;
          color: white;
          background: #080810;
          position: fixed;
          top: 0; left: 0;
        }

        /* ── HEADER ── */
        .echofy-header {
          flex: 0 0 auto;
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          background: rgba(8,8,18,0.98);
          position: relative;
          z-index: 60;
        }
        .echofy-header::after {
          content: '';
          position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg,
            transparent 0%, rgba(139,92,246,0.5) 20%,
            rgba(192,168,255,0.85) 50%, rgba(139,92,246,0.5) 80%, transparent 100%);
        }

        .echofy-logo { display: flex; align-items: center; gap: 9px; flex-shrink: 0; cursor: pointer; }
        .echofy-logo-icon { position: relative; display: flex; align-items: center; justify-content: center; }
        .echofy-logo-glow {
          position: absolute; inset: -6px; border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,0.55) 0%, transparent 70%);
          animation: echoPulse 3s ease-in-out infinite;
        }
        @keyframes echoPulse { 0%,100% { opacity:0.4; transform:scale(0.9); } 50% { opacity:1; transform:scale(1.2); } }
        .echofy-logo-disc { color: #a78bfa; animation: spin 8s linear infinite; position: relative; z-index: 1; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .echofy-logo-text {
          font-size: 16px; font-weight: 800; letter-spacing: 0.28em;
          background: linear-gradient(135deg, #fff 0%, #c4b5fd 60%, #a78bfa 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .echofy-search-wrap { flex: 1; max-width: 400px; margin: 0 20px; position: relative; }
        .echofy-search-icon {
          position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
          pointer-events: none; z-index: 1; transition: color 0.2s;
        }
        .echofy-search-input {
          width: 100%; height: 36px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 40px; color: white;
          font-family: 'Sora', sans-serif; font-size: 13px;
          padding: 0 16px 0 38px; outline: none; transition: all 0.25s;
        }
        .echofy-search-input::placeholder { color: #4B5563; }
        .echofy-search-input:focus {
          background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.55);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .echofy-logout {
          flex-shrink: 0; display: flex; align-items: center; gap: 7px;
          padding: 7px 14px; border-radius: 40px; background: transparent;
          border: 1px solid rgba(255,255,255,0.08); color: #9CA3AF;
          font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
        }
        .echofy-logout:hover { color: #fca5a5; border-color: rgba(252,165,165,0.35); background: rgba(252,165,165,0.07); }

        /* ── BODY (sidebar + main) ── */
        .echofy-body {
          flex: 1 1 0;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }

        /* ── SIDEBAR ── */
        .echofy-sidebar {
          flex-shrink: 0;
          width: ${sidebarOpen ? '220px' : '64px'};
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
          background: rgba(6,6,16,0.95);
          border-right: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          z-index: 40;
        }

        .sidebar-nav { flex: 1; padding: 16px 10px; display: flex; flex-direction: column; gap: 4px; }

        .sidebar-link {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 10px;
          color: rgba(255,255,255,0.45); text-decoration: none;
          font-size: 13px; font-weight: 500;
          transition: all 0.18s; white-space: nowrap; overflow: hidden;
          border: 1px solid transparent;
        }
        .sidebar-link:hover { color: white; background: rgba(255,255,255,0.06); }
        .sidebar-link.active {
          color: #a78bfa; background: rgba(139,92,246,0.12);
          border-color: rgba(139,92,246,0.2);
        }
        .sidebar-link-icon { flex-shrink: 0; }
        .sidebar-link-label {
          opacity: ${sidebarOpen ? '1' : '0'};
          transition: opacity 0.15s;
          pointer-events: ${sidebarOpen ? 'auto' : 'none'};
        }

        .sidebar-toggle {
          margin: 0 10px 16px;
          display: flex; align-items: center; justify-content: ${sidebarOpen ? 'flex-end' : 'center'};
          padding: 8px;
        }
        .sidebar-toggle-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(255,255,255,0.4);
          transition: all 0.2s; flex-shrink: 0;
        }
        .sidebar-toggle-btn:hover { color: white; background: rgba(255,255,255,0.1); }

        /* ── MAIN ── */
        .echofy-main {
          flex: 1 1 0;
          min-width: 0;
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(ellipse 70% 50% at 50% -10%, rgba(88,28,220,0.18) 0%, transparent 65%),
            radial-gradient(ellipse 50% 40% at 85% 90%, rgba(109,40,217,0.1) 0%, transparent 60%),
            #080810;
        }
        .echofy-main::-webkit-scrollbar { width: 5px; }
        .echofy-main::-webkit-scrollbar-track { background: transparent; }
        .echofy-main::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.35); border-radius: 3px; }

        .echofy-content { width: 100%; padding: 32px 36px; }

        /* ── PLAYER FOOTER ── */
        .echofy-player-footer {
          flex: 0 0 auto; height: 90px; position: relative; z-index: 60; background: #05050e;
        }
        .echofy-player-footer::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg,
            transparent 0%, rgba(139,92,246,0.6) 20%,
            rgba(192,168,255,0.9) 50%, rgba(139,92,246,0.6) 80%, transparent 100%);
        }

        /* ── RESPONSIVE MOBILE ── */
        @media (max-width: 640px) {
          .echofy-header { padding: 0 14px; }
          .echofy-logo-text { display: none; }
          .echofy-search-wrap { margin: 0 10px; }
          .echofy-logout span { display: none; }
          .echofy-logout { padding: 7px 10px; }
          .echofy-sidebar {
            position: fixed !important;
            bottom: 90px; left: 0; right: 0;
            width: 100% !important;
            height: 56px;
            flex-direction: row;
            border-right: none;
            border-top: 1px solid rgba(255,255,255,0.06);
            z-index: 55;
          }
          .sidebar-nav {
            flex-direction: row;
            padding: 0;
            width: 100%;
            justify-content: space-around;
            align-items: center;
            gap: 0;
          }
          .sidebar-link {
            flex-direction: column; gap: 3px;
            padding: 8px 16px; font-size: 10px;
            flex: 1; justify-content: center; align-items: center;
            border-radius: 0; border: none;
          }
          .sidebar-link-label { opacity: 1 !important; pointer-events: auto !important; }
          .sidebar-toggle { display: none; }
          .echofy-body { padding-bottom: 56px; }
          .echofy-content { padding: 20px 16px; }
          .echofy-player-footer { height: 72px; }
        }
      `}</style>

      <div className="echofy-shell">
        {/* HEADER */}
        <header className="echofy-header">
          <div className="echofy-logo" onClick={() => navigate('/')}>
            <div className="echofy-logo-icon">
              <div className="echofy-logo-glow" />
              <Disc3 size={24} className="echofy-logo-disc" />
            </div>
            <span className="echofy-logo-text">ECHOFY</span>
          </div>

          <div className="echofy-search-wrap">
            <Search size={14} className="echofy-search-icon"
              style={{ color: searchFocused ? '#8B5CF6' : '#4B5563' }} />
            <input
              type="text"
              placeholder="¿Qué quieres escuchar hoy?"
              className="echofy-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>

          <button className="echofy-logout" onClick={onLogout}>
            <LogOut size={14} />
            <span>Cerrar sesión</span>
          </button>
        </header>

        {/* BODY */}
        <div className="echofy-body">
          {/* SIDEBAR */}
          <aside className="echofy-sidebar">
            <nav className="sidebar-nav">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <Icon size={18} className="sidebar-link-icon" />
                  <span className="sidebar-link-label">{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="sidebar-toggle">
              <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="echofy-main">
            <div className="echofy-content">
              <Outlet context={{ searchQuery } satisfies SearchContextType} />
            </div>
          </main>
        </div>

        {/* PLAYER */}
        <footer className="echofy-player-footer">
          <Player />
        </footer>
      </div>
    </>
  );
};

export default MainLayout;