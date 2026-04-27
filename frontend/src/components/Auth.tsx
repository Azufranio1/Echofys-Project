import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, User, ArrowRight, Disc3 } from 'lucide-react';

const Auth = ({ onLoginSuccess }: { onLoginSuccess: (token: string) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Partículas de audio visualizer en el canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Barras de visualizador tipo espectro
    const bars = Array.from({ length: 60 }, (_, i) => ({
      x: 0, height: 0, target: Math.random() * 120 + 20,
      speed: Math.random() * 0.03 + 0.01,
      hue: 260 + i * 1.5,
    }));

    let t = 0;
    const draw = () => {
      t += 0.012;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const spacing = canvas.width / bars.length;
      bars.forEach((bar, i) => {
        bar.target = (Math.sin(t + i * 0.3) * 0.5 + 0.5) * 130 + 15;
        bar.height += (bar.target - bar.height) * bar.speed;
        bar.x = i * spacing + spacing / 2;

        const alpha = 0.12 + (bar.height / 145) * 0.18;
        const grad = ctx.createLinearGradient(bar.x, canvas.height, bar.x, canvas.height - bar.height);
        grad.addColorStop(0, `hsla(${bar.hue}, 80%, 65%, ${alpha})`);
        grad.addColorStop(1, `hsla(${bar.hue + 30}, 90%, 75%, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(bar.x - spacing * 0.3, canvas.height - bar.height, spacing * 0.6, bar.height, 4);
        ctx.fill();

        // Espejo arriba
        const gradTop = ctx.createLinearGradient(bar.x, 0, bar.x, bar.height * 0.4);
        gradTop.addColorStop(0, `hsla(${bar.hue}, 80%, 65%, ${alpha * 0.5})`);
        gradTop.addColorStop(1, `hsla(${bar.hue}, 80%, 65%, 0)`);
        ctx.fillStyle = gradTop;
        ctx.beginPath();
        ctx.roundRect(bar.x - spacing * 0.3, 0, spacing * 0.6, bar.height * 0.4, 4);
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !formData.username.trim()) {
      setError('El nombre de usuario es obligatorio para registrarse');
      return; // Detenemos la ejecución aquí
    }
    setError('');
    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          username: formData.username,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.token);
          onLoginSuccess(data.token);
        } else {
          setIsLogin(true);
          setError('');
          setFormData({ email: formData.email, username: '', password: '' });
        }
      } else {
        setError(data.error || 'Algo salió mal');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ email: '', username: '', password: '' });
  };

  return (
    <div style={s.root}>
      {/* Canvas visualizador */}
      <canvas ref={canvasRef} style={s.canvas} />

      {/* Glow orbs de fondo */}
      <div style={s.orb1} />
      <div style={s.orb2} />

      {/* Contenido centrado */}
      <div style={s.center}>

        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoDisc}>
            <Disc3 size={28} color="#a78bfa" style={{ animation: 'spin 8s linear infinite' }} />
          </div>
          <span style={s.logoText}>ECHOFY</span>
        </div>

        {/* Tagline */}
        <p style={s.tagline}>
          {isLogin ? 'Tu música. Tu mundo.' : 'Empieza a escuchar.'}
        </p>

        {/* Card */}
        <div style={s.card}>

          {/* Tabs login / registro */}
          <div style={s.tabs}>
            <button
              style={{ ...s.tab, ...(isLogin ? s.tabActive : {}) }}
              onClick={() => !isLogin && switchMode()}
            >
              Iniciar sesión
            </button>
            <button
              style={{ ...s.tab, ...(!isLogin ? s.tabActive : {}) }}
              onClick={() => isLogin && switchMode()}
            >
              Registrarse
            </button>
            {/* Indicador deslizable */}
            <div style={{ ...s.tabIndicator, left: isLogin ? '4px' : 'calc(50% + 2px)' }} />
          </div>

          <form onSubmit={handleSubmit} style={s.form}>

            {/* Campo username (solo registro) */}
            <div style={{
              ...s.fieldWrap,
              maxHeight: isLogin ? '0' : '80px',
              opacity: isLogin ? 0 : 1,
              overflow: 'hidden',
              transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
            }}>
              <InputField
                icon={<User size={15} />}
                placeholder="Nombre de usuario"
                type="text"
                value={formData.username}
                onChange={v => setFormData({ ...formData, username: v })}
                focused={focused === 'username'}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused(null)}
                required={false}
              />
            </div>

            <InputField
              icon={<Mail size={15} />}
              placeholder="Correo electrónico"
              type="email"
              value={formData.email}
              onChange={v => setFormData({ ...formData, email: v })}
              focused={focused === 'email'}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />

            <InputField
              icon={<Lock size={15} />}
              placeholder="Contraseña"
              type="password"
              value={formData.password}
              onChange={v => setFormData({ ...formData, password: v })}
              focused={focused === 'password'}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
            />

            {/* Error */}
            {error && (
              <div style={s.errorBox}>
                {error}
              </div>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}
              onMouseEnter={e => !loading && ((e.target as HTMLElement).style.transform = 'scale(1.02)')}
              onMouseLeave={e => ((e.target as HTMLElement).style.transform = 'scale(1)')}
            >
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={s.spinner} /> {isLogin ? 'Entrando...' : 'Creando cuenta...'}
                </span>
              ) : (
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {isLogin ? 'Entrar' : 'Crear cuenta'} <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          {/* Switch modo */}
          <p style={s.switchText}>
            {isLogin ? '¿Primera vez?' : '¿Ya tienes cuenta?'}
            <button style={s.switchBtn} onClick={switchMode}>
              {isLogin ? ' Regístrate gratis' : ' Inicia sesión'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p style={s.footer}>Hecho con 🎵 para los amantes de la música</p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spinSmall { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
};

/* ── Campo de input reutilizable ── */
interface FieldProps {
  icon: React.ReactNode;
  placeholder: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  required?: boolean;
}

const InputField = ({ icon, placeholder, type, value, onChange, focused, onFocus, onBlur }: FieldProps) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    background: focused ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${focused ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 12, padding: '12px 14px',
    transition: 'all 0.22s ease',
    boxShadow: focused ? '0 0 0 3px rgba(139,92,246,0.1)' : 'none',
    marginBottom: 10,
  }}>
    <span style={{ color: focused ? '#a78bfa' : 'rgba(255,255,255,0.3)', flexShrink: 0, transition: 'color 0.2s' }}>
      {icon}
    </span>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        flex: 1, background: 'none', border: 'none', outline: 'none',
        color: 'white', fontSize: 13, fontFamily: "'Sora', sans-serif",
        fontWeight: 500,
      }}
    />
  </div>
);

/* ── Estilos como objeto ── */
const s: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed', inset: 0,
    background: '#07070f',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Sora', sans-serif",
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
  },
  orb1: {
    position: 'absolute', top: '-10%', left: '15%',
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)',
    filter: 'blur(40px)', zIndex: 0,
  },
  orb2: {
    position: 'absolute', bottom: '-10%', right: '10%',
    width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
    filter: 'blur(50px)', zIndex: 0,
  },
  center: {
    position: 'relative', zIndex: 10,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    width: '100%', maxWidth: 400, padding: '0 20px',
    animation: 'fadeIn 0.5s ease both',
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  logoDisc: {
    width: 44, height: 44, borderRadius: '50%',
    background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 20px rgba(139,92,246,0.25)',
  },
  logoText: {
    fontSize: 22, fontWeight: 800, letterSpacing: '0.28em',
    background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 60%, #a78bfa 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  tagline: {
    fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 28,
    fontWeight: 400, letterSpacing: '0.02em',
  },
  card: {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: '24px 24px 20px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.06)',
  },
  tabs: {
    display: 'flex', position: 'relative',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10, padding: 4, marginBottom: 22,
  },
  tab: {
    flex: 1, padding: '8px 0', border: 'none', background: 'none',
    color: 'rgba(255,255,255,0.4)', fontFamily: "'Sora', sans-serif",
    fontSize: 12, fontWeight: 600, cursor: 'pointer', position: 'relative', zIndex: 1,
    transition: 'color 0.25s',
  },
  tabActive: {
    color: 'white',
  },
  tabIndicator: {
    position: 'absolute', top: 4, bottom: 4, width: 'calc(50% - 6px)',
    background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: 8, transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
  },
  form: { display: 'flex', flexDirection: 'column' },
  fieldWrap: { marginBottom: 0 },
  errorBox: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 10, padding: '10px 14px', marginBottom: 12,
    color: '#fca5a5', fontSize: 12, fontWeight: 500, fontFamily: "'Sora', sans-serif",
  },
  submitBtn: {
    width: '100%', padding: '13px', border: 'none', borderRadius: 12,
    background: 'linear-gradient(135deg, #9b72f5 0%, #6d28d9 100%)',
    color: 'white', fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700,
    cursor: 'pointer', marginTop: 4,
    boxShadow: '0 6px 20px rgba(109,40,217,0.45)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  spinner: {
    display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
    animation: 'spinSmall 0.7s linear infinite',
  },
  switchText: {
    textAlign: 'center', marginTop: 16, fontSize: 12,
    color: 'rgba(255,255,255,0.35)', fontFamily: "'Sora', sans-serif",
  },
  switchBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#a78bfa', fontFamily: "'Sora', sans-serif",
    fontSize: 12, fontWeight: 600, padding: 0,
    textDecoration: 'underline', textUnderlineOffset: 3,
  },
  footer: {
    marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.2)',
    fontFamily: "'Sora', sans-serif",
  },
};

export default Auth;