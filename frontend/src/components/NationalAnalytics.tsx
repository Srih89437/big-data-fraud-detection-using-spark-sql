// National Analytics: Executive Comparative Analytics Suite.
// Multi-dimensional breakdowns: Five-year longitudinal trajectory, State vs UT split,
// Top 15 ranked jurisdictions bar chart with click-through, and volume stratification bands.
// Powered strictly by Apache Spark SQL aggregations.

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart2,
  Layers,
  Calendar,
  ArrowUpRight,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import type { OverviewResponse, StateRow, TrendPoint } from '../lib/types';
import { Skeleton } from './ui';
import { StripeChartTooltip, InteractiveCard } from './MotionPrimitives';

export interface NationalAnalyticsProps {
  year: number;
  years: number[];
  states: StateRow[];
  trends: TrendPoint[];
  overview: OverviewResponse | null;
  loading: boolean;
  onSelect: (name: string) => void;
  onYearChange: (y: number) => void;
}

const fmt = (n: number) => n.toLocaleString('en-IN');

export function NationalAnalytics({
  year,
  years,
  states,
  trends,
  overview,
  loading,
  onSelect,
  onYearChange,
}: NationalAnalyticsProps) {
  const byCategory = useMemo(() => {
    const s = states.filter((x) => x.category === 'State').reduce((a, b) => a + b.cases, 0);
    const u = states.filter((x) => x.category === 'Union Territory').reduce((a, b) => a + b.cases, 0);
    return [
      { name: 'Constitutional States (28)', value: s, count: states.filter((x) => x.category === 'State').length },
      { name: 'Union Territories (8)', value: u, count: states.filter((x) => x.category === 'Union Territory').length },
    ];
  }, [states]);

  const sorted = useMemo(
    () => [...states].sort((a, b) => b.cases - a.cases),
    [states],
  );

  const top15 = useMemo(() => sorted.slice(0, 15), [sorted]);

  // Distribution: how many jurisdictions fall into each case-count band
  const distribution = useMemo(() => {
    const bands = [
      { label: '0 Cases', min: 0, max: 0, desc: 'Zero incidents recorded' },
      { label: '1–99', min: 1, max: 99, desc: 'Low density' },
      { label: '100–499', min: 100, max: 499, desc: 'Emerging risk' },
      { label: '500–1,999', min: 500, max: 1999, desc: 'Moderate density' },
      { label: '2,000–9,999', min: 2000, max: 9999, desc: 'High density' },
      { label: '10,000+', min: 10000, max: Infinity, desc: 'Critical epicenters' },
    ];
    return bands.map((b) => ({
      band: b.label,
      desc: b.desc,
      jurisdictions: states.filter((s) => s.cases >= b.min && s.cases <= b.max).length,
    }));
  }, [states]);

  const yearTotals = useMemo(
    () => trends.map((t) => ({ year: String(t.year), cases: t.cases })),
    [trends],
  );

  const totalCases = overview?.total_cases ?? 0;
  const statesTotal = byCategory[0]?.value ?? 0;
  const utTotal = byCategory[1]?.value ?? 0;
  const statesPct = totalCases > 0 ? ((statesTotal / totalCases) * 100).toFixed(1) : '0';
  const utPct = totalCases > 0 ? ((utTotal / totalCases) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="analytics-root-container">
        <Skeleton height={420} className="analytics-skeleton" />
      </div>
    );
  }

  return (
    <div className="analytics-root-container">
      {/* Header Command Bar */}
      <div className="analytics-header-deck">
        <div className="analytics-header-left">
          <div className="analytics-eyebrow">
            <span className="eyebrow-accent-dot" />
            <span className="eyebrow-title">COMPARATIVE ANALYTICS OBSERVATORY</span>
            <span className="eyebrow-slash">/</span>
            <span className="eyebrow-year">CALENDAR YEAR {year}</span>
          </div>
          <h1 className="analytics-main-headline">
            National Trends &
            <span className="headline-gradient-text"> Jurisdictional Stratification.</span>
          </h1>
          <p className="analytics-headline-desc">
            Multi-dimensional synthesis of official police cybercrime registrations. Explores sovereign administrative divisions,
            frequency clustering, top jurisdiction rankings, and multi-year progression patterns across the Republic of India.
          </p>
        </div>

        {/* Year Pill Scrubber */}
        <div className="analytics-year-scrubber">
          <span className="scrubber-label">ACTIVE TIMEFRAME</span>
          <div className="scrubber-pill-row">
            {years.map((y) => {
              const isActive = year === y;
              return (
                <button
                  key={y}
                  className={`scrubber-btn ${isActive ? 'active-scrubber-btn' : ''}`}
                  onClick={() => onYearChange(y)}
                >
                  {isActive && (
                    <motion.div
                      className="scrubber-active-pill"
                      layoutId="analyticsYearIndicator"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="scrubber-text">{y}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 1: Sovereign Split & Five-Year Longitudinal Evolution */}
      <div className="analytics-twin-grid">
        {/* Card 1: 5-Year Trajectory */}
        <div className="analytics-card trajectory-card">
          <div className="analytics-card-header">
            <div className="card-header-title">
              <TrendingUp size={16} />
              <h3>All-India Longitudinal Trajectory (2020–2024)</h3>
            </div>
            <span className="card-header-badge">SPARK SQL PIPELINE</span>
          </div>
          <div className="card-chart-area">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={yearTotals} margin={{ top: 14, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={46}
                />
                <ChartTooltip content={<StripeChartTooltip unit="cases" />} />
                <Line
                  type="monotone"
                  dataKey="cases"
                  name="All-India Registrations"
                  stroke="var(--accent-primary)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--accent-primary)', stroke: 'var(--surface-base)', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: 'var(--accent-primary)', stroke: 'var(--surface-base)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card-footer-meta">
            <span>National totals derived from validated NCRB records across all 36 reporting police jurisdictions.</span>
          </div>
        </div>

        {/* Card 2: Sovereign Split Donut & Breakdown */}
        <div className="analytics-card sovereign-split-card">
          <div className="analytics-card-header">
            <div className="card-header-title">
              <PieIcon size={16} />
              <h3>Constitutional Sovereign Classification ({year})</h3>
            </div>
            <span className="card-header-badge">STATES VS UTs</span>
          </div>

          <div className="sovereign-donut-content">
            <div className="donut-canvas-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={4}
                  >
                    <Cell fill="var(--accent-primary)" />
                    <Cell fill="var(--accent-teal)" />
                  </Pie>
                  <ChartTooltip content={<StripeChartTooltip unit="cases" />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center-anchor">
                <span className="anchor-number">{fmt(totalCases)}</span>
                <span className="anchor-label">NATIONAL TOTAL</span>
              </div>
            </div>

            <div className="sovereign-stats-column">
              <div className="split-metric-tile">
                <div className="split-metric-header">
                  <span className="split-color-dot dot-states" />
                  <strong>28 Constitutional States</strong>
                </div>
                <div className="split-metric-body">
                  <span className="split-number">{fmt(statesTotal)}</span>
                  <span className="split-pct">{statesPct}% of India</span>
                </div>
              </div>

              <div className="split-metric-tile">
                <div className="split-metric-header">
                  <span className="split-color-dot dot-uts" />
                  <strong>8 Union Territories</strong>
                </div>
                <div className="split-metric-body">
                  <span className="split-number">{fmt(utTotal)}</span>
                  <span className="split-pct">{utPct}% of India</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Top 15 Ranked Jurisdictions Pareto Bar Chart */}
      <div className="analytics-card pareto-top15-card">
        <div className="analytics-card-header">
          <div className="card-header-title">
            <BarChart2 size={16} />
            <h3>Top 15 Ranked Jurisdictions by Registration Volume ({year})</h3>
          </div>
          <span className="card-header-badge">CLICK BARS TO VIEW STATE DOSSIER</span>
        </div>

        <div className="pareto-chart-canvas">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={top15}
              margin={{ top: 16, right: 20, left: 20, bottom: 44 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis
                dataKey="state_ut"
                angle={-38}
                textAnchor="end"
                interval={0}
                tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-sans)' }}
                stroke="var(--border-subtle)"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                width={40}
              />
              <ChartTooltip content={<StripeChartTooltip unit="cases" />} />
              <Bar
                dataKey="cases"
                name="Registered Cases"
                radius={[6, 6, 0, 0]}
                onClick={(data) => {
                  if (data?.state_ut) onSelect(data.state_ut);
                }}
                className="clickable-bar"
              >
                {top15.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? 'var(--accent-amber)' : index < 3 ? 'var(--accent-primary)' : 'var(--accent-teal)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Case Volume Stratification Matrix */}
      <div className="analytics-card distribution-card">
        <div className="analytics-card-header">
          <div className="card-header-title">
            <Layers size={16} />
            <h3>Jurisdictional Frequency Stratification Spectrum</h3>
          </div>
          <span className="card-header-badge">INCIDENCE BANDS</span>
        </div>

        <div className="distribution-band-grid">
          {distribution.map((d) => (
            <div key={d.band} className="distribution-band-cell">
              <span className="band-range-title">{d.band}</span>
              <div className="band-count-display">
                <span className="count-val">{d.jurisdictions}</span>
                <span className="count-unit">Jurisdictions</span>
              </div>
              <span className="band-description">{d.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
