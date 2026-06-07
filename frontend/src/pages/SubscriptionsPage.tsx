import { useEffect, useState } from 'react';
import { Crown, Check, Zap, Clock, AlertCircle, Copy, RefreshCw, ChevronRight } from 'lucide-react';
import { API, authHeaders } from '../lib/api';
import { usePremium as usePremiumStore } from '../hooks/usePremium';

interface Plan {
  plan_id: number;
  nombre_plan: string;
  precio: number;
  duracion_meses: number;
  precio_original: number | null;
  descuento_porcentaje: number | null;
  etiqueta: string | null;
  es_gratis: boolean;
}

interface Suscripcion {
  activa: boolean;
  plan: string;
  precio?: number;
  fecha_fin?: string;
  es_premium: boolean;
}

interface PagoIniciado {
  pago_id: number;
  codigo_ref: string;
  monto: number;
  plan: string;
  expira_en: string;
  instrucciones: {
    paso1: string;
    paso2: string;
    paso3: string;
    paso4: string;
  };
  qr_info: {
    numero_cuenta: string;
    nombre: string;
    banco: string;
    monto: number;
    referencia: string;
  };
}

type Vista = 'planes' | 'pago' | 'confirmado' | 'historial';

const SubscriptionsPage = () => {
  const [planes,        setPlanes]       = useState<Plan[]>([]);
  const [suscripcion,  setSuscripcion]  = useState<Suscripcion | null>(null);
  const [pagoActivo,   setPagoActivo]   = useState<PagoIniciado | null>(null);
  const [historial,    setHistorial]    = useState<any[]>([]);
  const [vista,        setVista]        = useState<Vista>('planes');
  const [loading,      setLoading]      = useState(true);
  const [loadingPago,  setLoadingPago]  = useState(false);
  const [copiado,      setCopiado]      = useState(false);
  const [confirmando,  setConfirmando]  = useState(false);
  const [mensajeOk,    setMensajeOk]    = useState('');
  const [error,        setError]        = useState('');
  const [tiempoRestante, setTiempoRestante] = useState('');
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Countdown del código de referencia
  useEffect(() => {
    if (!pagoActivo) return;
    const interval = setInterval(() => {
      const diff = new Date(pagoActivo.expira_en).getTime() - Date.now();
      if (diff <= 0) { setTiempoRestante('Expirado'); clearInterval(interval); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTiempoRestante(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [pagoActivo]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [planesRes, subRes] = await Promise.all([
        fetch(`${API.subscriptions}/planes`),
        fetch(`${API.subscriptions}/subscriptions/me`, { headers: authHeaders() }),
      ]);
      const planesData = await planesRes.json();
      const subData    = await subRes.json();
      setPlanes(planesData);
      setSuscripcion(subData);
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarHistorial = async () => {
    try {
      const res  = await fetch(`${API.subscriptions}/payments/historial`, { headers: authHeaders() });
      const data = await res.json();
      setHistorial(data);
      setVista('historial');
    } catch {
      setError('Error al cargar historial');
    }
  };

  const iniciarPago = async (plan_id: number) => {
    setLoadingPago(true);
    setError('');
    try {
      const res  = await fetch(`${API.subscriptions}/payments/iniciar`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ plan_id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setPagoActivo(data);
      setVista('pago');
    } catch {
      setError('Error al iniciar pago');
    } finally {
      setLoadingPago(false);
    }
  };

  const confirmarPago = async () => {
    if (!pagoActivo) return;
    setConfirmando(true);
    setError('');
    try {
      const res  = await fetch(`${API.subscriptions}/payments/confirmar`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ codigo_ref: pagoActivo.codigo_ref }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensajeOk(data.message);
      setVista('confirmado');
    } catch {
      setError('Error al confirmar pago');
    } finally {
      setConfirmando(false);
    }
  };

  const subirComprobante = async (file: File) => {
    setSubiendoComprobante(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('comprobante', file);
      const res = await fetch(`${API.subscriptions}/payments/comprobante`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo verificar el comprobante');
        return;
      }
      // Actualizar estado premium
      await usePremiumStore.getState().check();
      setMensajeOk(`¡${data.message} Plan: ${data.plan}`);
      setVista('confirmado');
    } catch {
      setError('Error al subir el comprobante');
    } finally {
      setSubiendoComprobante(false);
    }
  };

  const copiarCodigo = () => {
    if (!pagoActivo) return;
    navigator.clipboard.writeText(pagoActivo.codigo_ref);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const formatFecha = (iso: string) => new Date(iso).toLocaleDateString('es-BO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const estadoColor: Record<string, string> = {
    pendiente:   '#f59e0b',
    en_revision: '#60a5fa',
    verificado:  '#34d399',
    cancelado:   '#f87171',
    rechazado:   '#f87171',
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh',gap:14,flexDirection:'column'}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(139,92,246,0.15)',borderTopColor:'#a78bfa',animation:'spin-s 0.8s linear infinite'}}/>
      <p style={{color:'rgba(255,255,255,0.3)',fontSize:13,margin:0,fontFamily:'Sora,sans-serif'}}>Cargando...</p>
      <style>{`@keyframes spin-s{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        .sub-page { max-width:900px; margin:0 auto; font-family:'Sora',sans-serif; }

        /* Header */
        .sub-header { margin-bottom:32px; }
        .sub-title { font-size:24px; font-weight:800; color:white; margin:0 0 6px; }
        .sub-subtitle { font-size:13px; color:rgba(255,255,255,0.4); margin:0; }

        /* Badge suscripción actual */
        .sub-badge {
          display:inline-flex; align-items:center; gap:8px;
          background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.25);
          border-radius:40px; padding:8px 16px; margin-bottom:28px;
          font-size:12px; font-weight:600; color:#a78bfa;
        }
        .sub-badge.gratis { background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1); color:rgba(255,255,255,0.45); }

        /* Tabs */
        .sub-tabs { display:flex; gap:4px; margin-bottom:28px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:3px; width:fit-content; }
        .sub-tab { padding:7px 18px; border-radius:7px; border:none; cursor:pointer; font-size:11px; font-weight:700; font-family:'Sora',sans-serif; transition:all 0.18s; color:rgba(255,255,255,0.35); background:transparent; }
        .sub-tab:hover { color:rgba(255,255,255,0.65); }
        .sub-tab.active { background:rgba(139,92,246,0.2); color:#c4b5fd; border:1px solid rgba(139,92,246,0.3); }

        /* Grid de planes */
        .planes-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; }

        /* Card de plan */
        .plan-card {
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);
          border-radius:16px; padding:24px; position:relative; overflow:hidden;
          transition:all 0.2s; cursor:default;
        }
        .plan-card.premium { border-color:rgba(139,92,246,0.3); background:rgba(139,92,246,0.06); }
        .plan-card.anual { border-color:rgba(250,204,21,0.3); background:rgba(250,204,21,0.04); }
        .plan-card.activo { border-color:rgba(52,211,153,0.4); background:rgba(52,211,153,0.05); }

        .plan-badge {
          position:absolute; top:14px; right:14px;
          font-size:9px; font-weight:700; padding:3px 8px; border-radius:20px;
          background:rgba(250,204,21,0.15); color:#fbbf24; border:1px solid rgba(250,204,21,0.25);
        }
        .plan-badge.activo-badge { background:rgba(52,211,153,0.15); color:#34d399; border-color:rgba(52,211,153,0.25); }

        .plan-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:14px; }
        .plan-nombre { font-size:16px; font-weight:800; color:white; margin:0 0 6px; }
        .plan-precio { display:flex; align-items:baseline; gap:4px; margin-bottom:6px; }
        .plan-precio-num { font-size:28px; font-weight:800; color:white; }
        .plan-precio-bs { font-size:14px; color:rgba(255,255,255,0.5); }
        .plan-precio-per { font-size:11px; color:rgba(255,255,255,0.35); }
        .plan-precio-original { font-size:11px; color:rgba(255,255,255,0.3); text-decoration:line-through; margin-bottom:12px; }

        .plan-features { list-style:none; padding:0; margin:0 0 20px; display:flex; flex-direction:column; gap:8px; }
        .plan-feature { display:flex; align-items:center; gap:8px; font-size:12px; color:rgba(255,255,255,0.6); }
        .plan-feature-check { width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

        .plan-btn {
          width:100%; padding:11px; border-radius:10px; border:none; cursor:pointer;
          font-size:12px; font-weight:700; font-family:'Sora',sans-serif; transition:all 0.2s;
        }
        .plan-btn.premium-btn { background:linear-gradient(135deg,#9b72f5,#6d28d9); color:white; box-shadow:0 4px 15px rgba(109,40,217,0.35); }
        .plan-btn.premium-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(109,40,217,0.45); }
        .plan-btn.anual-btn { background:linear-gradient(135deg,#f59e0b,#d97706); color:white; box-shadow:0 4px 15px rgba(245,158,11,0.25); }
        .plan-btn.anual-btn:hover { transform:translateY(-1px); }
        .plan-btn.activo-btn { background:rgba(52,211,153,0.1); color:#34d399; border:1px solid rgba(52,211,153,0.25); cursor:default; }
        .plan-btn.gratis-btn { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.4); cursor:default; }

        /* Panel de pago */
        .pago-panel { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:28px; max-width:540px; }
        .pago-title { font-size:18px; font-weight:800; color:white; margin:0 0 6px; }
        .pago-sub { font-size:12px; color:rgba(255,255,255,0.4); margin:0 0 24px; }

        .pago-steps { display:flex; flex-direction:column; gap:12px; margin-bottom:24px; }
        .pago-step { display:flex; align-items:flex-start; gap:12px; }
        .pago-step-num { width:24px; height:24px; border-radius:50%; background:rgba(139,92,246,0.2); border:1px solid rgba(139,92,246,0.3); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#a78bfa; flex-shrink:0; margin-top:1px; }
        .pago-step-text { font-size:12px; color:rgba(255,255,255,0.6); line-height:1.5; }

        .codigo-box {
          background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.2);
          border-radius:10px; padding:14px 16px; margin-bottom:20px;
          display:flex; align-items:center; justify-content:space-between;
        }
        .codigo-label { font-size:9px; font-weight:700; letter-spacing:0.15em; color:rgba(139,92,246,0.7); text-transform:uppercase; margin-bottom:4px; }
        .codigo-valor { font-size:20px; font-weight:800; color:white; letter-spacing:0.05em; }
        .codigo-copy { background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.25); border-radius:8px; padding:8px 12px; cursor:pointer; color:#a78bfa; font-size:11px; font-weight:600; font-family:'Sora',sans-serif; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
        .codigo-copy:hover { background:rgba(139,92,246,0.25); }
        .codigo-copy.copiado { background:rgba(52,211,153,0.15); border-color:rgba(52,211,153,0.25); color:#34d399; }

        .timer-row { display:flex; align-items:center; gap:6px; margin-bottom:20px; font-size:11px; color:rgba(255,255,255,0.35); }
        .timer-val { color:#f59e0b; font-weight:700; }

        .qr-info { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px 16px; margin-bottom:20px; }
        .qr-info-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .qr-info-row:last-child { border-bottom:none; }
        .qr-info-key { font-size:10px; color:rgba(255,255,255,0.3); font-weight:600; text-transform:uppercase; letter-spacing:0.1em; }
        .qr-info-val { font-size:11px; color:rgba(255,255,255,0.7); font-weight:600; }

        .confirm-btn { width:100%; padding:13px; border-radius:10px; border:none; cursor:pointer; font-size:13px; font-weight:700; font-family:'Sora',sans-serif; background:linear-gradient(135deg,#9b72f5,#6d28d9); color:white; box-shadow:0 4px 15px rgba(109,40,217,0.35); transition:all 0.2s; }
        .confirm-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(109,40,217,0.45); }
        .confirm-btn:disabled { opacity:0.5; cursor:not-allowed; }

        /* Estado confirmado */
        .confirmado-panel { text-align:center; padding:40px 20px; max-width:400px; margin:0 auto; }
        .confirmado-icon { width:64px; height:64px; border-radius:50%; background:rgba(52,211,153,0.1); border:1px solid rgba(52,211,153,0.25); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; }
        .confirmado-title { font-size:20px; font-weight:800; color:white; margin:0 0 8px; }
        .confirmado-sub { font-size:13px; color:rgba(255,255,255,0.4); margin:0 0 24px; line-height:1.6; }
        .back-btn { background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.25); border-radius:10px; padding:10px 20px; cursor:pointer; color:#a78bfa; font-size:12px; font-weight:600; font-family:'Sora',sans-serif; transition:all 0.15s; }
        .back-btn:hover { background:rgba(139,92,246,0.25); }

        /* Historial */
        .historial-list { display:flex; flex-direction:column; gap:8px; }
        .historial-item { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .historial-info { flex:1; min-width:0; }
        .historial-plan { font-size:13px; font-weight:600; color:white; margin-bottom:3px; }
        .historial-ref { font-size:10px; color:rgba(255,255,255,0.3); font-family:monospace; }
        .historial-right { text-align:right; flex-shrink:0; }
        .historial-monto { font-size:14px; font-weight:700; color:white; margin-bottom:3px; }
        .historial-fecha { font-size:10px; color:rgba(255,255,255,0.3); }
        .historial-estado { font-size:9px; font-weight:700; padding:2px 8px; border-radius:20px; border:1px solid; margin-top:4px; display:inline-block; }

        .error-msg { display:flex; align-items:center; gap:8px; background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.2); border-radius:8px; padding:10px 14px; margin-bottom:16px; font-size:12px; color:#fca5a5; }
      `}</style>

      <div className="sub-page">

        {/* Header */}
        <div className="sub-header">
          <h1 className="sub-title">Suscripciones</h1>
          <p className="sub-subtitle">Elige el plan que mejor se adapte a ti</p>
        </div>

        {/* Badge suscripción actual */}
        {suscripcion && (
          <div className={`sub-badge ${!suscripcion.es_premium ? 'gratis' : ''}`}>
            {suscripcion.es_premium ? <Crown size={13}/> : <Zap size={13}/>}
            {suscripcion.es_premium
              ? `Plan ${suscripcion.plan} activo${suscripcion.fecha_fin ? ` · Vence ${formatFecha(suscripcion.fecha_fin)}` : ''}`
              : 'Plan Gratuito activo'
            }
          </div>
        )}

        {/* Tabs */}
        <div className="sub-tabs">
          <button className={`sub-tab ${vista === 'planes' ? 'active' : ''}`} onClick={() => setVista('planes')}>
            Planes
          </button>
          <button className={`sub-tab ${vista === 'historial' ? 'active' : ''}`} onClick={cargarHistorial}>
            Historial
          </button>
        </div>

        {/* Error global */}
        {error && (
          <div className="error-msg">
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {/* ── VISTA PLANES ── */}
        {vista === 'planes' && (
          <div className="planes-grid">
            {planes.map(plan => {
              const esActual = suscripcion?.plan?.toLowerCase().includes(plan.nombre_plan.toLowerCase()) && suscripcion?.activa;
              const esAnual  = plan.duracion_meses === 12;
              const esPremium = !plan.es_gratis && !esAnual;

              return (
                <div key={plan.plan_id} className={`plan-card ${esActual ? 'activo' : esAnual ? 'anual' : esPremium ? 'premium' : ''}`}>

                  {plan.etiqueta && <div className="plan-badge">{plan.etiqueta}</div>}
                  {esActual      && <div className="plan-badge activo-badge">Activo</div>}

                  <div className="plan-icon" style={{
                    background: plan.es_gratis ? 'rgba(255,255,255,0.05)' :
                                esAnual        ? 'rgba(250,204,21,0.1)'   :
                                                 'rgba(139,92,246,0.1)',
                  }}>
                    {plan.es_gratis
                      ? <Zap   size={20} color="rgba(255,255,255,0.4)"/>
                      : esAnual
                        ? <Crown size={20} color="#fbbf24"/>
                        : <Crown size={20} color="#a78bfa"/>
                    }
                  </div>

                  <p className="plan-nombre">{plan.nombre_plan}</p>

                  <div className="plan-precio">
                    <span className="plan-precio-num">
                      {plan.precio === 0 ? 'Gratis' : `${plan.precio}`}
                    </span>
                    {plan.precio > 0 && <span className="plan-precio-bs">Bs.</span>}
                    {plan.precio > 0 && (
                      <span className="plan-precio-per">
                        /{plan.duracion_meses === 1 ? 'mes' : 'año'}
                      </span>
                    )}
                  </div>

                  {plan.precio_original && (
                    <p className="plan-precio-original">
                      Antes Bs. {plan.precio_original}/año
                    </p>
                  )}

                  <ul className="plan-features">
                    {plan.es_gratis ? (
                      <>
                        <li className="plan-feature">
                          <div className="plan-feature-check" style={{background:'rgba(255,255,255,0.08)'}}>
                            <Check size={9} color="rgba(255,255,255,0.4)"/>
                          </div>
                          Acceso limitado
                        </li>
                        <li className="plan-feature">
                          <div className="plan-feature-check" style={{background:'rgba(255,255,255,0.08)'}}>
                            <Check size={9} color="rgba(255,255,255,0.4)"/>
                          </div>
                          Con anuncios
                        </li>
                        <li className="plan-feature">
                          <div className="plan-feature-check" style={{background:'rgba(255,255,255,0.08)'}}>
                            <Check size={9} color="rgba(255,255,255,0.4)"/>
                          </div>
                          Prueba gratuita
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="plan-feature">
                          <div className="plan-feature-check" style={{background:'rgba(139,92,246,0.15)'}}>
                            <Check size={9} color="#a78bfa"/>
                          </div>
                          Acceso ilimitado
                        </li>
                        <li className="plan-feature">
                          <div className="plan-feature-check" style={{background:'rgba(139,92,246,0.15)'}}>
                            <Check size={9} color="#a78bfa"/>
                          </div>
                          Sin anuncios
                        </li>
                        <li className="plan-feature">
                          <div className="plan-feature-check" style={{background:'rgba(139,92,246,0.15)'}}>
                            <Check size={9} color="#a78bfa"/>
                          </div>
                          Letras sincronizadas
                        </li>
                        <li className="plan-feature">
                          <div className="plan-feature-check" style={{background:'rgba(139,92,246,0.15)'}}>
                            <Check size={9} color="#a78bfa"/>
                          </div>
                          {esAnual ? 'Ahorra 30% vs mensual' : 'Cancela cuando quieras'}
                        </li>
                      </>
                    )}
                  </ul>

                  <button
                    className={`plan-btn ${
                      esActual    ? 'activo-btn'  :
                      plan.es_gratis ? 'gratis-btn' :
                      esAnual     ? 'anual-btn'   : 'premium-btn'
                    }`}
                    disabled={esActual || plan.es_gratis || loadingPago}
                    onClick={() => !esActual && !plan.es_gratis && iniciarPago(plan.plan_id)}
                  >
                    {esActual       ? '✓ Plan actual'       :
                     plan.es_gratis ? 'Plan actual'         :
                     loadingPago    ? 'Iniciando...'        :
                                      'Suscribirme'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── VISTA PAGO ── */}
        {vista === 'pago' && pagoActivo && (
          <div className="pago-panel">
            <p className="pago-title">Pagar con QR</p>
            <p className="pago-sub">Plan {pagoActivo.plan} · Bs. {pagoActivo.monto}</p>

            <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
              {/* QR imagen */}
              <div style={{flexShrink:0,textAlign:'center'}}>
                <div style={{
                  background:'white',borderRadius:12,padding:12,
                  width:160,height:160,margin:'0 auto 8px',
                  display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',
                }}>
                  <img
                    src={`${API.subscriptions}/qr/qr-echofy.png`}
                    alt="QR Echofy"
                    style={{width:'100%',height:'100%',objectFit:'contain'}}
                    onError={e => (e.currentTarget.style.display='none')}
                  />
                </div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontFamily:"'Sora',sans-serif"}}>
                  Escanea con tu banco
                </div>
              </div>

              {/* Instrucciones + código */}
              <div style={{flex:1,minWidth:220}}>
                <div className="pago-steps">
                  {Object.values(pagoActivo.instrucciones).map((paso, i) => (
                    <div key={i} className="pago-step">
                      <div className="pago-step-num">{i+1}</div>
                      <p className="pago-step-text">{paso}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Código de referencia */}
            <div className="codigo-box" style={{marginTop:16}}>
              <div>
                <div className="codigo-label">Código de referencia — escríbelo en la transferencia</div>
                <div className="codigo-valor">{pagoActivo.codigo_ref}</div>
              </div>
              <button className={`codigo-copy ${copiado?'copiado':''}`} onClick={copiarCodigo}>
                <Copy size={12}/> {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="timer-row">
              <Clock size={12}/>
              Código válido por: <span className="timer-val">{tiempoRestante}</span>
            </div>

            {/* Subir comprobante */}
            <div style={{
              background:'rgba(52,211,153,0.05)',border:'1px solid rgba(52,211,153,0.15)',
              borderRadius:10,padding:'14px 16px',marginBottom:16,
            }}>
              <p style={{margin:'0 0 10px',fontSize:12,fontWeight:700,color:'white',fontFamily:"'Sora',sans-serif"}}>
                ¿Ya pagaste? Sube el comprobante
              </p>
              <p style={{margin:'0 0 12px',fontSize:11,color:'rgba(255,255,255,0.4)',fontFamily:"'Sora',sans-serif",lineHeight:1.5}}>
                La IA verificará automáticamente el código y activará tu suscripción al instante.
              </p>

              <label style={{
                display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                background:'rgba(52,211,153,0.08)',border:'1px dashed rgba(52,211,153,0.25)',
                borderRadius:8,padding:'12px 16px',transition:'all 0.15s',
              }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{display:'none'}}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) subirComprobante(file);
                  }}
                />
                <div style={{
                  width:32,height:32,borderRadius:8,background:'rgba(52,211,153,0.1)',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                }}>
                  📎
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'white',fontFamily:"'Sora',sans-serif"}}>
                    {subiendoComprobante ? 'Analizando comprobante...' : 'Seleccionar imagen del comprobante'}
                  </div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:"'Sora',sans-serif"}}>
                    JPG, PNG o HEIC — máx 10MB
                  </div>
                </div>
              </label>
            </div>

            {error && (
              <div className="error-msg" style={{marginBottom:12}}>
                <AlertCircle size={14}/> {error}
              </div>
            )}

            <button
              onClick={() => { setVista('planes'); setPagoActivo(null); setError(''); }}
              style={{width:'100%',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:12,fontFamily:"'Sora',sans-serif",padding:'8px'}}
            >
              Cancelar y volver
            </button>
          </div>
        )}

        {/* ── VISTA CONFIRMADO ── */}
        {vista === 'confirmado' && (
          <div className="confirmado-panel">
            <div className="confirmado-icon">
              <Check size={28} color="#34d399"/>
            </div>
            <h2 className="confirmado-title">¡Pago confirmado!</h2>
            <p className="confirmado-sub">{mensajeOk || 'Tu pago está en revisión. Te notificaremos cuando tu suscripción sea activada.'}</p>
            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
              <button className="back-btn" onClick={() => { setVista('planes'); cargarDatos(); }}>
                <RefreshCw size={12} style={{display:'inline',marginRight:6}}/>
                Ver planes
              </button>
              <button className="back-btn" onClick={cargarHistorial}>
                Ver historial <ChevronRight size={12} style={{display:'inline'}}/>
              </button>
            </div>
          </div>
        )}

        {/* ── VISTA HISTORIAL ── */}
        {vista === 'historial' && (
          <div>
            {historial.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px 0',color:'rgba(255,255,255,0.3)',fontSize:13}}>
                No tienes pagos registrados aún
              </div>
            ) : (
              <div className="historial-list">
                {historial.map((p: any) => (
                  <div key={p.pago_id} className="historial-item">
                    <div className="historial-info">
                      <div className="historial-plan">{p.nombre_plan}</div>
                      <div className="historial-ref">{p.codigo_ref}</div>
                    </div>
                    <div className="historial-right">
                      <div className="historial-monto">Bs. {Number(p.monto).toFixed(2)}</div>
                      <div className="historial-fecha">
                        {new Date(p.fecha_creacion).toLocaleDateString('es-BO', {day:'numeric',month:'short',year:'numeric'})}
                      </div>
                      <div
                        className="historial-estado"
                        style={{
                          color: estadoColor[p.estado] || '#9ca3af',
                          borderColor: `${estadoColor[p.estado]}40` || 'rgba(156,163,175,0.25)',
                          background: `${estadoColor[p.estado]}15` || 'rgba(156,163,175,0.08)',
                        }}
                      >
                        {p.estado.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
};

export default SubscriptionsPage;