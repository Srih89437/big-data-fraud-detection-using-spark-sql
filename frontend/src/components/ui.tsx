// Design System UI Primitives: animated counters, metric cards, analytical badges,
// section headers, loading skeletons and staggered reveals.
// All animations strictly respect prefers-reduced-motion.

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, HelpCircle } from 'lucide-react';

export const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smooth count-up number that respects reduced-motion and Indian locale formatting. */
export function CountUp({
  value,
  duration = 0.85,
  decimals = 0,
  format = (n: number) => n.toLocaleString('en-IN'),
}: {
  value: number;
  duration?: number;
  decimals?: number;
  format?: (n: number) => string;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => format(fix(v, decimals)));
  const [text, setText] = useState(() => format(fix(value, decimals)));

  useEffect(() => {
    if (reduceMotion()) {
      mv.set(value);
      setText(format(fix(value, decimals)));
      return;
    }
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on('change', (v) => setText(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, duration, decimals, mv, rounded, format]);

  return <span className="tabular-num">{text}</span>;
}

function fix(n: number, decimals: number): number {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

export interface MetricProps {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  sub?: ReactNode;
  primary?: boolean;
  hint?: string;
  badge?: ReactNode;
  trend?: {
    value: number;
    label?: string;
    inverse?: boolean; // if true, up is green, down is red (default: up is alert red, down is green)
  };
}

export function Metric({
  label,
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  sub,
  primary,
  hint,
  badge,
  trend,
}: MetricProps) {
  return (
    <div className={`stripe-metric-card ${primary ? 'metric-primary' : ''}`}>
      <div className="metric-header">
        <span className="metric-label">
          {label}
          {hint && (
            <span className="metric-hint-icon" title={hint} aria-label={hint}>
              <HelpCircle size={12} />
            </span>
          )}
        </span>
        {badge && <div className="metric-badge-slot">{badge}</div>}
      </div>

      <div className="metric-value-wrap">
        {prefix && <span className="metric-prefix">{prefix}</span>}
        <strong className="metric-value">
          <CountUp value={value} decimals={decimals} />
        </strong>
        {suffix && <span className="metric-suffix">{suffix}</span>}
      </div>

      <div className="metric-footer">
        {trend && (
          <TrendPill
            value={trend.value}
            label={trend.label}
            inverse={trend.inverse}
          />
        )}
        {sub && <div className="metric-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function TrendPill({
  value,
  label,
  inverse = false,
}: {
  value: number;
  label?: string;
  inverse?: boolean;
}) {
  const isUp = value > 0.05;
  const isDown = value < -0.05;
  const isZero = !isUp && !isDown;

  // For crime metrics: increase is surge (alert), decrease is positive (green)
  let statusClass = 'neutral';
  if (isUp) statusClass = inverse ? 'positive' : 'alert';
  if (isDown) statusClass = inverse ? 'alert' : 'positive';

  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;

  return (
    <span className={`trend-pill ${statusClass}`}>
      <Icon size={12} strokeWidth={2.2} />
      <span>
        {isUp ? '+' : ''}
        {value.toFixed(1)}%
      </span>
      {label && <small className="trend-label">{label}</small>}
    </span>
  );
}

export function SectionIndex({ index, title }: { index: string; title: string }) {
  return (
    <div className="section-index-badge">
      <span className="section-index-num">{index}</span>
      <span className="section-index-sep">/</span>
      <span className="section-index-name">{title}</span>
    </div>
  );
}

/** Staggered reveal wrapper for section content with physics easing. */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={reduceMotion() ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Skeleton({
  height = 16,
  width = '100%',
  className = '',
  radius = 6,
}: {
  height?: number | string;
  width?: number | string;
  className?: string;
  radius?: number;
}) {
  return (
    <div
      className={`stripe-skeleton ${className}`}
      style={{ height, width, borderRadius: radius }}
    />
  );
}

export function Panel({
  index,
  title,
  actions,
  children,
  className = '',
  description,
}: {
  index?: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
}) {
  return (
    <section className={`stripe-panel ${className}`}>
      <div className="stripe-panel-header">
        <div className="stripe-panel-header-left">
          {index && (
            <span className="stripe-panel-index">{index}</span>
          )}
          <div className="stripe-panel-titles">
            <h2 className="stripe-panel-title">{title}</h2>
            {description && <p className="stripe-panel-desc">{description}</p>}
          </div>
        </div>
        {actions && <div className="stripe-panel-actions">{actions}</div>}
      </div>
      <div className="stripe-panel-body">{children}</div>
    </section>
  );
}

export function StatusIndicator({
  status = 'active',
  label,
}: {
  status?: 'active' | 'warning' | 'idle';
  label: string;
}) {
  return (
    <span className={`status-tag status-${status}`}>
      <span className="status-dot">
        <span className="status-ping" />
      </span>
      <span className="status-text">{label}</span>
    </span>
  );
}
