// Shared application shell and route handling for the seven dashboard sections.

import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  Command,
  ChevronRight,
  Menu,
} from 'lucide-react';
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
import { Sidebar, type AppRoute } from './components/Sidebar';
import { Overview } from './components/Overview';
import { StateIntelligence } from './components/StateIntelligence';
import { NationalAnalytics } from './components/NationalAnalytics';
import { DataExplorer } from './components/DataExplorer';
import { Methodology } from './components/Methodology';
import { DatasetStudio } from './studio/DatasetStudio';
import { Skeleton } from './components/ui';
import { LazyIndiaMap3D as IndiaMap3D } from './map/lazy';
import { CODE_TO_STATE, STATE_TO_CODE } from './lib/geo';
import { CommandPalette } from './components/CommandPalette';

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

/** Parses path into application route and optional state code/name */
function parsePathname(pathname: string): { route: AppRoute; stateArg?: string } {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '' || p === '/') return { route: 'overview' };
  if (p === '/app' || p === '/app/overview') return { route: 'overview' };
  if (p === '/app/map') return { route: 'map' };
  if (p.startsWith('/app/state')) {
    const parts = p.split('/');
    return { route: 'state', stateArg: parts[3] ? decodeURIComponent(parts[3]) : undefined };
  }
  if (p === '/app/analytics') return { route: 'analytics' };
  if (p === '/app/data' || p === '/app/explorer') return { route: 'explorer' };
  if (p === '/app/studio') return { route: 'studio' };
  if (p === '/app/method' || p === '/app/methodology') return { route: 'methodology' };
  return { route: 'overview' };
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      return parsePathname(window.location.pathname).route;
    }
    return 'overview';
  });

  const [year, setYear] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const y = parseInt(p.get('year') || '', 10);
      if (y >= 2020 && y <= 2024) return y;
    }
    return 2024;
  });

  const [years, setYears] = useState<number[]>([2020, 2021, 2022, 2023, 2024]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('Telangana');
  const [dark, setDark] = useState(() => prefersDark());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync state param from URL on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { stateArg } = parsePathname(window.location.pathname);
      if (stateArg) {
        const resolved = CODE_TO_STATE[stateArg] || stateArg;
        setSelected(resolved);
      } else {
        const p = new URLSearchParams(window.location.search);
        const s = p.get('state');
        if (s) {
          const resolved = CODE_TO_STATE[s] || s;
          setSelected(resolved);
        }
      }
    }
  }, []);

  // Update dynamic page title
  useEffect(() => {
    const baseTitle = 'India Cyber Crime Intelligence Platform';
    switch (currentRoute) {
      case 'overview':
        document.title = `Overview (${year}) — ${baseTitle}`;
        break;
      case 'map':
        document.title = `India 3D Map (${year}) — 3D Geospatial Intelligence`;
        break;
      case 'state':
        document.title = `${selected} Dossier (${year}) — ${baseTitle}`;
        break;
      case 'analytics':
        document.title = `National Analytics — ${baseTitle}`;
        break;
      case 'explorer':
        document.title = `Data Explorer Matrix (${year}) — ${baseTitle}`;
        break;
      case 'studio':
        document.title = `Dataset Studio — 3D Telemetry Visualizer`;
        break;
      case 'methodology':
        document.title = `Methodology & Spark Architecture — ${baseTitle}`;
        break;
    }
  }, [currentRoute, year, selected]);

  // Load backend data (with bootstrap support)
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

  // Historical matrix used by the data explorer.
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
        /* fallback to individual state details */
        if (states.length > 0) {
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
  }, [year, states]);

  // Navigation handler with browser History API push
  const navigateTo = useCallback(
    (route: AppRoute, path: string) => {
      setCurrentRoute(route);
      if (typeof window !== 'undefined') {
        let finalPath = path;
        // If navigating to state dossier, append the state code
        if (route === 'state' && !path.includes('/state/')) {
          const code = STATE_TO_CODE[selected] || selected;
          finalPath = `/app/state/${code}`;
        }
        // Retain the selected year in shareable section URLs.
        if (year !== 2024) {
          finalPath += `?year=${year}`;
        }
        window.history.pushState(null, '', finalPath);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [selected, year]
  );

  // Popstate listener for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const { route, stateArg } = parsePathname(window.location.pathname);
      setCurrentRoute(route);
      if (stateArg) {
        const resolved = CODE_TO_STATE[stateArg] || stateArg;
        setSelected(resolved);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keyboard navigation shortcuts: 1-7, T (theme), ? (shortcuts), ⌘K / Ctrl+K (command palette), Esc (close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === '1') navigateTo('overview', '/app');
      else if (e.key === '2') navigateTo('map', '/app/map');
      else if (e.key === '3') {
        const code = STATE_TO_CODE[selected] || selected;
        navigateTo('state', `/app/state/${code}`);
      } else if (e.key === '4') navigateTo('analytics', '/app/analytics');
      else if (e.key === '5') navigateTo('explorer', '/app/data');
      else if (e.key === '6') navigateTo('studio', '/app/studio');
      else if (e.key === '7') navigateTo('methodology', '/app/method');
      else if (e.key.toLowerCase() === 't') setDark((d) => !d);
      else if (e.key === '?') setShowShortcuts((s) => !s);
      else if (e.key === 'Escape') {
        setShowShortcuts(false);
        setIsCommandPaletteOpen(false);
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTo, selected]);

  const handleSelectState = useCallback(
    (name: string) => {
      if (!name) return;
      setSelected(name);
      const code = STATE_TO_CODE[name] || name;
      navigateTo('state', `/app/state/${code}`);
    },
    [navigateTo]
  );

  const retry = useCallback(() => {
    clearApiCache();
    setHistory(new Map());
    void load(year);
  }, [load, year]);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`platform-root ${dark ? 'dark' : 'light'}`}>
        <div className="app-shell-layout">
          <Sidebar
            currentRoute={currentRoute}
            onNavigate={(route, path) => navigateTo(route, path)}
            selectedState={selected}
            dark={dark}
            onToggleTheme={() => setDark(!dark)}
            onOpenShortcuts={() => setShowShortcuts(true)}
            isMobileOpen={isMobileOpen}
            onCloseMobile={() => setIsMobileOpen(false)}
          />

          <div className="app-content-column">
            <button
              className="mobile-menu-trigger-btn"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>

            {/* Report API errors without hiding the rest of the dashboard. */}
            {error && (
              <div className="error-callout global-error">
                <AlertTriangle size={18} className="error-icon" />
                <div className="error-content">
                  <strong>Backend service unreachable</strong>
                  <p>{error}</p>
                  <small>Start the app with <code>npm start</code> to run the dashboard and API together.</small>
                </div>
                <button className="primary-btn" onClick={retry}>
                  <RefreshCw size={13} /> Reconnect
                </button>
              </div>
            )}

            {/* Main Section Viewport */}
            <main
              className={`app-main-viewport ${currentRoute === 'map' ? 'viewport-map-cockpit' : 'viewport-editorial'}`}
              id="main-content"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentRoute}
                  className="route-animation-container"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  {currentRoute === 'overview' && (
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
                        onSelect={handleSelectState}
                      />
                    </ErrorBoundary>
                  )}

                  {/* 3. India 3D Map at `/app/map` */}
                  {currentRoute === 'map' && (
                    <ErrorBoundary label="India 3D Map">
                      <MapSection
                        year={year}
                        years={years}
                        onYearChange={setYear}
                        states={states}
                        loading={loading}
                        selected={selected}
                        dark={dark}
                        onSelect={(name) => setSelected(name)}
                        onOpenDossier={(name) => handleSelectState(name)}
                      />
                    </ErrorBoundary>
                  )}

                  {/* 4. State Dossier at `/app/state/*` */}
                  {currentRoute === 'state' && (
                    <ErrorBoundary label="State Dossier">
                      <StateIntelligence
                        selected={selected}
                        year={year}
                        years={years}
                        states={states}
                        overview={overview}
                        trends={trends}
                        loading={loading}
                        dark={dark}
                        onOpenMap={() => navigateTo('map', '/app/map')}
                        onSelect={handleSelectState}
                      />
                    </ErrorBoundary>
                  )}

                  {/* 5. National Analytics at `/app/analytics` */}
                  {currentRoute === 'analytics' && (
                    <ErrorBoundary label="National Analytics">
                      <NationalAnalytics
                        year={year}
                        years={years}
                        states={states}
                        trends={trends}
                        overview={overview}
                        loading={loading}
                        onSelect={handleSelectState}
                        onYearChange={setYear}
                      />
                    </ErrorBoundary>
                  )}

                  {/* 6. Data Explorer at `/app/data` */}
                  {currentRoute === 'explorer' && (
                    <ErrorBoundary label="Data Explorer">
                      <DataExplorer
                        states={states}
                        years={years}
                        year={year}
                        loading={loading}
                        onSelect={handleSelectState}
                        history={history}
                        matrixRows={matrixRows}
                      />
                    </ErrorBoundary>
                  )}

                  {/* 7. Dataset Studio at `/app/studio` */}
                  {currentRoute === 'studio' && (
                    <ErrorBoundary label="Dataset Studio">
                      <DatasetStudio dark={dark} />
                    </ErrorBoundary>
                  )}

                  {/* 8. Methodology at `/app/method` */}
                  {currentRoute === 'methodology' && (
                    <ErrorBoundary label="Methodology">
                      <Methodology />
                    </ErrorBoundary>
                  )}
                </motion.div>
              </AnimatePresence>

            </main>
          </div>
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
                  <button className="dialog-close" onClick={() => setShowShortcuts(false)}>
                    ✕
                  </button>
                </div>
                <div className="shortcuts-grid">
                  <div className="shortcut-row">
                    <kbd>1</kbd> <span>Overview (/app)</span>
                  </div>
                  <div className="shortcut-row">
                    <kbd>2</kbd> <span>India 3D Map (/app/map)</span>
                  </div>
                  <div className="shortcut-row">
                    <kbd>3</kbd> <span>State Dossier (/app/state)</span>
                  </div>
                  <div className="shortcut-row">
                    <kbd>4</kbd> <span>National Analytics (/app/analytics)</span>
                  </div>
                  <div className="shortcut-row">
                    <kbd>5</kbd> <span>Data Explorer (/app/data)</span>
                  </div>
                  <div className="shortcut-row">
                    <kbd>6</kbd> <span>Dataset Studio (/app/studio)</span>
                  </div>
                  <div className="shortcut-row">
                    <kbd>7</kbd> <span>Methodology (/app/method)</span>
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

        {/* Command Palette (⌘K / Ctrl+K) */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={(route, path) => navigateTo(route, path)}
          onSelectState={handleSelectState}
          onSelectYear={setYear}
          onToggleTheme={() => setDark(!dark)}
          states={states}
          years={years}
          currentYear={year}
          dark={dark}
        />
      </div>
    </MotionConfig>
  );
}

