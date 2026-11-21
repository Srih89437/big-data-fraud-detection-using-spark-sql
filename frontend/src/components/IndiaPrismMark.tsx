import React from 'react';

interface IndiaPrismMarkProps {
  size?: number;
  className?: string;
  dark?: boolean;
}

/**
 * Authentic Cartographic Mark for ICIP:
 * Extruded India contour prism with an amber beacon dot.
 * Completely replaces the generic security shield.
 */
export function IndiaPrismMark({ size = 20, className = '' }: IndiaPrismMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`cartographic-prism-mark ${className}`}
      aria-hidden="true"
    >
      {/* Outer Contour Guide Ring */}
      <circle
        cx="16"
        cy="16"
        r="14.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.35"
      />

      {/* Extruded Lower Depth Shadow (South/East facing) */}
      <path
        d="M 15.5 5.5 L 18 8 L 22 12 L 20 17 L 18 21 L 16 27 L 16 28.5 L 17 27 L 21 21 L 23 15 L 24 11 L 19 7 Z"
        fill="#0F172A"
        opacity="0.6"
      />

      {/* Top Prism Face: Stylized Geometry of India */}
      {/* North (J&K) at top ~5, South at ~26, West (Gujarat) at ~7, East at ~25 */}
      <path
        d="
          M 15.5 5.5
          C 16.5 6, 17.5 7, 18.5 8
          L 19.5 7.5
          L 21.5 10
          L 20 12
          L 23 11.5
          L 26 12.5
          L 25.5 14.5
          L 22 15
          L 21 17.5
          L 19 21
          L 18 24
          L 16.5 27.5
          C 16.2 28, 15.8 28, 15.5 27.5
          L 14 24
          L 13 21
          L 12 18
          L 8.5 17
          L 6.5 16.5
          L 7 13.5
          L 10 13
          L 11.5 10.5
          L 13.5 8.5
          Z
        "
        fill="#E07A38"
        fillOpacity="0.16"
        stroke="#E07A38"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      {/* Stepped Inner Elevation Ring */}
      <path
        d="M 15.5 8.5 L 17.5 10.5 L 20 12 L 18.5 15 L 17.5 18.5 L 16 23 L 14.5 18.5 L 12.5 15 L 10 14 L 13.5 11 Z"
        stroke="#F2A33A"
        strokeWidth="0.8"
        strokeDasharray="1.5 1.5"
        fill="none"
        opacity="0.8"
      />

      {/* Central Amber Beacon Dot with Pulse Glow */}
      <circle cx="16" cy="16" r="2.2" fill="#E07A38" />
      <circle cx="16" cy="16" r="4.2" stroke="#E07A38" strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}
