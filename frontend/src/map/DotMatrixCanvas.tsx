// Dot-Matrix India Canvas: Interactive 2D Survey Room Map
// Samples from real 36-jurisdiction boundaries (frontend/public/geo/india-dots.json)
// Features drifting topographic contour field, pointer parallax <= 8px,
// instant static SVG fallback, state hover highlighting, and exact case counts.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { StateRow } from '../lib/types';

interface Dot {
  id: number;
  x: number;
  y: number;
  nx: number;
  ny: number;
  lon: number;
  lat: number;
  state_ut: string;
  code: string;
}

interface DotMatrixData {
  total_dots: number;
  bounds: { min_x: number; max_x: number; min_y: number; max_y: number };
  dots: Dot[];
}

interface DotMatrixCanvasProps {
  states: StateRow[];
  year: number;
  onSelectState?: (name: string) => void;
  dark: boolean;
}

export function DotMatrixCanvas({
  states,
  year,
  onSelectState,
  dark,
}: DotMatrixCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dotsData, setDotsData] = useState<Dot[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredDot, setHoveredDot] = useState<Dot | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [scrollMorph, setScrollMorph] = useState<number>(0);
  const mousePosRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  // Scroll listener for dot-matrix to 3D column extrusion morph
  useEffect(() => {
    const handleScroll = () => {
      const sy = window.scrollY || document.documentElement.scrollTop;
      const morph = Math.max(0, Math.min(1, sy / 420));
      setScrollMorph(morph);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Map state names to cases
  const stateCasesMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const s of states) map.set(s.state_ut, s.cases);
    return map;
  }, [states]);

  // Load precomputed dots
  useEffect(() => {
    let active = true;
    fetch('/geo/india-dots.json')
      .then((r) => r.json())
      .then((data: DotMatrixData) => {
        if (active && data?.dots) {
          setDotsData(data.dots);
        }
      })
      .catch((err) => console.warn('Could not load india-dots.json:', err));
    return () => {
      active = false;
    };
  }, []);

  // Pointer move handler with <= 8px parallax
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      mousePosRef.current.targetX = relX * 12; // clamped in draw loop to 8px
      mousePosRef.current.targetY = relY * 12;

      // Check hit against dots
      const cX = e.clientX - rect.left;
      const cY = e.clientY - rect.top;
      const padding = 28;
      const drawW = rect.width - padding * 2;
      const drawH = rect.height - padding * 2;

      let found: Dot | null = null;
      let minD = 18; // 18px hit radius

      for (const d of dotsData) {
        const dx = padding + d.nx * drawW;
        const dy = padding + d.ny * drawH;
        const dist = Math.hypot(cX - dx, cY - dy);
        if (dist < minD) {
          minD = dist;
          found = d;
        }
      }

      if (found) {
        setHoveredDot(found);
        setHoveredState(found.state_ut);
        setTooltipPos({ x: cX, y: cY });
      } else {
        setHoveredDot(null);
        setHoveredState(null);
        setTooltipPos(null);
      }
    },
    [dotsData]
  );

  const handleMouseLeave = useCallback(() => {
    mousePosRef.current.targetX = 0;
    mousePosRef.current.targetY = 0;
    setHoveredDot(null);
    setHoveredState(null);
    setTooltipPos(null);
  }, []);

  // Main canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;
    let isVisible = true;

    // IntersectionObserver to pause when offscreen
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(canvas);

    const render = () => {
      animId = requestAnimationFrame(render);
      if (!isVisible) return;

      t += 0.012;

      // Parallax smooth interpolation
      mousePosRef.current.x += (mousePosRef.current.targetX - mousePosRef.current.x) * 0.08;
      mousePosRef.current.y += (mousePosRef.current.targetY - mousePosRef.current.y) * 0.08;
      const px = Math.max(-8, Math.min(8, mousePosRef.current.x));
      const py = Math.max(-8, Math.min(8, mousePosRef.current.y));

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // 1. Drifting subtle topographic contour lines
      ctx.save();
      ctx.translate(px * 0.5, py * 0.5);
      const contourColor = dark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(10, 13, 16, 0.04)';
      ctx.strokeStyle = contourColor;
      ctx.lineWidth = 1;

      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const baseRadius = (w * 0.28) + i * 40;
        const wave = Math.sin(t + i * 1.2) * 12;
        ctx.ellipse(w * 0.5 + wave, h * 0.52 - wave * 0.5, baseRadius, baseRadius * 0.88, 0.1, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Render Dot-Matrix India
      if (dotsData.length > 0) {
        ctx.save();
        ctx.translate(px, py);

        const padding = 28;
        const drawW = w - padding * 2;
        const drawH = h - padding * 2;
        const maxCases = Math.max(...Array.from(stateCasesMap.values()), 1);

        for (const d of dotsData) {
          const dx = padding + d.nx * drawW;
          const dy = padding + d.ny * drawH;

          const isStateActive = hoveredState && d.state_ut === hoveredState;
          const isThisDot = hoveredDot && d.id === hoveredDot.id;
          const count = stateCasesMap.get(d.state_ut) || 0;
          const elevation = scrollMorph > 0 ? Math.sqrt(count / maxCases) * scrollMorph * 36 : 0;

          if (elevation > 1) {
            // Extrude 3D pillar upwards as user scrolls
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(dx, dy - elevation);
            ctx.strokeStyle = isStateActive
              ? '#E07A38'
              : dark
              ? 'rgba(224, 122, 56, 0.45)'
              : 'rgba(224, 122, 56, 0.35)';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // Elevated top cap
            ctx.beginPath();
            ctx.arc(dx, dy - elevation, isStateActive ? 3.6 : 2.0, 0, Math.PI * 2);
            ctx.fillStyle = isStateActive ? '#F2A33A' : '#E07A38';
            ctx.fill();
          } else {
            ctx.beginPath();
            if (isThisDot) {
              // Hero active pulse
              ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
              ctx.fillStyle = '#E07A38'; // Cartographic Amber
              ctx.shadowColor = '#E07A38';
              ctx.shadowBlur = 10;
              ctx.fill();
              ctx.shadowBlur = 0;
            } else if (isStateActive) {
              ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
              ctx.fillStyle = '#F2A33A';
              ctx.fill();
            } else {
              // Normal dot
              ctx.arc(dx, dy, 1.85, 0, Math.PI * 2);
              ctx.fillStyle = dark
                ? 'rgba(235, 230, 220, 0.28)'
                : 'rgba(20, 25, 30, 0.22)';
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }

      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [dotsData, hoveredState, hoveredDot, dark, scrollMorph, stateCasesMap]);

  return (
    <div
      ref={containerRef}
      className="dot-matrix-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        if (hoveredState && onSelectState) {
          onSelectState(hoveredState);
        }
      }}
      style={{ cursor: hoveredState ? 'pointer' : 'default' }}
      title={hoveredState ? `Click to view ${hoveredState} dossier` : undefined}
    >
      {/* Instant Static SVG Silhouette Fallback before canvas paint */}
      <svg
        className="dot-matrix-silhouette-fallback"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <path
          d="M 50 12 L 56 22 L 64 26 L 72 32 L 80 40 L 75 48 L 84 52 L 78 58 L 74 68 L 62 76 L 56 86 L 50 92 L 44 86 L 38 78 L 32 68 L 28 58 L 22 52 L 28 44 L 34 38 L 40 28 Z"
          fill="none"
          stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
      </svg>

      <canvas ref={canvasRef} className="dot-matrix-canvas" />

      {/* Real Hover Tooltip with Exact Case Count */}
      {hoveredState && tooltipPos && (
        <div
          className="dot-matrix-tooltip"
          style={{
            left: `${Math.min(tooltipPos.x + 14, 460)}px`,
            top: `${Math.max(tooltipPos.y - 42, 10)}px`,
          }}
        >
          <div className="tooltip-header">
            <span className="tooltip-state-name">{hoveredState}</span>
            <span className="tooltip-code">{hoveredDot?.code}</span>
          </div>
          <div className="tooltip-metric">
            <span className="tooltip-cases">
              {(stateCasesMap.get(hoveredState) || 0).toLocaleString('en-IN')}
            </span>
            <span className="tooltip-unit">registered FIRs ({year})</span>
          </div>
        </div>
      )}
    </div>
  );
}
