import { useState, useRef, useCallback, useEffect } from 'react';

const FALLBACK = 'https://images.unsplash.com/photo-1583241800698-e8ab01830a07?q=80&w=800';

export default function BeforeAfterSlider({ before, after }) {
  const [pos, setPos]     = useState(50);
  const containerRef      = useRef(null);
  const isDragging        = useRef(false);

  const calcPos = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPos((x / rect.width) * 100);
  }, []);

  // Mouse
  const onMouseMove = useCallback((e) => calcPos(e.clientX), [calcPos]);
  const onMouseUp   = useCallback(() => { isDragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div
      ref={containerRef}
      className="ba-root"
      onMouseMove={(e) => { if (!isDragging.current) calcPos(e.clientX); }}
      onMouseLeave={() => { if (!isDragging.current) setPos(50); }}
      onTouchMove={(e) => calcPos(e.touches[0].clientX)}
    >
      {/* DEPOIS (base layer, full width) */}
      <img
        src={after} alt="Depois"
        className="ba-img"
        onError={(e) => { e.target.src = FALLBACK; }}
      />

      {/* ANTES (clipped to left portion) */}
      <div className="ba-before" style={{ clipPath:`inset(0 ${100 - pos}% 0 0)` }}>
        <img
          src={before} alt="Antes"
          className="ba-img"
          onError={(e) => { e.target.src = FALLBACK; }}
        />
      </div>

      {/* Divider line + handle */}
      <div
        className="ba-divider"
        style={{ left:`${pos}%` }}
        onMouseDown={() => { isDragging.current = true; }}
        onTouchStart={() => { isDragging.current = true; }}
        onTouchEnd={() => { isDragging.current = false; }}
      >
        <div className="ba-handle">
          <span>‹</span>
          <span>›</span>
        </div>
      </div>

      {/* Labels */}
      <span className="ba-label ba-label-l">ANTES</span>
      <span className="ba-label ba-label-r">DEPOIS</span>
    </div>
  );
}
