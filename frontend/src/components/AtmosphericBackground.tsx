import { memo, useEffect, useRef } from 'react';
import type { SectionId } from './Navigation';

interface AtmosphericBackgroundProps {
  section: SectionId;
  dark: boolean;
}

function AtmosphericBackgroundImpl({ section, dark }: AtmosphericBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbPrimaryRef = useRef<HTMLDivElement>(null);
  const orbSecondaryRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Smooth mouse coordinates with lerp (linear interpolation)
  useEffect(() => {
    // Respect user's preference for reduced motion
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to range [-1, 1] relative to viewport center
      targetX = (e.clientX / window.innerWidth - 0.5) * 60;
      targetY = (e.clientY / window.innerHeight - 0.5) * 60;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const animate = () => {
      // Smooth dampening factor
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      if (orbPrimaryRef.current) {
        orbPrimaryRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }
      if (orbSecondaryRef.current) {
        orbSecondaryRef.current.style.transform = `translate3d(${-currentX * 0.6}px, ${-currentY * 0.6}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`atmospheric-bg-layer ${dark ? 'dark' : 'light'} section-${section}`}
      aria-hidden="true"
    >
      {/* Precision architectural dot grid, subtle noise texture & contour lines */}
      <svg className="bg-topographic-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="stripe-grid-pattern" width="36" height="36" patternUnits="userSpaceOnUse">
            {/* Subtle architectural dot at intersection */}
            <circle
              cx="1"
              cy="1"
              r="1"
              fill={dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.07)'}
            />
            {/* Ultra-faint grid hairline */}
            <path
              d="M 36 0 L 0 0 0 36"
              fill="none"
              stroke={dark ? 'rgba(148, 163, 184, 0.02)' : 'rgba(15, 23, 42, 0.02)'}
              strokeWidth="0.75"
            />
          </pattern>

          {/* Micro-grain tactile noise filter for physical surface feel */}
          <filter id="stripe-micro-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.035 0" />
          </filter>
        </defs>

        {/* Global Architectural Grid */}
        <rect width="100%" height="100%" fill="url(#stripe-grid-pattern)" />

        {/* Tactile Micro-Noise Texture Layer */}
        <rect width="100%" height="100%" filter="url(#stripe-micro-noise)" opacity={dark ? 0.9 : 0.6} />

        {/* Soft, calm vector contour lines in upper-right horizon */}
        <g opacity={dark ? 0.07 : 0.045} stroke={dark ? '#818cf8' : '#635bff'} fill="none" strokeWidth="1">
          <path d="M 250 -40 C 450 140, 650 90, 900 220 C 1150 350, 1380 180, 1680 300 C 1900 380, 2100 260, 2300 420" />
          <path d="M 180 -70 C 380 110, 580 80, 830 190 C 1080 300, 1310 140, 1610 270 C 1830 350, 2030 230, 2250 390" />
          <path d="M 350 -10 C 500 170, 700 120, 950 250 C 1200 380, 1420 210, 1720 330 C 1950 410, 2150 290, 2350 450" />
        </g>
      </svg>

      {/* Layered Stripe-style Ambient Luminous Depth Orbs with Interactive Parallax */}
      <div ref={orbPrimaryRef} className="ambient-depth-orb orb-primary" />
      <div ref={orbSecondaryRef} className="ambient-depth-orb orb-secondary" />
      <div className="ambient-depth-orb orb-tertiary" />
    </div>
  );
}

export const AtmosphericBackground = memo(AtmosphericBackgroundImpl);
