import { Crown, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePremium } from '../hooks/usePremium';

interface Props {
  position?: 'top' | 'inline';
}

const ADS = [
  {
    id: 1,
    title: 'Echofy Premium',
    desc: 'Sin anuncios, letras sincronizadas y modo DJ. Desde Bs. 20/mes.',
    cta: 'Probar Premium',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
  },
  {
    id: 2,
    title: '¿Cansado de los anuncios?',
    desc: 'Activa Premium y disfruta música sin interrupciones.',
    cta: 'Ver planes',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.18)',
  },
];

const AdBanner = ({ position = 'inline' }: Props) => {
  const { isPremium } = usePremium();
  const navigate      = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const ad = ADS[Math.floor(Math.random() * ADS.length)];

  if (isPremium || dismissed) return null;

  return (
    <div style={{
      background: ad.bg,
      border: `1px solid ${ad.border}`,
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      margin: position === 'top' ? '0 0 24px' : '16px 0',
      position: 'relative',
      fontFamily: "'Sora',sans-serif",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${ad.color}18`,
        border: `1px solid ${ad.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Crown size={16} color={ad.color}/>
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 2}}>
          {ad.title}
        </div>
        <div style={{fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4}}>
          {ad.desc}
        </div>
      </div>
      <button
        onClick={() => navigate('/subscriptions')}
        style={{
          background: ad.color,
          border: 'none', borderRadius: 8, padding: '7px 12px',
          color: 'white', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Sora',sans-serif",
          flexShrink: 0, whiteSpace: 'nowrap',
        }}
      >
        {ad.cta}
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.25)', padding: 4,
          position: 'absolute', top: 8, right: 8,
        }}
      >
        <X size={11}/>
      </button>
    </div>
  );
};

export default AdBanner;