import React, { useRef } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';

interface HeartButtonProps {
  songId: string;
  size?: number;
  // 'default' = gris→rojo, 'subtle' = para cards (fondo semitransparente)
  variant?: 'default' | 'subtle';
}

const HeartButton = ({ songId, size = 18, variant = 'default' }: HeartButtonProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(songId);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // No propagar a la card/song-info

    // Animación de pop
    const el = btnRef.current;
    if (el) {
      el.style.transform = 'scale(1.4)';
      setTimeout(() => { if (el) el.style.transform = 'scale(1)'; }, 180);
    }

    await toggleFavorite(songId);
  };

  const baseStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: variant === 'subtle' ? '6px' : '4px',
    borderRadius: '50%',
    transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s',
    background: variant === 'subtle' ? 'rgba(0,0,0,0.45)' : 'transparent',
  };

  return (
    <button
      ref={btnRef}
      style={baseStyle}
      onClick={handleClick}
      title={active ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          variant === 'subtle' ? 'rgba(0,0,0,0.65)' : 'rgba(239,68,68,0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          variant === 'subtle' ? 'rgba(0,0,0,0.45)' : 'transparent';
      }}
    >
      <Heart
        size={size}
        fill={active ? '#ef4444' : 'none'}
        color={active ? '#ef4444' : '#6B7280'}
        strokeWidth={2}
        style={{ transition: 'fill 0.2s, color 0.2s' }}
      />
    </button>
  );
};

export default HeartButton;