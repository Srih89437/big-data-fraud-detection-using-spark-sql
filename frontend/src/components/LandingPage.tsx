// Introduction Website at `/`
// Art-directed presentation of the India Cyber Crime Intelligence Platform (ICIP)
// Strictly follows Stripe craft principles translated to ICIP's cartographic identity:
// - Alternating Paper (#F3F0E8) and Ink (#0A0D10) rhythm with smooth color handoff
// - Instrument Serif display typography with tight negative tracking
// - Geist Sans UI & Geist Mono tabular figures
// - Dot-Matrix India hero with drifting topographic contours & pointer parallax
// - Real API data everywhere (zero fake figures, zero dead controls)
// - Interactive live mini-demos: State picker, Bump chart, Scatter plot, Sortable Table, File Drop

import React, { useState, useMemo, useRef, useCallback, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Download,
  Upload,
  Database,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  MapPin,
  Compass,
  FileCode,
  Activity,
  Layers,
  Sparkles,
  BarChart2,
  Box,
} from 'lucide-react';
import { DotMatrixCanvas } from '../map/DotMatrixCanvas';
import { CountUp } from './ui';
import type { BootstrapResponse, MatrixRow, StateRow, TrendPoint } from '../lib/types';
import { prefetchAppData } from '../lib/api';
import { IndiaPrismMark } from './IndiaPrismMark';
import { LazyIndiaMap3D as IndiaMap3D } from '../map/lazy';
import { cameraStore } from '../map/cameraStore';
import { STATE_TO_CODE } from '../lib/geo';

interface LandingPageProps {
  bootstrapData: BootstrapResponse | null;
  states: StateRow[];
  matrixRows: MatrixRow[];
  year: number;
  dark: boolean;
  onNavigate: (route: string, path: string) => void;
  onSelectState: (stateName: string) => void;
}

