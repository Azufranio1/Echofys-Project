import { Outlet } from 'react-router-dom';
import Player from './Player';
import { Search, LogOut, Disc3 } from 'lucide-react';
import { useState } from 'react';

interface MainLayoutProps {
  onLogout: () => void;
}

const MainLayout = ({ onLogout }: MainLayoutProps) => {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');

        html, body, #root {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #080810;
        }

        .echofy-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: 'Sora', sans-serif;
          color: white;
          background: #080810;
        }

        /* HEADER */
        .echofy-header {
          flex: 0 0 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          background: rgba(10, 10, 20, 0.97);
          position: relative;
          z-index: 50;
        }
        .echofy-header::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(139,92,246,0.6) 20%,
            rgba(192,168,255,0.9) 50%,
            rgba(139,92,246,0.6) 80%,
            transparent 100%);
        }

        .echofy-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .echofy-logo-icon {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .echofy-logo-glow {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,0.55) 0%, transparent 70%);
          animation: echoPulse 3s ease-in-out infinite;
        }
        @keyframes echoPulse {
          0%,100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .echofy-logo-disc {
          color: #a78bfa;
          animation: spin 8s linear infinite;
          position: relative;
          z-index: 1;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .echofy-logo-text {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 0.28em;
          background: linear-gradient(135deg, #fff 0%, #c4b5fd 60%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .echofy-search-wrap {
          flex: 1;
          max-width: 400px;
          margin: 0 28px;
          position: relative;
        }
        .echofy-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          z-index: 1;
          transition: color 0.2s;
        }
        .echofy-search-input {
          width: 100%;
          height: 38px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 40px;
          color: white;
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          padding: 0 16px 0 40px;
          outline: none;
          transition: all 0.25s;
        }
        .echofy-search-input::placeholder { color: #4B5563; }
        .echofy-search-input:focus {
          background: rgba(139,92,246,0.1);
          border-color: rgba(139,92,246,0.55);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1), 0 0 24px rgba(139,92,246,0.18);
        }

        .echofy-logout {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 15px;
          border-radius: 40px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: #9CA3AF;
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .echofy-logout:hover {
          color: #fca5a5;
          border-color: rgba(252,165,165,0.35);
          background: rgba(252,165,165,0.07);
        }

        /* MAIN SCROLLABLE */
        .echofy-main {
          flex: 1 1 0;
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(ellipse 70% 50% at 50% -10%, rgba(88,28,220,0.22) 0%, transparent 65%),
            radial-gradient(ellipse 50% 40% at 85% 90%, rgba(109,40,217,0.12) 0%, transparent 60%),
            #080810;
        }
        .echofy-main::-webkit-scrollbar { width: 5px; }
        .echofy-main::-webkit-scrollbar-track { background: transparent; }
        .echofy-main::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.35); border-radius: 3px; }
        .echofy-main::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.6); }

        .echofy-content {
          max-width: 960px;
          margin: 0 auto;
          padding: 40px 32px;
        }

        /* PLAYER FOOTER */
        .echofy-player-footer {
          flex: 0 0 90px;
          position: relative;
          z-index: 50;
          background: #05050e;
        }
        .echofy-player-footer::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(139,92,246,0.6) 20%,
            rgba(192,168,255,0.9) 50%,
            rgba(139,92,246,0.6) 80%,
            transparent 100%);
        }
      `}</style>

      <div className="echofy-layout">
        {/* ── HEADER ── */}
        <header className="echofy-header">
          <div className="echofy-logo">
            <div className="echofy-logo-icon">
              <div className="echofy-logo-glow" />
              <Disc3 size={26} className="echofy-logo-disc" />
            </div>
            <span className="echofy-logo-text">ECHOFY</span>
          </div>

          <div className="echofy-search-wrap">
            <Search
              size={15}
              className="echofy-search-icon"
              style={{ color: searchFocused ? '#8B5CF6' : '#4B5563' }}
            />
            <input
              type="text"
              placeholder="¿Qué quieres escuchar hoy?"
              className="echofy-search-input"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>

          <button className="echofy-logout" onClick={onLogout}>
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </header>

        {/* ── CONTENIDO SCROLLEABLE ── */}
        <main className="echofy-main">
          <div className="echofy-content">
            <Outlet />
          </div>
        </main>

        {/* ── PLAYER FIJO ABAJO ── */}
        <footer className="echofy-player-footer">
          <Player />
        </footer>
      </div>
    </>
  );
};

export default MainLayout;