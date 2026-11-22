// Overview of statewise cybercrime registrations and national trends.

import { useMemo, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Calendar,
  ChevronRight,
  Compass,
  Landmark,
  Layers,
  MapPin,
  Shield,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import type { OverviewResponse, StateRow, TrendPoint } from '../lib/types';
import { LazyIndiaMap3D as IndiaMap3D } from '../map/lazy';
import { CountUp, Skeleton, TrendPill } from './ui';
import { StripeChartTooltip } from './MotionPrimitives';

export interface OverviewProps {
  year: number;
  years: number[];
  onYearChange: (y: number) => void;
  overview: OverviewResponse | null;
  states: StateRow[];
  trends: TrendPoint[];
  loading: boolean;
  selected: string | null;
  dark: boolean;
  onSelect: (name: string) => void;
}

const fmt = (n: number) => n.toLocaleString('en-IN');

function calculateYearDelta(trends: TrendPoint[], year: number) {
  const cur = trends.find((t) => t.year === year)?.cases;
  const prev = trends.find((t) => t.year === year - 1)?.cases;
  if (cur == null || prev == null || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

export function Overview({
  year,
  years,
  onYearChange,
  overview,
  states,
  trends,
  loading,
  selected,
  dark,
  onSelect,
}: OverviewProps) {
  const [trajectoryMode, setTrajectoryMode] = useState<'volume' | 'velocity'>('volume');

  const cases = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of states) m.set(s.state_ut, s.cases);
    return m;
  }, [states]);

  const stateCount = states.filter((s) => s.category === 'State').length;
  const utCount = states.filter((s) => s.category === 'Union Territory').length;

  const sortedStates = useMemo(
    () => [...states].sort((a, b) => b.cases - a.cases),
    [states],
  );

  const topJurisdictions = useMemo(
    () => sortedStates.slice(0, 8),
    [sortedStates],
  );

  const highestCases = topJurisdictions[0]?.cases ?? 1;
  const totalCases = overview?.total_cases ?? 0;

  // Longitudinal trajectory data with computed growth rates
  const trajectoryData = useMemo(() => {
    return trends.map((t, idx) => {
      const prevCases = idx > 0 ? trends[idx - 1]?.cases ?? 0 : null;
      const velocity =
        prevCases && prevCases > 0
          ? Math.round(((t.cases - prevCases) / prevCases) * 1000) / 10
          : 0;
      return {
        year: String(t.year),
        cases: t.cases,
        velocity,
        isCurrent: t.year === year,
      };
    });
  }, [trends, year]);

  const yoyDelta = useMemo(() => calculateYearDelta(trends, year), [trends, year]);

  const top5Total = useMemo(
    () => sortedStates.slice(0, 5).reduce((sum, s) => sum + s.cases, 0),
    [sortedStates],
  );

  const top5Share =
    totalCases > 0 ? ((top5Total / totalCases) * 100).toFixed(1) : '0';

  const maxHistoricalCases = Math.max(...trends.map((t) => t.cases), 1);

  return (
    <div className="overview-root">
      {/* ---------------------------------------------------------------------
          COMMAND HEADER: Platform Title, Status Badge, and Time Navigator
          --------------------------------------------------------------------- */}
      <section className="command-hero-header">
        <div className="hero-title-block">
          <div className="telemetry-tag-row">
            <span className="live-pulse-badge">
              <span className="pulse-dot" />
              <span>INDIA · 2020–2024</span>
            </span>
            <span className="telemetry-separator">/</span>
            <span className="telemetry-meta">STATEWISE CASE DATA</span>
            <span className="telemetry-separator">/</span>
            <span className="telemetry-meta">ANNUAL CYCLE {year}</span>
          </div>

          <h1 className="hero-headline">
            Cybercrime registrations
            <span className="hero-gradient-text"> across India.</span>
          </h1>
          <p className="hero-lead">
            Explore recorded cases by state and union territory, compare years, and inspect the underlying dataset.
          </p>
        </div>

        {/* Tactile Year Pill Timeline */}
        <div className="hero-timeline-card">
          <div className="timeline-header">
            <span className="timeline-title">REPORTING CYCLE</span>
            <span className="timeline-active-tag">{year} FISCAL</span>
          </div>
          <div className="timeline-buttons-row">
            {years.map((y) => {
              const active = year === y;
              return (
                <button
                  key={y}
                  className={`timeline-year-btn ${active ? 'active' : ''}`}
                  onClick={() => onYearChange(y)}
                  aria-pressed={active}
                >
                  {active && (
                    <motion.div
                      className="timeline-pill-active"
                      layoutId="activeTimelinePill"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="year-num">{y}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
          ASYMMETRIC COMMAND STAGE: Grand Volume Metrics & Interactive 3D Radar
          --------------------------------------------------------------------- */}
      <div className="asymmetric-command-grid">
        {/* Left Column: National Volume & Trajectory Console */}
        <div className="command-primary-col">
          {/* Grand National Volume Tile */}
          <div className="grand-volume-tile">
            <div className="tile-ambient-glow" />
            <div className="grand-tile-header">
              <div className="tile-badge-group">
                <span className="tile-icon-box">
                  <ShieldAlert size={16} />
                </span>
                <span className="tile-label">TOTAL REGISTERED CYBER CRIMES</span>
              </div>
              {yoyDelta !== null && (
                <TrendPill value={yoyDelta} label={`vs ${year - 1}`} />
              )}
            </div>

            <div className="grand-number-row">
              <div className="grand-display-number">
                {loading || !overview ? (
                  <Skeleton height={58} width={280} />
                ) : (
                  <CountUp value={overview.total_cases} />
                )}
              </div>
              <div className="grand-sparkline-shelf">
                <div className="shelf-label">5-YR TRAJECTORY</div>
                <div className="micro-sparkline-bars">
                  {trends.map((t) => (
                    <div
                      key={t.year}
                      className={`micro-bar-col ${t.year === year ? 'active-col' : ''}`}
                      title={`${t.year}: ${fmt(t.cases)} cases`}
                    >
                      <div
                        className="micro-bar-fill"
                        style={{ height: `${Math.max(6, (t.cases / maxHistoricalCases) * 32)}px` }}
                      />
                      <span className="micro-bar-yr">{String(t.year).slice(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Split Distribution Bar */}
            <div className="split-distribution-shelf">
              <div className="split-meta-row">
                <div className="split-item">
                  <span className="split-dot state-dot" />
                  <span className="split-name">States ({stateCount}):</span>
                  <strong className="split-val">
                    {loading || !overview ? '—' : fmt(overview.state_cases)}
                  </strong>
                  <span className="split-pct">
                    ({totalCases > 0 ? ((overview!.state_cases / totalCases) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="split-item">
                  <span className="split-dot ut-dot" />
                  <span className="split-name">Union Territories ({utCount}):</span>
                  <strong className="split-val">
                    {loading || !overview ? '—' : fmt(overview.ut_cases)}
                  </strong>
                  <span className="split-pct">
                    ({totalCases > 0 ? ((overview!.ut_cases / totalCases) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>

              <div className="split-progress-track">
                <div
                  className="split-fill-states"
                  style={{ width: `${totalCases > 0 ? (overview!.state_cases / totalCases) * 100 : 98}%` }}
                />
                <div
                  className="split-fill-uts"
                  style={{ width: `${totalCases > 0 ? (overview!.ut_cases / totalCases) * 100 : 2}%` }}
                />
              </div>
            </div>
          </div>

          {/* Longitudinal Trajectory Chart Console */}
          <div className="trajectory-console-tile">
            <div className="console-header-row">
              <div className="console-title-group">
                <TrendingUp size={16} className="console-icon" />
                <div>
                  <h3 className="console-title">Longitudinal Crime Trajectory</h3>
                  <p className="console-sub">Multi-year national registered incident momentum (2020–2024)</p>
                </div>
              </div>

              <div className="trajectory-mode-switch">
                <button
                  className={`mode-btn ${trajectoryMode === 'volume' ? 'active' : ''}`}
                  onClick={() => setTrajectoryMode('volume')}
                >
                  Volume
                </button>
                <button
                  className={`mode-btn ${trajectoryMode === 'velocity' ? 'active' : ''}`}
                  onClick={() => setTrajectoryMode('velocity')}
                >
                  Velocity (% YoY)
                </button>
              </div>
            </div>

            <div className="trajectory-chart-wrapper">
              <ResponsiveContainer width="100%" height={230}>
                {trajectoryMode === 'volume' ? (
                  <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#635BFF" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#635BFF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                    <XAxis
                      dataKey="year"
                      stroke={dark ? '#64748B' : '#94A3B8'}
                      fontSize={11}
                      fontFamily="var(--font-mono)"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={dark ? '#64748B' : '#94A3B8'}
                      fontSize={11}
                      fontFamily="var(--font-mono)"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                    />
                    <ChartTooltip content={<StripeChartTooltip valueFormatter={(v) => fmt(v)} unit="FIRs" />} />
                    <Area
                      type="monotone"
                      dataKey="cases"
                      name="Registered FIRs"
                      stroke="#635BFF"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#areaGradientPrimary)"
                      animationDuration={700}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={trajectoryData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                    <XAxis
                      dataKey="year"
                      stroke={dark ? '#64748B' : '#94A3B8'}
                      fontSize={11}
                      fontFamily="var(--font-mono)"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={dark ? '#64748B' : '#94A3B8'}
                      fontSize={11}
                      fontFamily="var(--font-mono)"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <ChartTooltip content={<StripeChartTooltip valueFormatter={(v) => `${v}%`} unit="YoY growth" />} />
                    <Bar
                      dataKey="velocity"
                      name="YoY Growth Rate"
                      fill="#0EA5E9"
                      radius={[4, 4, 0, 0]}
                      animationDuration={700}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive 3D Geospatial Live Radar */}
        <div className="command-geospatial-col">
          <div className="geospatial-radar-card">
            <div className="radar-header-bar">
              <div className="radar-status-pill">
                <span className="live-ping" />
                <span className="radar-status-text">INDIA 3D MAP</span>
              </div>
              <span className="radar-meta-badge">36 BOUNDARIES EXTRACTED</span>
            </div>

            {/* 3D Map Viewport Frame */}
            <div className="radar-viewport-stage">
              <Suspense
                fallback={
                  <div className="map-loading-stage">
                    <div className="map-spinner" />
                    <span>Mounting WebGL Choropleth Engine…</span>
                  </div>
                }
              >
                <IndiaMap3D
                  cases={cases}
                  selected={selected}
                  year={year}
                  dark={dark}
                  onSelect={onSelect}
                  compact
                />
              </Suspense>

              {/* Viewport Floating Footer */}
              <div className="radar-floating-footer">
                <span>Case range: 0–{fmt(highestCases)}</span>
                <span className="radar-instruction">Select a state to open its dossier</span>
              </div>
            </div>

            {/* Concentration Stat Footer */}
            <div className="concentration-stat-bar">
              <div className="concentration-icon-box">
                <Activity size={15} />
              </div>
              <div className="concentration-text">
                <strong>{top5Share}%</strong> of all cybercrime in {year} is concentrated across the top 5 states ({fmt(top5Total)} cases).
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          TACTICAL HOTSPOTS LEADERBOARD: Interactive High-Velocity State Tiles
          --------------------------------------------------------------------- */}
      <section className="hotspots-section">
        <div className="section-title-row">
          <div>
            <h2 className="section-title">Highest case counts</h2>
            <p className="section-sub">Highest reported police-registered incident volumes for reporting cycle {year}</p>
          </div>
          <span className="section-count-badge">Top {topJurisdictions.length} of 36</span>
        </div>

        <div className="hotspots-grid">
          {loading ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="hotspot-skeleton-card">
                <Skeleton height={110} />
              </div>
            ))
          ) : (
            topJurisdictions.map((state, idx) => {
              const rank = idx + 1;
              const isSelected = selected === state.state_ut;
              const share = totalCases > 0 ? ((state.cases / totalCases) * 100).toFixed(1) : '0';
              const barWidth = Math.max(4, (state.cases / highestCases) * 100);

              return (
                <motion.div
                  key={state.state_ut}
                  className={`hotspot-tile ${isSelected ? 'active-tile' : ''}`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  onClick={() => onSelect(state.state_ut)}
                >
                  <div className="tile-top-row">
                    <div className="tile-rank-group">
                      <span className={`rank-badge ${rank <= 3 ? `rank-${rank}` : ''}`}>
                        #{rank}
                      </span>
                      <span className="state-name">{state.state_ut}</span>
                    </div>
                    <span className="category-pill">
                      {state.category === 'Union Territory' ? 'UT' : 'STATE'}
                    </span>
                  </div>

                  <div className="tile-numbers-row">
                    <span className="cases-count">{fmt(state.cases)}</span>
                    <span className="share-text">{share}% of nat'l</span>
                  </div>

                  <div className="tile-progress-track">
                    <div className="tile-progress-fill" style={{ width: `${barWidth}%` }} />
                  </div>

                  <div className="tile-action-row">
                    <span className="action-link">Open State Dossier</span>
                    <ChevronRight size={12} className="chevron" />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