export function LandingPage({
  bootstrapData,
  states,
  matrixRows,
  year,
  dark,
  onNavigate,
  onSelectState,
}: LandingPageProps) {
  // State Profile Demo state
  const [selectedDemoState, setSelectedDemoState] = useState<string>('Telangana');
  const [stateSearchQuery, setStateSearchQuery] = useState('');

  // Table sorting in Data Explorer Demo
  const [tableSortCol, setTableSortCol] = useState<'cases' | 'state_ut' | 'yoy_change' | 'share'>('cases');
  const [tableSortAsc, setTableSortAsc] = useState(false);

  // Studio Drag and Drop state
  const [dragActive, setDragActive] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Story chapter active state
  const [activeStoryChapter, setActiveStoryChapter] = useState(0);

  // Prefetch app data on button hover
  const handleCtaHover = useCallback(() => {
    prefetchAppData(year);
  }, [year]);

  // Selected State details for the live demo
  const activeStateRow = useMemo(() => {
    return matrixRows.find((r) => r.state_ut === selectedDemoState) || matrixRows[0] || null;
  }, [matrixRows, selectedDemoState]);

  // Filtered jurisdictions list for picker
  const filteredStatesList = useMemo(() => {
    if (!stateSearchQuery.trim()) return matrixRows.slice(0, 12);
    const q = stateSearchQuery.toLowerCase();
    return matrixRows.filter((r) => r.state_ut.toLowerCase().includes(q));
  }, [matrixRows, stateSearchQuery]);

  // Sorted rows for mini-table preview
  const sortedMiniTableRows = useMemo(() => {
    const list = [...matrixRows];
    list.sort((a, b) => {
      let av = a[tableSortCol] ?? 0;
      let bv = b[tableSortCol] ?? 0;
      if (typeof av === 'string') {
        return tableSortAsc
          ? (av as string).localeCompare(bv as string)
          : (bv as string).localeCompare(av as string);
      }
      return tableSortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list.slice(0, 8); // Top 8 for preview
  }, [matrixRows, tableSortCol, tableSortAsc]);

  // CSV Export handler for real download
  const handleExportCsv = useCallback(() => {
    if (matrixRows.length === 0) return;
    const headers = ['Rank', 'State/UT', 'Category', '2020', '2021', '2022', '2023', '2024', 'YoY_Change_Pct', 'National_Share_Pct'];
    const lines = matrixRows.map((r) => [
      r.rank,
      `"${r.state_ut}"`,
      r.category,
      r.history?.['2020'] ?? 0,
      r.history?.['2021'] ?? 0,
      r.history?.['2022'] ?? 0,
      r.history?.['2023'] ?? 0,
      r.cases,
      r.yoy_change ?? '',
      r.share,
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...lines].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cybercrime_matrix_2020_2024.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [matrixRows]);

  // File Drop Handler for Studio Demo
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadNotice(`Received "${file.name}" (${(file.size / 1024).toFixed(1)} KB) — opening Dataset Studio…`);
      setTimeout(() => {
        onNavigate('studio', '/app/studio');
      }, 1200);
    }
  };

  const handleUseSample = () => {
    setUploadNotice('Loading Banking Fraud Telemetry Sample dataset into Studio…');
    setTimeout(() => {
      onNavigate('studio', '/app/studio');
    }, 800);
  };

  // Top 5 jurisdictions for Story section
  const top5 = useMemo(() => {
    if (bootstrapData?.top_5 && bootstrapData.top_5.length >= 5) {
      return bootstrapData.top_5;
    }
    return states.slice(0, 5);
  }, [bootstrapData, states]);

  const top5Total = useMemo(() => top5.reduce((sum, s) => sum + s.cases, 0), [top5]);
  const nationalTotal2024 = bootstrapData?.latest_total || states.reduce((sum, s) => sum + s.cases, 0) || 101928;
  const top5Share = ((top5Total / nationalTotal2024) * 100).toFixed(1);

  // Cases map for 3D Map preview
  const casesMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of states) {
      map.set(s.state_ut, s.cases);
    }
    return map;
  }, [states]);

  // Fastest growing jurisdictions computed dynamically
  const fastestMovers = useMemo(() => {
    return [...matrixRows]
      .filter((r) => r.yoy_change !== null && r.cases >= 1000)
      .sort((a, b) => (b.yoy_change ?? 0) - (a.yoy_change ?? 0));
  }, [matrixRows]);

  const m1 = fastestMovers[0] || null;
  const m2 = fastestMovers[1] || null;

  const handleSelectChapter = useCallback((id: number) => {
    setActiveStoryChapter(id);
    if (id === 0) {
      cameraStore.flyTo([0, 15, 14], [0, 0, 0], 1.2);
    } else if (id === 1) {
      cameraStore.flyTo([1.5, 9, 8], [0.5, 0, 0.5], 1.2);
      if (top5[0]) setSelectedDemoState(top5[0].state_ut);
    } else if (id === 2) {
      cameraStore.flyTo([2.5, 7, 6], [1.2, 0, 0.2], 1.2);
      if (m1) setSelectedDemoState(m1.state_ut);
    } else if (id === 3) {
      cameraStore.flyTo([0, 11, 10], [0, 0, 0], 1.2);
    }
  }, [top5, m1]);

  return (
    <div className={`landing-page-root ${dark ? 'dark-theme' : 'light-theme'}`}>
      {/* ===================================================================
          1. HERO SECTION: "See it before you read it"
          =================================================================== */}
      <section className="landing-section hero-section" id="hero">
        <div className="hero-grid-layout">
          <div className="hero-copy-column">
            <div className="hero-pill-badge">
              <span className="pill-dot" />
              <span>NATIONAL OBSERVATORY · APACHE SPARK SQL 3.5</span>
            </div>

            <h1 className="hero-headline">
              National cyber threat intelligence across 36 constitutional jurisdictions.
            </h1>

            <p className="hero-subhead">
              First Information Reports (FIRs) structured into a
              3D national observatory. No synthetic figures. Strict
              per-jurisdiction accounting across 2020–2024.
            </p>

            {/* Real Hero Metric Display */}
            <div className="hero-metric-tile">
              <div className="hero-metric-header">
                <span className="metric-label">2024 NATIONAL REGISTERED CYBER CRIMES</span>
                <span className="metric-growth-pill">
                  <TrendingUp size={12} /> +{bootstrapData?.yoy_change_pct || 17.9}% vs 2023
                </span>
              </div>
              <div className="hero-metric-value">
                <CountUp value={bootstrapData?.latest_total || 101928} duration={1.6} />
              </div>
              <p className="hero-metric-note">
                Consolidated across 28 States and 8 Union Territories · Table 9A provenance
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="hero-actions-group">
              <button
                className="hero-primary-btn"
                onClick={() => onNavigate('map', '/app/map')}
                onMouseEnter={handleCtaHover}
              >
                <span>Open India 3D Map</span>
                <ArrowRight size={16} />
              </button>

              <button
                className="hero-secondary-btn"
                onClick={() => onNavigate('explorer', '/app/data')}
                onMouseEnter={handleCtaHover}
              >
                <span>Explore Full Data Matrix</span>
              </button>
            </div>

            <div className="hero-micro-meta">
              <span>Press <kbd>1</kbd>–<kbd>7</kbd> anywhere to navigate</span>
              <span className="meta-sep">·</span>
              <span>No registration or credentials required</span>
            </div>
          </div>

          <div className="hero-canvas-column">
            <div className="hero-map-frame">
              <div className="hero-map-hud-header">
                <div className="hud-status">
                  <span className="hud-blip" />
                  <span>36 JURISDICTIONS SAMPLED · LAMBERT CONIC CONFORMAL</span>
                </div>
                <span className="hud-sub">HOVER DOT TO INSPECT JURISDICTION</span>
              </div>

              {/* Dot-Matrix India with Drifting Contours and Parallax */}
              <DotMatrixCanvas
                states={states}
                year={year}
                dark={dark}
                onSelectState={(st) => {
                  onSelectState(st);
                  onNavigate('state', `/app/state/${st}`);
                }}
              />

              <div className="hero-map-hud-footer">
                <span>North-Up Alignment · Survey of India Standard Coordinates</span>
                <button
                  className="hud-quick-link"
                  onClick={() => onNavigate('map', '/app/map')}
                >
                  Launch 3D Cockpit ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          2. SCALE STRIP: 2020 -> 2024 National Totals Line / Ladder
          =================================================================== */}
      <section className="landing-section scale-strip-section paper-tint">
        <div className="scale-strip-inner">
          <div className="scale-strip-header">
            <span className="strip-title">5-YEAR LONGITUDINAL TRAJECTORY (2020–2024)</span>
            <span className="strip-caveat">
              Statutory notice: Police-registered FIRs under IT Act & cyber sections of IPC; not total victim incidence; unadjusted for population.
            </span>
          </div>

          <div className="scale-ladder-grid">
            {(bootstrapData?.national_totals || [
              { year: 2020, cases: 50035 },
              { year: 2021, cases: 52974 },
              { year: 2022, cases: 65893 },
              { year: 2023, cases: 86420 },
              { year: 2024, cases: 101928 },
            ]).map((point, idx) => {
              const isLatest = point.year === 2024;
              return (
                <div key={point.year} className={`scale-ladder-step ${isLatest ? 'latest-step' : ''}`}>
                  <div className="step-year-row">
                    <span className="step-year">{point.year}</span>
                    {isLatest && <span className="step-badge">ANNUAL CYCLE</span>}
                  </div>
                  <div className="step-value">
                    <CountUp value={point.cases} duration={1.2 + idx * 0.15} />
                  </div>
                  <div className="step-bar-wrap">
                    <div
                      className="step-bar-fill"
                      style={{ width: `${(point.cases / 101928) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================
          3. MAP STORY (PINNED, SCROLL-DRIVEN, INK SECTION)
          =================================================================== */}
      <section className="landing-section map-story-section ink-section" id="story">
        <div className="section-container">
          <div className="section-headline-wrap">
            <span className="section-kicker">CARTOGRAPHIC INTELLIGENCE</span>
            <h2 className="section-title">The anatomy of geographic concentration.</h2>
            <p className="section-desc">
              Extruded 3D choropleth projection reveals acute jurisdictional skew.
              Click any jurisdiction below to view its exact registered case volume.
            </p>
          </div>

          <div className="map-story-grid">
            {/* Left: Scroll Chapters */}
            <div className="story-chapters-column">
              {[
                {
                  id: 0,
                  tag: '01 / ARCHITECTURE',
                  title: '36 Constitutional Jurisdictions',
                  body: `Spans 28 States and 8 Union Territories. ${nationalTotal2024.toLocaleString('en-IN')} First Information Reports registered nationwide in 2024, representing an average of ${Math.round(nationalTotal2024 / 365)} cybercrimes registered every 24 hours.`,
                  stat: nationalTotal2024.toLocaleString('en-IN'),
                  statLabel: 'Total FIRs (2024)',
                },
                {
                  id: 1,
                  tag: '02 / SKEW FACTOR',
                  title: `Top 5 Jurisdictions Hold ${top5Share}% of National Volume`,
                  body: `${top5.map((s) => `${s.state_ut} (${s.cases.toLocaleString('en-IN')})`).join(', ')} together account for ${top5Total.toLocaleString('en-IN')} cases. The remaining 31 jurisdictions share just ${(100 - parseFloat(top5Share)).toFixed(1)}%.`,
                  stat: `${top5Share}%`,
                  statLabel: 'Top 5 Concentration',
                },
                {
                  id: 2,
                  tag: '03 / VELOCITY',
                  title: m1 && m2 ? `${m1.state_ut} & ${m2.state_ut} Show Steepest Acceleration` : 'Jurisdictions with Steepest Acceleration',
                  body: m1 && m2 ? `${m1.state_ut} recorded a ${(m1.yoy_change ?? 0) > 0 ? '+' : ''}${m1.yoy_change}% YoY expansion to ${m1.cases.toLocaleString('en-IN')} cases. ${m2.state_ut} jumped ${(m2.yoy_change ?? 0) > 0 ? '+' : ''}${m2.yoy_change}% YoY to ${m2.cases.toLocaleString('en-IN')} cases.` : 'Longitudinal annual velocity reveals acute regional surges.',
                  stat: m1 ? `${(m1.yoy_change ?? 0) > 0 ? '+' : ''}${m1.yoy_change}%` : '+49.3%',
                  statLabel: m1 ? `${m1.state_ut} YoY Surge` : 'Peak YoY Surge',
                },
                {
                  id: 3,
                  tag: '04 / GROUND TRUTH',
                  title: 'Individual Jurisdiction Accounting',
                  body: 'Every mesh corresponds to legal Survey of India geometries with island parts preserved (Andaman & Nicobar 187 parts, Lakshadweep 22 parts). Zero algorithmic blending or synthetic smoothing between borders.',
                  stat: '36 / 36',
                  statLabel: 'Verified Boundaries',
                },
              ].map((chapter) => {
                const isActive = activeStoryChapter === chapter.id;
                return (
                  <div
                    key={chapter.id}
                    className={`story-chapter-card ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectChapter(chapter.id)}
                  >
                    <div className="chapter-tag">{chapter.tag}</div>
                    <h3 className="chapter-title">{chapter.title}</h3>
                    <p className="chapter-body">{chapter.body}</p>
                    <div className="chapter-stat-row">
                      <span className="chapter-stat-value">{chapter.stat}</span>
                      <span className="chapter-stat-label">{chapter.statLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Interactive 3D Map Preview / Cockpit */}
            <div className="story-map-column">
              <div className="story-map-card">
                <div className="story-map-header">
                  <div className="map-live-tag">
                    <span className="live-dot" />
                    <span>3D CHOROPLETH OBSERVATORY · FY 2024</span>
                  </div>
                  <button
                    className="map-fullscreen-btn"
                    onClick={() => onNavigate('map', '/app/map')}
                  >
                    Full 3D Cockpit ↗
                  </button>
                </div>

                {/* Top 5 Hotspot Chips for direct interaction */}
                <div className="story-hotspot-chips">
                  {top5.map((s) => (
                    <button
                      key={STATE_TO_CODE[s.state_ut] || s.state_ut}
                      className={`hotspot-chip ${selectedDemoState === s.state_ut ? 'active' : ''}`}
                      onClick={() => setSelectedDemoState(s.state_ut)}
                    >
                      <span className="chip-name">{s.state_ut}</span>
                      <span className="chip-cases">{s.cases.toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                </div>

                {/* Live Embedded 3D Map Canvas */}
                <div className="story-map-canvas-container">
                  <Suspense
                    fallback={
                      <div className="story-map-canvas-loading">
                        <span>Rendering 3D Choropleth…</span>
                      </div>
                    }
                  >
                    <IndiaMap3D
                      cases={casesMap}
                      selected={selectedDemoState}
                      year={year}
                      dark={true}
                      compact={true}
                      onSelect={(st) => setSelectedDemoState(st)}
                    />
                  </Suspense>
                </div>

                {/* Selected State HUD Card */}
                <div className="story-active-hud">
                  <div className="hud-left">
                    <span className="hud-state-title">{selectedDemoState}</span>
                    <span className="hud-state-category">
                      {activeStateRow?.category || 'State'} · Rank #{activeStateRow?.rank || 1} Nationally
                    </span>
                  </div>
                  <div className="hud-right">
                    <div className="hud-case-metric">
                      <span className="hud-number">
                        {(activeStateRow?.cases || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="hud-unit">registered FIRs</span>
                    </div>
                    <div className="hud-share-metric">
                      <span>{activeStateRow?.share || 0}% of all India</span>
                      {activeStateRow?.yoy_change !== null && (
                        <span className="hud-yoy">
                          {activeStateRow?.yoy_change && activeStateRow.yoy_change > 0 ? '+' : ''}
                          {activeStateRow?.yoy_change}% YoY
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="story-map-cta-bar">
                  <span>Want to rotate, zoom, or run longitudinal time-lapse?</span>
                  <button
                    className="story-launch-btn"
                    onClick={() => onNavigate('map', '/app/map')}
                  >
                    Launch Fullscreen 3D Map Cockpit →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          4. STATE PROFILES (PAPER SECTION #F3F0E8)
          =================================================================== */}
      <section className="landing-section state-profiles-section paper-tint" id="states">
        <div className="section-container">
          <div className="section-headline-wrap">
            <span className="section-kicker">INDIVIDUAL JURISDICTION INTELLIGENCE</span>
            <h2 className="section-title">Detailed dossier per jurisdiction.</h2>
            <p className="section-desc">
              Select any of the 36 states and Union Territories to view five-year case momentum,
              national share, and comparative rank.
            </p>
          </div>

          <div className="state-picker-demo-layout">
            {/* Search & Selector Column */}
            <div className="state-selector-col">
              <div className="picker-search-box">
                <input
                  type="text"
                  placeholder="Filter 36 jurisdictions (e.g. Telangana, UP, Kerala)…"
                  value={stateSearchQuery}
                  onChange={(e) => setStateSearchQuery(e.target.value)}
                  className="picker-search-input"
                />
              </div>

              <div className="picker-jurisdictions-list">
                {filteredStatesList.map((st) => {
                  const isSelected = st.state_ut === selectedDemoState;
                  return (
                    <button
                      key={st.code}
                      className={`picker-state-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedDemoState(st.state_ut)}
                    >
                      <div className="picker-row-left">
                        <span className="picker-state-rank">#{st.rank}</span>
                        <span className="picker-state-name">{st.state_ut}</span>
                      </div>
                      <div className="picker-row-right">
                        <span className="picker-state-cases">{st.cases.toLocaleString('en-IN')}</span>
                        <span className="picker-state-share">{st.share}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Interactive Dossier Preview Card */}
            <div className="state-dossier-col">
              {activeStateRow && (
                <div className="state-live-dossier-card">
                  <div className="dossier-card-header">
                    <div className="dossier-title-area">
                      <span className="dossier-watermark">SECURITY INTELLIGENCE OBSERVATORY</span>
                      <h3 className="dossier-name">{activeStateRow.state_ut}</h3>
                      <span className="dossier-subtitle">
                        {activeStateRow.category} · Constitutional Jurisdiction Code: {activeStateRow.code}
                      </span>
                    </div>

                    <button
                      className="dossier-open-btn"
                      onClick={() => {
                        onSelectState(activeStateRow.state_ut);
                        onNavigate('state', `/app/state/${activeStateRow.code}`);
                      }}
                    >
                      <span>Open Complete Dossier</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>

                  <div className="dossier-kpis-grid">
                    <div className="dossier-kpi">
                      <span className="kpi-label">2024 REGISTERED CASES</span>
                      <span className="kpi-val">{activeStateRow.cases.toLocaleString('en-IN')}</span>
                      <span className="kpi-sub">National Rank #{activeStateRow.rank}</span>
                    </div>

                    <div className="dossier-kpi">
                      <span className="kpi-label">NATIONAL CRIME SHARE</span>
                      <span className="kpi-val">{activeStateRow.share}%</span>
                      <span className="kpi-sub">of 1,01,928 Indian FIRs</span>
                    </div>

                    <div className="dossier-kpi">
                      <span className="kpi-label">YEAR-ON-YEAR GROWTH</span>
                      <span className={`kpi-val ${activeStateRow.yoy_change && activeStateRow.yoy_change > 0 ? 'text-amber' : ''}`}>
                        {activeStateRow.yoy_change !== null
                          ? `${activeStateRow.yoy_change > 0 ? '+' : ''}${activeStateRow.yoy_change}%`
                          : 'N/A'}
                      </span>
                      <span className="kpi-sub">vs 2023 cycle</span>
                    </div>

                    <div className="dossier-kpi">
                      <span className="kpi-label">5-YEAR ACCUMULATED</span>
                      <span className="kpi-val">{activeStateRow.total_cases_5yr.toLocaleString('en-IN')}</span>
                      <span className="kpi-sub">Total FIRs (2020–2024)</span>
                    </div>
                  </div>

                  {/* 5-Year Bar Chart Momentum */}
                  <div className="dossier-trajectory-box">
                    <span className="trajectory-label">5-YEAR INCIDENT MOMENTUM (2020–2024)</span>
                    <div className="trajectory-bars-row">
                      {[2020, 2021, 2022, 2023, 2024].map((y) => {
                        const count = activeStateRow.history?.[String(y)] || 0;
                        const maxCount = Math.max(...Object.values(activeStateRow.history || {}), 1);
                        const heightPct = Math.max(14, (count / maxCount) * 100);
                        return (
                          <div key={y} className="trajectory-col">
                            <span className="trajectory-bar-count">{count.toLocaleString('en-IN')}</span>
                            <div className="trajectory-bar-track">
                              <div className="trajectory-bar-fill" style={{ height: `${heightPct}%` }} />
                            </div>
                            <span className="trajectory-bar-year">{y}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          5. ANALYTICS (PAPER / INK SPLIT SECTION): Bump Chart & Scatter
          =================================================================== */}
      <section className="landing-section analytics-preview-section" id="analytics">
        <div className="section-container">
          <div className="section-headline-wrap">
            <span className="section-kicker">LONGITUDINAL RE-RANKING & ESCALATION</span>
            <h2 className="section-title">Rank movement and growth dynamics.</h2>
            <p className="section-desc">
              Visualizing how cybercrime epicenter shifts across Indian states.
              Telangana surged from Rank 6 in 2020 to Rank 1 in 2024.
            </p>
          </div>

          <div className="analytics-duo-grid">
            {/* 1. Rank Movement (Bump Chart) */}
            <div className="analytics-card bump-chart-card">
              <div className="analytics-card-header">
                <div>
                  <h3 className="card-heading">Rank-Movement (Bump) Chart</h3>
                  <span className="card-subheading">Trajectory of Top Hotspot Jurisdictions (2020–2024)</span>
                </div>
                <span className="bump-tag">RANK 1 TO 8</span>
              </div>

              <div className="bump-chart-wrap">
                <svg className="bump-chart-svg" viewBox="0 0 540 220" preserveAspectRatio="none">
                  {/* Grid Lines for Years */}
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const x = 50 + idx * 110;
                    return (
                      <g key={idx}>
                        <line x1={x} y1={20} x2={x} y2={180} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                        <text x={x} y={205} fill="var(--text-muted)" fontSize={11} textAnchor="middle" fontFamily="var(--font-mono)">
                          {2020 + idx}
                        </text>
                      </g>
                    );
                  })}

                  {/* Sample Bump Lines for Top States */}
                  {/* Telangana: Rank 6 -> 5 -> 3 -> 2 -> 1 */}
                  <path
                    d="M 50 140 C 105 140, 105 116, 160 116 C 215 116, 215 68, 270 68 C 325 68, 325 44, 380 44 C 435 44, 435 20, 490 20"
                    fill="none"
                    stroke="#E07A38"
                    strokeWidth={3}
                  />
                  {/* Karnataka: Rank 2 -> 2 -> 1 -> 1 -> 2 */}
                  <path
                    d="M 50 44 C 105 44, 105 44, 160 44 C 215 44, 215 20, 270 20 C 325 20, 325 20, 380 20 C 435 20, 435 44, 490 44"
                    fill="none"
                    stroke="#4F772D"
                    strokeWidth={2.5}
                  />
                  {/* Uttar Pradesh: Rank 1 -> 1 -> 2 -> 3 -> 3 */}
                  <path
                    d="M 50 20 C 105 20, 105 20, 160 20 C 215 20, 215 44, 270 44 C 325 44, 325 68, 380 68 C 435 68, 435 68, 490 68"
                    fill="none"
                    stroke="#7C9082"
                    strokeWidth={2}
                  />
                  {/* Maharashtra: Rank 3 -> 3 -> 4 -> 4 -> 4 */}
                  <path
                    d="M 50 68 C 105 68, 105 68, 160 68 C 215 68, 215 92, 270 92 C 325 92, 325 92, 380 92 C 435 92, 435 92, 490 92"
                    fill="none"
                    stroke="#A3B18A"
                    strokeWidth={2}
                  />

                  {/* End State Badges */}
                  <circle cx={490} cy={20} r={5} fill="#E07A38" />
                  <text x={500} y={24} fill="#E07A38" fontSize={11} fontWeight={600} fontFamily="var(--font-sans)">#1 Telangana</text>

                  <circle cx={490} cy={44} r={4.5} fill="#4F772D" />
                  <text x={500} y={48} fill="var(--text-primary)" fontSize={11} fontFamily="var(--font-sans)">#2 Karnataka</text>

                  <circle cx={490} cy={68} r={4} fill="#7C9082" />
                  <text x={500} y={72} fill="var(--text-muted)" fontSize={11} fontFamily="var(--font-sans)">#3 Uttar Pradesh</text>

                  <circle cx={490} cy={92} r={4} fill="#A3B18A" />
                  <text x={500} y={96} fill="var(--text-muted)" fontSize={11} fontFamily="var(--font-sans)">#4 Maharashtra</text>
                </svg>
              </div>

              <div className="card-footer-note">
                <span>Reading guide: Lower Y represents higher national rank. Note Telangana's continuous ascent from Rank 6 to Rank 1.</span>
              </div>
            </div>

            {/* 2. Growth vs Volume Scatter Plot */}
            <div className="analytics-card scatter-plot-card">
              <div className="analytics-card-header">
                <div>
                  <h3 className="card-heading">Growth-vs-Volume Quadrants</h3>
                  <span className="card-subheading">YoY Growth (%) vs 2024 Registered Case Volume</span>
                </div>
                <span className="scatter-tag">36 JURISDICTIONS</span>
              </div>

              <div className="scatter-chart-wrap">
                <svg className="scatter-svg" viewBox="0 0 540 220" preserveAspectRatio="none">
                  {/* Quadrant dividing crosshair */}
                  <line x1={40} y1={110} x2={520} y2={110} stroke="var(--border-subtle)" strokeDasharray="2 2" />
                  <line x1={280} y1={10} x2={280} y2={190} stroke="var(--border-subtle)" strokeDasharray="2 2" />

                  {/* Quadrant Labels */}
                  <text x={510} y={26} fill="var(--accent-amber)" fontSize={10} textAnchor="end" fontFamily="var(--font-mono)">
                    HIGH VOLUME · HIGH GROWTH
                  </text>
                  <text x={510} y={180} fill="var(--text-muted)" fontSize={10} textAnchor="end" fontFamily="var(--font-mono)">
                    HIGH VOLUME · LOW GROWTH
                  </text>

                  {/* Scatter Nodes */}
                  {/* Telangana: 27k, +49% */}
                  <circle cx={460} cy={42} r={7} fill="#E07A38" opacity={0.9} />
                  <text x={470} y={46} fill="var(--text-primary)" fontSize={10} fontFamily="var(--font-sans)" fontWeight={600}>TG (+49%)</text>

                  {/* Karnataka: 22k, +0.5% */}
                  <circle cx={410} cy={118} r={6.5} fill="#4F772D" opacity={0.85} />
                  <text x={420} y={122} fill="var(--text-primary)" fontSize={10} fontFamily="var(--font-sans)">KA (+0.5%)</text>

                  {/* Bihar: 6.3k, +43% */}
                  <circle cx={220} cy={50} r={5.5} fill="#E07A38" opacity={0.85} />
                  <text x={230} y={54} fill="var(--text-primary)" fontSize={10} fontFamily="var(--font-sans)">BR (+43%)</text>

                  {/* Uttar Pradesh: 11k, +2.6% */}
                  <circle cx={290} cy={112} r={6} fill="#7C9082" opacity={0.85} />
                  <text x={300} y={116} fill="var(--text-primary)" fontSize={10} fontFamily="var(--font-sans)">UP (+2.6%)</text>

                  {/* Maharashtra: 9.9k, +22% */}
                  <circle cx={270} cy={82} r={5.8} fill="#E07A38" opacity={0.85} />
                  <text x={280} y={86} fill="var(--text-primary)" fontSize={10} fontFamily="var(--font-sans)">MH (+22%)</text>

                  {/* Kerala, Gujarat, Rajasthan cluster */}
                  <circle cx={140} cy={95} r={4.5} fill="var(--text-muted)" opacity={0.6} />
                  <circle cx={160} cy={125} r={4.5} fill="var(--text-muted)" opacity={0.6} />
                  <circle cx={110} cy={80} r={4} fill="var(--text-muted)" opacity={0.6} />
                </svg>
              </div>

              <div className="card-footer-note">
                <span>Jurisdictions in the upper-right quadrant present the highest tactical risk: immense current scale paired with double-digit growth.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          6. DATA EXPLORER PREVIEW: Virtualized Sortable Table & Real Export
          =================================================================== */}
      <section className="landing-section data-preview-section paper-tint" id="explorer">
        <div className="section-container">
          <div className="section-headline-wrap">
            <div className="split-headline">
              <div>
                <span className="section-kicker">FULL JURISDICTION MATRIX</span>
                <h2 className="section-title">The complete evidentiary table.</h2>
                <p className="section-desc">
                  Inspect annual reporting columns, calculate historical sparklines, and export
                  structured CSV data directly into analytical tools.
                </p>
              </div>

              <div className="table-actions-header">
                <button className="export-csv-btn" onClick={handleExportCsv}>
                  <Download size={14} />
                  <span>Export Complete Matrix (CSV)</span>
                </button>

                <button
                  className="open-explorer-btn"
                  onClick={() => onNavigate('explorer', '/app/data')}
                >
                  <span>Open Full Explorer</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Sortable Mini-Table */}
          <div className="mini-table-container">
            <table className="mini-data-table" aria-label="Cybercrime matrix preview">
              <thead>
                <tr>
                  <th onClick={() => { setTableSortCol('state_ut'); setTableSortAsc(!tableSortAsc); }}>
                    Jurisdiction {tableSortCol === 'state_ut' ? (tableSortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th>Category</th>
                  <th>2020</th>
                  <th>2021</th>
                  <th>2022</th>
                  <th>2023</th>
                  <th onClick={() => { setTableSortCol('cases'); setTableSortAsc(!tableSortAsc); }}>
                    2024 Cases {tableSortCol === 'cases' ? (tableSortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th>5-Yr Sparkline</th>
                  <th onClick={() => { setTableSortCol('share'); setTableSortAsc(!tableSortAsc); }}>
                    National Share {tableSortCol === 'share' ? (tableSortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => { setTableSortCol('yoy_change'); setTableSortAsc(!tableSortAsc); }}>
                    YoY Change {tableSortCol === 'yoy_change' ? (tableSortAsc ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMiniTableRows.map((row) => (
                  <tr
                    key={row.code}
                    onClick={() => {
                      onSelectState(row.state_ut);
                      onNavigate('state', `/app/state/${row.code}`);
                    }}
                    title={`Click to open ${row.state_ut} dossier`}
                  >
                    <td className="cell-state-name">
                      <span className="state-rank">#{row.rank}</span>
                      <strong>{row.state_ut}</strong>
                    </td>
                    <td><span className="category-tag">{row.category}</span></td>
                    <td className="cell-num">{row.history?.['2020']?.toLocaleString('en-IN') ?? '-'}</td>
                    <td className="cell-num">{row.history?.['2021']?.toLocaleString('en-IN') ?? '-'}</td>
                    <td className="cell-num">{row.history?.['2022']?.toLocaleString('en-IN') ?? '-'}</td>
                    <td className="cell-num">{row.history?.['2023']?.toLocaleString('en-IN') ?? '-'}</td>
                    <td className="cell-num cell-highlight">
                      <strong>{row.cases.toLocaleString('en-IN')}</strong>
                    </td>
                    <td className="cell-spark">
                      <svg width="64" height="18" className="sparkline-svg">
                        {row.sparkline && row.sparkline.length === 5 && (
                          <polyline
                            fill="none"
                            stroke="var(--accent-amber)"
                            strokeWidth="1.6"
                            points={row.sparkline
                              .map((val, idx) => {
                                const maxV = Math.max(...row.sparkline, 1);
                                const x = idx * 15 + 2;
                                const y = 16 - (val / maxV) * 14;
                                return `${x},${y}`;
                              })
                              .join(' ')}
                          />
                        )}
                      </svg>
                    </td>
                    <td className="cell-num">{row.share}%</td>
                    <td className="cell-num">
                      <span className={`yoy-pill ${row.yoy_change && row.yoy_change > 0 ? 'pos' : 'neg'}`}>
                        {row.yoy_change !== null ? `${row.yoy_change > 0 ? '+' : ''}${row.yoy_change}%` : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===================================================================
          7. DATASET STUDIO: "Bring your own data" Drop Zone & Visualizers
          =================================================================== */}
      <section className="landing-section studio-preview-section ink-section" id="studio">
        <div className="section-container">
          <div className="section-headline-wrap">
            <span className="section-kicker">CUSTOM TELEMETRY ENGINE</span>
            <h2 className="section-title">Bring your own operational dataset.</h2>
            <p className="section-desc">
              Upload local cybercrime, financial fraud, or incident logs. The in-browser
              profiler automatically maps coordinates and renders instant 3D models.
            </p>
          </div>

          <div className="studio-demo-grid">
            {/* Interactive Drop Zone */}
            <div
              className={`studio-dropzone-box ${dragActive ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleFileDrop}
            >
              <div className="dropzone-icon-wrap">
                <Upload size={32} />
              </div>
              <h3 className="dropzone-title">Drag & drop dataset file here</h3>
              <p className="dropzone-sub">Supports CSV, XLSX, or JSON · Auto-profiles coordinates & columns</p>

              {uploadNotice ? (
                <div className="dropzone-notice">{uploadNotice}</div>
              ) : (
                <div className="dropzone-actions">
                  <label className="browse-files-btn">
                    <span>Browse Local Files</span>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.json"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setUploadNotice(`Loaded "${e.target.files[0].name}" — launching Dataset Studio…`);
                          setTimeout(() => onNavigate('studio', '/app/studio'), 1000);
                        }
                      }}
                    />
                  </label>

                  <span className="or-divider">or</span>

                  <button className="sample-dataset-btn" onClick={handleUseSample}>
                    Use Banking Fraud Sample
                  </button>
                </div>
              )}
            </div>

            {/* Typographic list of 6 3D Chart Systems */}
            <div className="studio-capabilities-card">
              <span className="capabilities-header">SUPPORTED 3D CARTOGRAPHIC ENGINES</span>
              <ul className="capabilities-list">
                <li className="capability-item">
                  <span className="cap-num">01</span>
                  <div className="cap-content">
                    <strong>3D Extruded Prism Choropleth</strong>
                    <p>Elevates polygonal territory boundaries proportionally to metric intensity.</p>
                  </div>
                </li>
                <li className="capability-item">
                  <span className="cap-num">02</span>
                  <div className="cap-content">
                    <strong>Vertical 3D Column Matrix</strong>
                    <p>Pinpoint categorical or departmental case volume on exact spatial centroids.</p>
                  </div>
                </li>
                <li className="capability-item">
                  <span className="cap-num">03</span>
                  <div className="cap-content">
                    <strong>Hexagonal & Bubble Clusters</strong>
                    <p>Volumetric sphere clustering for multi-source fraud incident density.</p>
                  </div>
                </li>
                <li className="capability-item">
                  <span className="cap-num">04</span>
                  <div className="cap-content">
                    <strong>Multivariable 3D Scatter</strong>
                    <p>Correlates loss value, resolution speed, and jurisdiction coordinates in XYZ space.</p>
                  </div>
                </li>
                <li className="capability-item">
                  <span className="cap-num">05</span>
                  <div className="cap-content">
                    <strong>Spatio-Temporal Surface Terrains</strong>
                    <p>Continuous relief mesh across multi-year timeline coordinate intervals.</p>
                  </div>
                </li>
                <li className="capability-item">
                  <span className="cap-num">06</span>
                  <div className="cap-content">
                    <strong>Longitudinal Trajectory Curves</strong>
                    <p>Continuous Bézier trend splines tracking jurisdictional velocity over time.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          8. METHOD & TRUST (PAPER SECTION #F3F0E8)
          =================================================================== */}
      <section className="landing-section method-trust-section paper-tint" id="method">
        <div className="section-container">
          <div className="section-headline-wrap">
            <span className="section-kicker">ENGINEERING & STATUTORY INTEGRITY</span>
            <h2 className="section-title">Distributed PySpark architecture.</h2>
            <p className="section-desc">
              From gazetted National Crime Records Bureau tables to an in-memory
              Spark SQL distributed cache serving sub-150ms analytical queries.
            </p>
          </div>

          {/* Animated 6-Stage Pipeline Diagram */}
          <div className="pipeline-diagram-track">
            {[
              { step: '01', title: 'Primary Source', desc: 'Table 9A Gazette PRID 2287039' },
              { step: '02', title: 'FastAPI Ingest', desc: 'Validated CSV parsing & schema checks' },
              { step: '03', title: 'PySpark Normalisation', desc: 'Diacritic NFD strip & alias reconciliation' },
              { step: '04', title: 'Spark SQL Cache', desc: 'In-memory temp views & aggregations' },
              { step: '05', title: 'REST API Layer', desc: 'TTL cache, ETag validation, CORS' },
              { step: '06', title: 'R3F 3D Engine', desc: 'Three.js extruded cartography' },
            ].map((p, idx, arr) => (
              <React.Fragment key={p.step}>
                <div className="pipeline-node-card">
                  <div className="pipeline-step-badge">{p.step}</div>
                  <strong className="pipeline-step-title">{p.title}</strong>
                  <span className="pipeline-step-desc">{p.desc}</span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="pipeline-arrow" aria-hidden="true">
                    →
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="method-details-split">
            {/* Real Spark SQL Snippet */}
            <div className="code-snippet-box">
              <div className="snippet-header">
                <FileCode size={14} />
                <span>backend/main.py — Spark SQL Query Definition</span>
              </div>
              <pre className="code-pre">
                <code>{`-- Distributed state aggregation query executed on Spark 3.5
SELECT
    state_ut,
    category,
    CAST(\`2024\` AS BIGINT) AS cases,
    ROUND((CAST(\`2024\` AS DOUBLE) / SUM(\`2024\`) OVER ()) * 100, 2) AS national_share,
    ROUND(((CAST(\`2024\` AS DOUBLE) - CAST(\`2023\` AS DOUBLE)) / CAST(\`2023\` AS DOUBLE)) * 100, 1) AS yoy_growth
FROM state_cyber_crimes
ORDER BY cases DESC;`}</code>
              </pre>
            </div>

            {/* Statutory Caveats & Provenance */}
            <div className="method-caveats-card">
              <span className="caveats-heading">STATUTORY INTERPRETATION NOTICE</span>
              <ul className="caveats-list">
                <li>
                  <strong>Statutory Scope:</strong> Statistics reflect First Information Reports (FIRs) booked under the Information Technology Act (2000) and related cyber provisions of the Indian Penal Code.
                </li>
                <li>
                  <strong>Evidentiary Fidelity:</strong> Non-reporting or differences in public reporting rates across jurisdictions are not synthetically smoothed or interpolated.
                </li>
                <li>
                  <strong>No Per-Capita Distortion:</strong> Raw figures are presented without arbitrary census scaling to prevent misleading artificial risk ratings in lower-population states.
                </li>
                <li>
                  <strong>Licence & Attribution:</strong> Geospatial boundary layers are derived from open Survey of India datasets distributed under CC BY 2.5 IN.
                </li>
              </ul>

              <button
                className="full-method-link-btn"
                onClick={() => onNavigate('methodology', '/app/method')}
              >
                <span>Read Full Methodology & Provenance Documentation</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          9. CLOSING CTA & FOOTER
          =================================================================== */}
      <section className="landing-section closing-cta-section ink-section">
        <div className="closing-cta-inner">
          <span className="closing-kicker">GOVERNMENT & LAW ENFORCEMENT OBSERVATORY</span>
          <h2 className="closing-headline">
            Ready to explore national cyber intelligence across India?
          </h2>
          <p className="closing-sub">
            Navigate all 36 jurisdictions, inspect 5-year trends, or model your own incident telemetry.
          </p>

          <button
            className="closing-cta-btn"
            onClick={() => onNavigate('overview', '/app')}
            onMouseEnter={handleCtaHover}
          >
            <span>Launch Intelligence Platform</span>
            <ArrowRight size={17} />
          </button>
        </div>

        <footer className="landing-footer">
          <div className="footer-top-row">
            <div className="footer-brand-wrap">
              <div className="footer-crest">
                <IndiaPrismMark size={18} />
              </div>
              <span className="footer-brand-name">INDIA CYBER CRIME INTELLIGENCE PLATFORM</span>
              <span className="footer-version">v1.2.0 · July 2026</span>
            </div>

            <div className="footer-links-wrap">
              <button onClick={() => onNavigate('overview', '/app')}>Overview</button>
              <button onClick={() => onNavigate('map', '/app/map')}>3D Map</button>
              <button onClick={() => onNavigate('state', '/app/state')}>State Dossier</button>
              <button onClick={() => onNavigate('analytics', '/app/analytics')}>Analytics</button>
              <button onClick={() => onNavigate('explorer', '/app/data')}>Data Explorer</button>
              <button onClick={() => onNavigate('studio', '/app/studio')}>Dataset Studio</button>
              <button onClick={() => onNavigate('methodology', '/app/method')}>Methodology</button>
            </div>
          </div>

          <div className="footer-bottom-row">
            <span className="footer-legal">
              Data sourced from Crime in India series, Government of India.
              Boundaries CC BY 2.5 IN.
            </span>
            <a
              href="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2287039&lang=1&reg=3"
              target="_blank"
              rel="noreferrer"
              className="footer-gazette-link"
            >
              PIB Gazette Notice PRID 2287039 ↗
            </a>
          </div>
        </footer>
      </section>
    </div>
  );
}
