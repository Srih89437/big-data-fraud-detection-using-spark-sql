import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

/**
 * Shared card interaction with a restrained lift on hover and press.
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
