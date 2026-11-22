// State Intelligence: Jurisdiction Intelligence Dossier.
// Police FIR records sourced via Apache Spark SQL backend.

import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  MapPin,
  Building,
  Award,
  PieChart,
  Activity,
  ChevronDown,
  Search,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';
import { fetchStateDetail } from '../lib/api';
import type { OverviewResponse, StateDetailResponse, StateRow, TrendPoint } from '../lib/types';
import { CountUp, Skeleton, TrendPill } from './ui';
import { StripeChartTooltip, InteractiveCard } from './MotionPrimitives';
import { LazyIndiaMap3D as IndiaMap3D } from '../map/lazy';

export interface StateIntelProps {
  selected: string | null;
  year: number;
  years: number[];
  states: StateRow[];
  overview: OverviewResponse | null;
  trends: TrendPoint[];
  loading: boolean;
  dark: boolean;
  onOpenMap: () => void;
  onSelect: (name: string) => void;
}

const fmt = (n: number) => n.toLocaleString('en-IN');

function yearKeys(detail: StateDetailResponse | null): string[] {
  if (!detail) return [];
  return Object.keys(detail)
    .filter((k) => /^\d{4}$/.test(k))
    .sort();
}

export function StateIntelligence({
  selected,
  year,
  years,
  states,
  overview,
  trends,
  loading,
  dark,
  onOpenMap,
  onSelect,
}: StateIntelProps) {
  const [detail, setDetail] = useState<StateDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherQuery, setSwitcherQuery] = useState('');
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setError(null);
    fetchStateDetail(selected)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const row = useMemo(
    () => states.find((s) => s.state_ut === selected) ?? null,
    [states, selected],
  );

  const sortedStates = useMemo(
    () => [...states].sort((a, b) => b.cases - a.cases),
    [states],
  );
  const caseCounts = useMemo(
    () => new Map(states.map((state) => [state.state_ut, state.cases])),
    [states],
  );

  const ranking = useMemo(() => {
    if (!selected) return null;
    const idx = sortedStates.findIndex((s) => s.state_ut === selected);
    return idx >= 0 ? { rank: idx + 1, of: sortedStates.length } : null;
  }, [sortedStates, selected]);

  const keys = yearKeys(detail);
  const currentYearKey = String(year);
  const currentCases =
    detail && currentYearKey in detail ? Number(detail[currentYearKey]) : null;
  const prevYearKey = String(year - 1);
  const prevCases =
    detail && prevYearKey in detail ? Number(detail[prevYearKey]) : null;

  const nationalTotal = overview?.total_cases ?? 0;
  const share =
    currentCases != null && nationalTotal > 0
      ? (currentCases / nationalTotal) * 100
      : null;

  const yoyChange = useMemo(() => {
    if (currentCases == null || prevCases == null || prevCases <= 0) return null;
    return ((currentCases - prevCases) / prevCases) * 100;
  }, [currentCases, prevCases]);

  // Five year series
  const series = useMemo(
    () =>
      keys.map((k) => ({
        year: k,
        cases: detail ? Number(detail[k]) : 0,
      })),
    [keys, detail],
  );

  const highestNational = sortedStates[0]?.cases ?? 1;
  const nationalAverage = nationalTotal > 0 && states.length > 0 ? Math.round(nationalTotal / states.length) : 0;
  const ratioToAvg = nationalAverage > 0 && currentCases != null ? (currentCases / nationalAverage).toFixed(1) : '1.0';

  // Filtered list for jurisdiction quick switcher
  const filteredSwitchList = useMemo(() => {
    if (!switcherQuery.trim()) return sortedStates;
    const q = switcherQuery.toLowerCase();
    return sortedStates.filter((s) => s.state_ut.toLowerCase().includes(q));
  }, [sortedStates, switcherQuery]);

  if (!selected) {
    return (
      <div className="dossier-root-container">
        <div className="empty-intel-state">
          <MapPin size={32} className="empty-intel-icon" />
          <h3>No Jurisdiction Selected</h3>
          <p>
            Choose a state or Union Territory from the 3D map or the directory below to view its intelligence dossier.
          </p>
          <button className="stripe-glow-btn" onClick={onOpenMap}>
            <span>Open India 3D Map</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dossier-root-container">
      {/* Classification Watermark Header */}
      <div className="dossier-jurisdiction-banner">
        <div className="jurisdiction-banner-left">
          <ShieldCheck size={14} className="banner-icon" />
          <span className="banner-classification">STATE DOSSIER // CRIME IN INDIA</span>
        </div>
        <div className="jurisdiction-banner-right">
          <span className="banner-engine">SPARK SQL IN-MEMORY PROFILE · JURISDICTION #{ranking?.rank ?? '—'}</span>
        </div>
      </div>

      {/* Grand Identity Bar */}
      <div className="dossier-hero-identity">
        <div className="dossier-identity-left">
          <div className="dossier-eyebrow-row">
            <span className="dossier-status-dot" />
            <span className="dossier-eyebrow-text">JURISDICTION INTELLIGENCE PROFILE</span>
            <span className="dossier-eyebrow-sep">/</span>
            <span className="dossier-year-indicator">REPORTING YEAR {year}</span>
          </div>
          <div className="dossier-title-group">
            <h1 className="dossier-main-title">{selected}</h1>
            <span className="dossier-tier-badge">
              {detail?.category === 'Union Territory' ? 'UNION TERRITORY' : 'CONSTITUTIONAL STATE'}
            </span>
            {ranking && (
              <span className="dossier-national-rank-chip">
                <Award size={14} />
                <span>RANK #{ranking.rank} IN INDIA</span>
              </span>
            )}
          </div>
        </div>

        <div className="dossier-identity-right">
          {/* Custom Luxury Switcher Dropdown */}
          <div className="jurisdiction-switcher-wrap">
            <button
              className="switcher-trigger-btn"
              onClick={() => setSwitcherOpen(!switcherOpen)}
              aria-expanded={switcherOpen}
            >
              <Search size={14} />
              <span>Switch Jurisdiction</span>
              <ChevronDown size={14} className={`chevron-icon ${switcherOpen ? 'rotate' : ''}`} />
            </button>

            {switcherOpen && (
              <div className="switcher-dropdown-dialog">
                <div className="switcher-search-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search 36 States & UTs…"
                    value={switcherQuery}
                    onChange={(e) => setSwitcherQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="switcher-scroll-list">
                  {filteredSwitchList.map((s, idx) => (
                    <button
                      key={s.state_ut}
                      className={`switcher-row-btn ${s.state_ut === selected ? 'active-row' : ''}`}
                      onClick={() => {
                        onSelect(s.state_ut);
                        setSwitcherOpen(false);
                        setSwitcherQuery('');
                      }}
                    >
                      <span className="switcher-rank-tag">#{idx + 1}</span>
                      <span className="switcher-name-label">{s.state_ut}</span>
                      <span className="switcher-cases-count">{fmt(s.cases)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="ghost-action-btn" onClick={onOpenMap} title="View in 3D Map">
            <MapPin size={15} />
            <span>View on 3D Map</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-callout">
          Could not load state detail: {error}. National baseline figures remain active.
        </div>
      )}

      {/* 4 Grand Tactical KPI Tiles */}
      <div className="dossier-kpi-quad">
        {/* KPI 1 */}
        <InteractiveCard>
          <div className="tactical-dossier-tile highlight-tile">
            <div className="tile-top-bar">
              <span className="tile-label">REGISTERED CASES ({year})</span>
              {yoyChange !== null && <TrendPill value={yoyChange} label={`vs ${year - 1}`} />}
            </div>
            <div className="tile-core-val">
              {detailLoading || loading ? (
                <Skeleton height={44} width={180} />
              ) : (
                <CountUp value={currentCases ?? 0} />
              )}
            </div>
            <div className="tile-bottom-meta">
              <span>Cybercrime FIRs recorded by state police departments</span>
            </div>
          </div>
        </InteractiveCard>

        {/* KPI 2 */}
        <InteractiveCard>
          <div className="tactical-dossier-tile">
            <div className="tile-top-bar">
              <span className="tile-label">NATIONAL SHARE</span>
              <PieChart size={15} className="tile-top-icon" />
            </div>
            <div className="tile-core-val">
              {detailLoading || loading ? (
                <Skeleton height={44} width={130} />
              ) : (
                <span className="tabular-num">{share != null ? share.toFixed(1) : '0.0'}%</span>
              )}
            </div>
            <div className="tile-bottom-meta">
              <span>Of total {fmt(nationalTotal)} nationwide cybercrime cases</span>
            </div>
          </div>
        </InteractiveCard>

        {/* KPI 3 */}
        <InteractiveCard>
          <div className="tactical-dossier-tile">
            <div className="tile-top-bar">
              <span className="tile-label">ALL-INDIA STANDING</span>
              <Award size={15} className="tile-top-icon" />
            </div>
            <div className="tile-core-val">
              {ranking ? (
                <span className="rank-display">
                  #{ranking.rank} <small>/ {ranking.of}</small>
                </span>
              ) : (
                '—'
              )}
            </div>
            <div className="tile-bottom-meta">
              <span>
                {ranking && ranking.rank <= 5
                  ? 'High Severity Hotspot: Top 5 in India'
                  : ranking && ranking.rank <= 15
                  ? 'Mid-High Density Corridor'
                  : 'Lower Incidence Quartile'}
              </span>
            </div>
          </div>
        </InteractiveCard>

        {/* KPI 4 */}
        <InteractiveCard>
          <div className="tactical-dossier-tile">
            <div className="tile-top-bar">
              <span className="tile-label">NATIONAL MEAN RATIO</span>
              <Activity size={15} className="tile-top-icon" />
            </div>
            <div className="tile-core-val">
              <span className="tabular-num">{ratioToAvg}x</span>
            </div>
            <div className="tile-bottom-meta">
              <span>National average: {fmt(nationalAverage)} cases per jurisdiction</span>
            </div>
          </div>
        </InteractiveCard>
      </div>

      {/* Asymmetric Deep-Dive Grid: Historical Trajectory + Jurisdictional Standing Barometer */}
      <div className="dossier-deep-grid">
        {/* Left Column: 5-Year Trajectory */}
        <div className="dossier-deep-card trajectory-card">
          <div className="deep-card-header">
            <div className="deep-header-title">
              <TrendingUp size={16} />
              <h3>Five-Year Registration Trajectory (2020–{year})</h3>
            </div>
            <span className="deep-header-badge">ANNUAL CRIME SERIES</span>
          </div>

          <div className="deep-card-chart-wrap">
            {detailLoading ? (
              <Skeleton height={280} />
            ) : series.length === 0 ? (
              <div className="empty-intel-state small">
                <p>No historical series available for this jurisdiction.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={series} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-subtle)' }}
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    width={50}
                  />
                  <ChartTooltip content={<StripeChartTooltip unit="cases" />} />
                  <Bar dataKey="cases" name="Registered FIRs" radius={[6, 6, 0, 0]} animationDuration={800}>
                    {series.map((s) => (
                      <Cell
                        key={s.year}
                        fill={s.year === currentYearKey ? 'var(--accent-primary)' : 'var(--bar-historical)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <section className="dossier-map-section">
            <div className="dossier-map-heading">
              <div>
                <span className="section-kicker">STATEWISE CONTEXT</span>
                <h2>India case map</h2>
              </div>
              <button className="ghost-action-btn" onClick={onOpenMap}>
                <MapPin size={14} />
                <span>Open full map</span>
              </button>
            </div>
            <div className="dossier-map-frame">
              <Suspense fallback={<Skeleton height="100%" />}>
                <IndiaMap3D
                  cases={caseCounts}
                  selected={selected}
                  year={year}
                  dark={dark}
                  onSelect={onSelect}
                  compact
                />
              </Suspense>
            </div>
          </section>
        </div>

        {/* Right Column: Comparative Standing Barometer */}
        <div className="dossier-deep-card barometer-card">
          <div className="deep-card-header">
            <div className="deep-header-title">
              <FileCheck2 size={16} />
              <h3>Jurisdictional Benchmark Matrix</h3>
            </div>
            <span className="deep-header-badge">RELATIVE VOLUMETRICS</span>
          </div>

          <div className="barometer-content">
            <div className="barometer-row">
              <div className="barometer-row-top">
                <span className="barometer-label">This Jurisdiction ({selected})</span>
                <strong className="barometer-val">{fmt(currentCases ?? 0)} FIRs</strong>
              </div>
              <div className="barometer-track">
                <div
                  className="barometer-fill fill-target"
                  style={{ width: `${Math.min(100, ((currentCases ?? 0) / highestNational) * 100)}%` }}
                />
              </div>
            </div>

            <div className="barometer-row">
              <div className="barometer-row-top">
                <span className="barometer-label">National Ceiling ({sortedStates[0]?.state_ut})</span>
                <strong className="barometer-val">{fmt(highestNational)} FIRs</strong>
              </div>
              <div className="barometer-track">
                <div className="barometer-fill fill-ceiling" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="barometer-row">
              <div className="barometer-row-top">
                <span className="barometer-label">National Average (All 36 Jurisdictions)</span>
                <strong className="barometer-val">{fmt(nationalAverage)} FIRs</strong>
              </div>
              <div className="barometer-track">
                <div
                  className="barometer-fill fill-average"
                  style={{ width: `${Math.min(100, (nationalAverage / highestNational) * 100)}%` }}
                />
              </div>
            </div>

            <div className="barometer-context-callout">
              <h4>Analytical Assessment</h4>
              <p>
                In {year}, {selected} accounted for <strong>{share != null ? share.toFixed(1) : '0'}%</strong> of all cybercrimes registered in the Republic of India.
                {ranking && ranking.rank <= 5
                  ? ` It ranks among the top 5 cybercrime hubs nationwide, requiring prioritized law enforcement resources and digital crime investigation capability upgrades.`
                  : ` Its incidence levels remain aligned with the national median band.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