/** Edge-to-Edge 3D Geospatial Intelligence Cockpit */
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
  const [isPlayingTimelapse, setIsPlayingTimelapse] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareTarget, setCompareTarget] = useState<string>('Karnataka');

  // Play-years time-lapse runner
  useEffect(() => {
    if (!isPlayingTimelapse || years.length === 0) return;
    const timer = setInterval(() => {
      const idx = years.indexOf(year);
      const nextIdx = idx >= 0 ? (idx + 1) % years.length : 0;
      onYearChange(years[nextIdx]);
    }, 2200);
    return () => clearInterval(timer);
  }, [isPlayingTimelapse, years, year, onYearChange]);

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

  const compareRow = useMemo(() => {
    return states.find((s) => s.state_ut === compareTarget) || null;
  }, [states, compareTarget]);

  const nationalTotal = useMemo(() => {
    return states.reduce((acc, s) => acc + s.cases, 0);
  }, [states]);

  const rank = useMemo(() => {
    if (!activeJurisdiction) return 0;
    const idx = sortedStates.findIndex((s) => s.state_ut === activeJurisdiction);
    return idx >= 0 ? idx + 1 : 0;
  }, [sortedStates, activeJurisdiction]);

  const compareRank = useMemo(() => {
    if (!compareTarget) return 0;
    const idx = sortedStates.findIndex((s) => s.state_ut === compareTarget);
    return idx >= 0 ? idx + 1 : 0;
  }, [sortedStates, compareTarget]);

  const share = activeRow && nationalTotal > 0 ? ((activeRow.cases / nationalTotal) * 100).toFixed(1) : '0';
  const compareShare = compareRow && nationalTotal > 0 ? ((compareRow.cases / nationalTotal) * 100).toFixed(1) : '0';

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
                if (compareMode && activeJurisdiction && activeJurisdiction !== name) {
                  setCompareTarget(name);
                } else {
                  setActiveJurisdiction(name);
                  onSelect(name);
                }
              }}
            />
          </Suspense>
        )}
      </div>

      {/* Map controls */}
      <div className="hud-panel hud-top-right">
        <div className="hud-ctrl-group">
          <button
            className={`hud-btn ${isPlayingTimelapse ? 'active' : ''}`}
            onClick={() => setIsPlayingTimelapse(!isPlayingTimelapse)}
            title={isPlayingTimelapse ? 'Pause time-lapse playback' : 'Play 5-year longitudinal time-lapse (2020-2024)'}
          >
            {isPlayingTimelapse ? 'Pause ⏸' : 'Play Time-Lapse ▶'}
          </button>

          <button
            className={`hud-btn ${compareMode ? 'active' : ''}`}
            onClick={() => setCompareMode(!compareMode)}
            title="Toggle side-by-side comparative inspection"
          >
            {compareMode ? 'Exit Compare ✕' : 'Compare Jurisdictions ⇄'}
          </button>
        </div>
      </div>

      {/* Selected jurisdiction details */}
      {activeRow && (
        <div className="hud-panel hud-bottom-drawer">
          <div className="drawer-main-info">
            <div className="drawer-meta-tag">
              <span>{activeRow.category.toUpperCase()}</span>
              <span className="meta-sep">·</span>
              <span>RANK #{rank} OF 36</span>
              <span className="meta-sep">·</span>
              <span>{share}% OF NATIONAL TOTAL</span>
            </div>
            <h3 className="drawer-state-name">{activeRow.state_ut}</h3>
            <div className="drawer-metric-row">
              <span className="drawer-metric-num">{activeRow.cases.toLocaleString('en-IN')}</span>
              <span className="drawer-metric-sub">REGISTERED FIRs IN {year}</span>
            </div>
          </div>

          {compareMode && compareRow && (
            <div className="drawer-compare-info">
              <div className="drawer-meta-tag">
                <span>COMPARISON BENCHMARK</span>
                <span className="meta-sep">·</span>
                <span>RANK #{compareRank}</span>
              </div>
              <h3 className="drawer-state-name">{compareRow.state_ut}</h3>
              <div className="drawer-metric-row">
                <span className="drawer-metric-num">{compareRow.cases.toLocaleString('en-IN')}</span>
                <span className="drawer-metric-sub">
                  Δ {Math.abs(activeRow.cases - compareRow.cases).toLocaleString('en-IN')} cases (
                  {activeRow.cases > compareRow.cases ? 'higher' : 'lower'})
                </span>
              </div>
            </div>
          )}

          <div className="drawer-actions">
            <button
              className="primary-btn drawer-dossier-btn"
              onClick={() => onOpenDossier(activeRow.state_ut)}
            >
              <span>Open Complete Dossier</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
