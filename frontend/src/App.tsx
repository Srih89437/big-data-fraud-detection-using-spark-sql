// Application shell: section routing, global data loading from the Spark SQL
// backend, theme, year selection, live IST observatory clock, keyboard shortcuts and error boundaries.

import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  AlertTriangle,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  Command,
  Clock,
  ChevronRight,
  Database,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { StripeBadge } from './components/MotionPrimitives';
import {
  clearApiCache,
  fetchMatrix,
  fetchOverview,
  fetchStateDetail,
  fetchStates,
  fetchTrends,
  fetchYears,
} from './lib/api';
import type { MatrixRow, OverviewResponse, StateRow, TrendPoint } from './lib/types';
import { Navigation, type SectionId, SECTIONS } from './components/Navigation';
import { Overview } from './components/Overview';
import { StateIntelligence } from './components/StateIntelligence';
import { NationalAnalytics } from './components/NationalAnalytics';
import { DataExplorer } from './components/DataExplorer';
import { Methodology } from './components/Methodology';
import { AtmosphericBackground } from './components/AtmosphericBackground';
import { DatasetStudio } from './studio/DatasetStudio';
import { Skeleton } from './components/ui';
import { LazyIndiaMap3D as IndiaMap3D } from './map/lazy';

function MapFallback() {
  return (
    <div className="map-full">
      <div className="map3d-loading">
        <div className="map-loader-spinner" />
        <span className="map-loader-text">Initializing 3D geospatial engine…</span>
      </div>
    </div>
  );
}

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Catches render-time failures so one section cannot blank the whole app. */
class ErrorBoundary extends Component<
  { children: ReactNode; label: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="section-container">
          <div className="error-callout">
            <AlertTriangle size={18} className="error-icon" />
            <div className="error-content">
              <strong>{this.props.label} failed to render</strong>
              <p>{this.state.error.message}</p>
            </div>
            <button className="primary-btn ghost-btn" onClick={() => this.setState({ error: null })}>
              <RefreshCw size={14} /> Retry Component
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [section, setSection] = useState<SectionId>('overview');
  const [year, setYear] = useState(2024);
  const [years, setYears] = useState<number[]>([2020, 2021, 2022, 2023, 2024]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>('Telangana');
  const [dark, setDark] = useState(() => prefersDark());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [clockTime, setClockTime] = useState<string>('');

  // Live IST Observatory Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockTime(
        now.toLocaleTimeString('en-GB', {
          hour12: false,
          timeZone: 'Asia/Kolkata',
        }) + ' IST',
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      const [s, o, t, yr] = await Promise.all([
        fetchStates(y),
        fetchOverview(y),
        fetchTrends(),
        fetchYears(),
      ]);
      setStates(s.states);
      setOverview(o);
      setTrends(t.national_total);
      if (yr.years?.length) setYears(yr.years);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year);
  }, [year, load]);

  // Keyboard navigation shortcuts: 1-6 to switch tabs, 't' to toggle theme, '?' for shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key >= '1' && e.key <= '7') {
        const idx = parseInt(e.key, 10) - 1;
        if (SECTIONS[idx]) {
          setSection(SECTIONS[idx].id);
        }
      } else if (e.key.toLowerCase() === 't') {
        setDark((d) => !d);
      } else if (e.key === '?') {
        setShowShortcuts((s) => !s);
      } else if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Historical matrix for the explorer
  const [history, setHistory] = useState<Map<string, Map<number, number>>>(new Map());
  const [matrixRows, setMatrixRows] = useState<MatrixRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchMatrix(year);
        if (cancelled) return;
        setMatrixRows(res.matrix || []);
        const m = new Map<string, Map<number, number>>();
        for (const r of res.matrix || []) {
          const inner = new Map<number, number>();
          if (r.history) {
            for (const [k, v] of Object.entries(r.history)) {
              if (/^\d{4}$/.test(k) && typeof v === 'number') inner.set(Number(k), v);
            }
          }
          m.set(r.state_ut, inner);
        }
        setHistory(m);
      } catch {
        /* fallback to individual state details if matrix fails */
        if (section === 'explorer' && states.length > 0) {
          const m = new Map<string, Map<number, number>>();
          for (const s of states) {
            if (cancelled) return;
            try {
              const d = await fetchStateDetail(s.state_ut);
              const inner = new Map<number, number>();
              for (const [k, v] of Object.entries(d)) {
                if (/^\d{4}$/.test(k) && typeof v === 'number') inner.set(Number(k), v);
              }
              m.set(s.state_ut, inner);
            } catch {
              /* ignore */
            }
          }
          if (!cancelled) setHistory(new Map(m));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, section, states]);

  const source = useMemo(
    () => 'NCRB, Crime in India · Ministry of Home Affairs / Press Information Bureau · 21 July 2026',
    [],
  );

  const handleSelect = useCallback((name: string) => {
    if (!name) return;
    setSelected(name);
    setSection('state');
  }, []);

  const retry = useCallback(() => {
    clearApiCache();
    setHistory(new Map());
    void load(year);
  }, [load, year]);

  const activeSectionDef = useMemo(
    () => SECTIONS.find((s) => s.id === section) ?? SECTIONS[0],
    [section],
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className={`platform-root ${dark ? 'dark' : 'light'}`}>
        <AtmosphericBackground section={section} dark={dark} />
        {/* Precision hairline Sovereign Tricolor Bar */}
        <div className="national-accent-bar" aria-hidden="true">
          <span className="accent-saffron" />
          <span className="accent-white" />
          <span className="accent-green" />
        </div>

        <header className="platform-header">
          <div className="header-inner">
            <div className="brand-group">
              <div className="brand-crest">
                <Shield size={19} strokeWidth={2.2} />
                <div className="crest-ring" />
              </div>
              <div className="brand-text">
                <div className="brand-title">
                  <strong>INDIA CYBER INTELLIGENCE</strong>
                  <span className="sovereign-tag">OBSERVATORY</span>
                </div>
                <div className="header-breadcrumbs">
                  <span className="crumb-root">ICIP 2026</span>
                  <ChevronRight size={10} className="crumb-sep" />
                  <span className="crumb-group">{activeSectionDef.group.toUpperCase()}</span>
                  <ChevronRight size={10} className="crumb-sep" />
                  <span className="crumb-current">{activeSectionDef.label.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Sovereign Floating Navigation Dock in Header */}
            <Navigation active={section} onChange={setSection} selectedState={selected} />

            <div className="header-status-group">
              {/* Live Clock */}
              {clockTime && (
                <div className="header-clock-pill" title="Indian Standard Time">
                  <Clock size={12} className="clock-icon" />
                  <span className="clock-time">{clockTime}</span>
                </div>
              )}

              {/* Spark SQL Live Status */}
              <StripeBadge variant="mint" dot className="live-engine-badge" title="Spark SQL Cluster Engine Online">
                SPARK 3.5
              </StripeBadge>

              {/* Quick Header Year Selector with sliding pill */}
              <div className="header-year-switcher" title="Change active year across all views">
                <span className="header-year-label">YEAR</span>
                <div className="header-year-buttons">
                  {years.map((y) => {
                    const isActive = year === y;
                    return (
                      <button
                        key={y}
                        className={`header-year-btn ${isActive ? 'active' : ''}`}
                        onClick={() => setYear(y)}
                      >
                        {isActive && (
                          <motion.div
                            className="header-year-active-pill"
                            layoutId="activeYearPill"
                            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                            aria-hidden="true"
                          />
                        )}
                        <span className="header-year-btn-text">{y}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="header-divider" />

              <button
                className="quick-action-btn"
                onClick={() => setShowShortcuts(true)}
                title="Keyboard shortcuts (?)"
                aria-label="Keyboard shortcuts"
              >
                <Command size={15} />
              </button>

              <button
                className="quick-action-btn theme-toggle"
                onClick={() => setDark(!dark)}
                title={`Switch to ${dark ? 'light' : 'dark'} mode (T)`}
                aria-label="Toggle visual theme"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </header>

      <div className={`platform-canvas-root ${section === 'map' ? 'full-bleed-mode' : 'editorial-mode'}`}>
        <main className="platform-main-viewport" id="main-content">
          {error && (
            <div className="error-callout global-error">
              <AlertTriangle size={18} className="error-icon" />
              <div className="error-content">
                <strong>Backend service unreachable</strong>
                <p>{error}</p>
                <small>Run <code>uvicorn backend.main:app --port 8000</code> to reconnect the Spark SQL backend.</small>
              </div>
              <button className="primary-btn" onClick={retry}>
                <RefreshCw size={13} /> Reconnect
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              className={`section-viewport ${section === 'map' ? 'viewport-map-cockpit' : 'viewport-editorial'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {section === 'overview' && (
                <ErrorBoundary label="Overview">
                  <Overview
                    year={year}
                    years={years}
                    onYearChange={setYear}
                    overview={overview}
                    states={states}
                    trends={trends}
                    loading={loading}
                    selected={selected}
                    dark={dark}
                    onSelect={handleSelect}
                  />
                </ErrorBoundary>
              )}

              {section === 'map' && (
                <ErrorBoundary label="India Map">
                  <MapSection
                    year={year}
                    years={years}
                    onYearChange={setYear}
                    states={states}
                    loading={loading}
                    selected={selected}
                    dark={dark}
                    onSelect={(name) => setSelected(name)}
                    onOpenDossier={(name) => {
                      setSelected(name);
                      setSection('state');
                    }}
                  />
                </ErrorBoundary>
              )}

              {section === 'state' && (
                <ErrorBoundary label="State Intelligence">
                  <StateIntelligence
                    selected={selected}
                    year={year}
                    years={years}
                    states={states}
                    overview={overview}
                    trends={trends}
                    loading={loading}
                    onOpenMap={() => setSection('map')}
                    onSelect={handleSelect}
                  />
                </ErrorBoundary>
              )}

              {section === 'analytics' && (
                <ErrorBoundary label="National Analytics">
                  <NationalAnalytics
                    year={year}
                    years={years}
                    states={states}
                    trends={trends}
                    overview={overview}
                    loading={loading}
                    onSelect={handleSelect}
                    onYearChange={setYear}
                  />
                </ErrorBoundary>
              )}

              {section === 'explorer' && (
                <ErrorBoundary label="Data Explorer">
                  <DataExplorer
                    states={states}
                    years={years}
                    year={year}
                    loading={loading}
                    source={source}
                    onSelect={handleSelect}
                    history={history}
                    matrixRows={matrixRows}
                  />
                </ErrorBoundary>
              )}

              {section === 'studio' && (
                <ErrorBoundary label="Dataset Studio">
                  <DatasetStudio dark={dark} />
                </ErrorBoundary>
              )}

              {section === 'methodology' && (
                <ErrorBoundary label="Methodology">
                  <Methodology />
                </ErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>

          <footer className="platform-footer">
            <div className="footer-content">
              <div className="footer-left">
                <div className="footer-brand">
                  <Shield size={14} />
                  <span>INDIA CYBER CRIME INTELLIGENCE PLATFORM</span>
                </div>
                <p className="footer-provenance">
                  Official NCRB Statewise Statistics · Ministry of Home Affairs, Government of India
                </p>
              </div>
              <div className="footer-right">
                <span className="footer-engine">Apache Spark SQL distributed query pipeline</span>
                <a
                  href="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2287039&lang=1&reg=3"
                  target="_blank"
                  rel="noreferrer"
                  className="footer-link"
                >
                  PIB Gazette 2287039 ↗
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <div className="modal-backdrop" onClick={() => setShowShortcuts(false)}>
            <motion.div
              className="shortcuts-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dialog-header">
                <div className="dialog-title-wrap">
                  <Command size={18} />
                  <h3>Keyboard Navigation Controls</h3>
                </div>
                <button className="dialog-close" onClick={() => setShowShortcuts(false)}>✕</button>
              </div>
              <div className="shortcuts-grid">
                <div className="shortcut-row">
                  <kbd>1</kbd> <span>Executive National Overview</span>
                </div>
                <div className="shortcut-row">
                  <kbd>2</kbd> <span>India 3D Intelligence Map</span>
                </div>
                <div className="shortcut-row">
                  <kbd>3</kbd> <span>State Intelligence Dossier</span>
                </div>
                <div className="shortcut-row">
                  <kbd>4</kbd> <span>National Analytics Suite</span>
                </div>
                <div className="shortcut-row">
                  <kbd>5</kbd> <span>Data Explorer & Matrix</span>
                </div>
                <div className="shortcut-row">
                  <kbd>6</kbd> <span>Dataset Studio & 3D Analytics</span>
                </div>
                <div className="shortcut-row">
                  <kbd>7</kbd> <span>Methodology & Provenance</span>
                </div>
                <div className="shortcut-row">
                  <kbd>T</kbd> <span>Toggle Dark / Light Theme</span>
                </div>
                <div className="shortcut-row">
                  <kbd>?</kbd> <span>Toggle this shortcuts modal</span>
                </div>
                <div className="shortcut-row">
                  <kbd>Esc</kbd> <span>Dismiss dialog</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

/** Edge-to-Edge Sovereign 3D Geospatial Intelligence Cockpit */
function MapSection({
  year,
  years,
  onYearChange,
  states,
  loading,
  selected,
  dark,
  onSelect,
  onOpenDossier,
}: {
  year: number;
  years: number[];
  onYearChange: (y: number) => void;
  states: StateRow[];
  loading: boolean;
  selected: string | null;
  dark: boolean;
  onSelect: (name: string) => void;
  onOpenDossier: (name: string) => void;
}) {
  const [activeJurisdiction, setActiveJurisdiction] = useState<string | null>(selected || 'Telangana');

  const cases = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of states) m.set(s.state_ut, s.cases);
    return m;
  }, [states]);

  const sortedStates = useMemo(() => {
    return [...states].sort((a, b) => b.cases - a.cases);
  }, [states]);

  const activeRow = useMemo(() => {
    return states.find((s) => s.state_ut === activeJurisdiction) || null;
  }, [states, activeJurisdiction]);

  const nationalTotal = useMemo(() => {
    return states.reduce((acc, s) => acc + s.cases, 0);
  }, [states]);

  const rank = useMemo(() => {
    if (!activeJurisdiction) return 0;
    const idx = sortedStates.findIndex((s) => s.state_ut === activeJurisdiction);
    return idx >= 0 ? idx + 1 : 0;
  }, [sortedStates, activeJurisdiction]);

  const share = activeRow && nationalTotal > 0 ? ((activeRow.cases / nationalTotal) * 100).toFixed(1) : '0';

  return (
    <div className="map-cockpit-root">
      {/* 3D WebGL Canvas filling the full screen */}
      <div className="map-cockpit-canvas-wrap">
        {loading && states.length === 0 ? (
          <Skeleton height="100%" className="map-skeleton" />
        ) : (
          <Suspense fallback={<MapFallback />}>
            <IndiaMap3D
              cases={cases}
              selected={activeJurisdiction}
              year={year}
              dark={dark}
              onSelect={(name) => {
                setActiveJurisdiction(name);
                onSelect(name);
              }}
            />
          </Suspense>
        )}
      </div>

      {/* Floating Tactical HUD: Top-Left Mission Identity */}
      <div className="hud-panel hud-top-left">
        <div className="hud-badge-row">
          <span className="hud-pulse-dot" />
          <span className="hud-tag">GEOSPATIAL COCKPIT</span>
          <span className="hud-year-pill">{year}</span>
        </div>
        <h2 className="hud-headline">
          {nationalTotal > 0 ? nationalTotal.toLocaleString('en-IN') : '—'}
          <span className="hud-headline-sub"> NATIONAL CASES</span>
        </h2>
        {sortedStates[0] && (
          <p className="hud-lead-alert">
            Critical Hotspot: <strong>{sortedStates[0].state_ut}</strong> ({sortedStates[0].cases.toLocaleString('en-IN')} cases)
          </p>
        )}
      </div>

      {/* Floating Tactical HUD: Bottom-Left Dynamic Spectrum */}
      <div className="hud-panel hud-bottom-left">
        <span className="hud-legend-title">DENSITY CHOROPLETH</span>
        <div className="hud-spectrum-bar">
          <span className="spec-step step-1" />
          <span className="spec-step step-2" />
          <span className="spec-step step-3" />
          <span className="spec-step step-4" />
        </div>
        <div className="hud-spectrum-labels">
          <span>0 (Baseline)</span>
          <span>5K</span>
          <span>10K</span>
          <span>15K+ FIRs</span>
        </div>
      </div>

      {/* Floating Tactical HUD: Bottom-Right Selected Jurisdiction Dossier Card */}
      {activeRow && (
        <motion.div
          className="hud-panel hud-bottom-right-dossier"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <div className="dossier-card-header">
            <div className="dossier-card-title">
              <span className="dossier-state-name">{activeRow.state_ut}</span>
              <span className="dossier-cat-badge">
                {activeRow.category === 'Union Territory' ? 'UT' : 'CONSTITUTIONAL STATE'}
              </span>
            </div>
            <button
              className="dossier-close-btn"
              onClick={() => setActiveJurisdiction(null)}
              title="Clear selection to national overview"
            >
              ✕
            </button>
          </div>

          <div className="dossier-kpi-grid">
            <div className="dossier-kpi-cell">
              <span className="kpi-label">REGISTERED FIRs ({year})</span>
              <strong className="kpi-number">{activeRow.cases.toLocaleString('en-IN')}</strong>
            </div>
            <div className="dossier-kpi-cell">
              <span className="kpi-label">NATIONAL SHARE</span>
              <strong className="kpi-number">{share}%</strong>
            </div>
            <div className="dossier-kpi-cell">
              <span className="kpi-label">ALL-INDIA RANK</span>
              <strong className="kpi-number">
                #{rank} <small>of 36</small>
              </strong>
            </div>
          </div>

          <button
            className="dossier-open-btn stripe-glow-btn"
            onClick={() => onOpenDossier(activeRow.state_ut)}
          >
            <span>Open Confidential State Dossier</span>
            <ExternalLink size={14} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
