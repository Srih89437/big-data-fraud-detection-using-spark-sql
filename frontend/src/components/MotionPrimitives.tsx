import React, { useEffect, useRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import gsap from 'gsap';

/**
 * Custom hook to execute GSAP staggered reveals within a scoped React container.
 * Automatically cleans up on unmount with ctx.revert() and clears inline transform properties
 * so hover/focus CSS/framer-motion transitions work without conflict.
 */
export function useGsapStagger(
  selector: string,
  dependencies: any[] = [],
  options: {
    y?: number;
    opacity?: number;
    duration?: number;
    stagger?: number;
    delay?: number;
    ease?: string;
  } = {},
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect reduced motion
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray<HTMLElement>(selector);
      if (targets.length === 0) return;

      gsap.fromTo(
        targets,
        {
          opacity: options.opacity ?? 0,
          y: options.y ?? 14,
        },
        {
          opacity: 1,
          y: 0,
          duration: options.duration ?? 0.45,
          stagger: options.stagger ?? 0.045,
          delay: options.delay ?? 0.05,
          ease: options.ease ?? 'power3.out',
          clearProps: 'transform',
        },
      );
    }, containerRef);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return containerRef;
}

/**
 * Stripe-grade tactile card primitive with micro-hover lift, subtle border illumination,
 * and responsive tap spring.
 */
interface InteractiveCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}

export function InteractiveCard({
  children,
  className = '',
  elevated = false,
  ...props
}: InteractiveCardProps) {
  return (
    <motion.div
      className={`stripe-card ${elevated ? 'stripe-card-elevated' : ''} ${className}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Universal tactile button with Stripe-style hover elevation and spring tap feedback.
 */
interface StripeButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StripeButton({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: StripeButtonProps) {
  return (
    <motion.button
      className={`stripe-btn stripe-btn-${variant} stripe-btn-${size} ${className}`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * Stripe-style pill badge with optional pulse dot.
 */
interface StripeBadgeProps {
  children: ReactNode;
  variant?: 'blurple' | 'cyan' | 'mint' | 'amber' | 'coral' | 'neutral';
  dot?: boolean;
  className?: string;
  title?: string;
}

export function StripeBadge({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
  title,
}: StripeBadgeProps) {
  return (
    <span className={`stripe-badge stripe-badge-${variant} ${className}`} title={title}>
      {dot && <span className="stripe-badge-dot" />}
      <span>{children}</span>
    </span>
  );
}

/**
 * Stripe-grade Recharts Custom Tooltip.
 * Calm, luminous, tactile popover with tabular figures, crisp border, and multi-layer soft shadow.
 */
interface StripeChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  valueFormatter?: (val: number) => string;
  unit?: string;
}

export function StripeChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => v.toLocaleString('en-IN'),
  unit = 'cases',
}: StripeChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="stripe-chart-tooltip" role="tooltip">
      {label && <div className="stripe-tooltip-header">{label}</div>}
      <div className="stripe-tooltip-body">
        {payload.map((item, idx) => {
          const color = item.color || item.fill || item.stroke || '#635BFF';
          const name = item.name || 'Value';
          const val = typeof item.value === 'number' ? valueFormatter(item.value) : item.value;
          return (
            <div key={idx} className="stripe-tooltip-row">
              <span className="stripe-tooltip-swatch" style={{ background: color }} />
              <span className="stripe-tooltip-name">{name}:</span>
              <strong className="stripe-tooltip-value tabular-num">
                {val} {unit && <span className="stripe-tooltip-unit">{unit}</span>}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
