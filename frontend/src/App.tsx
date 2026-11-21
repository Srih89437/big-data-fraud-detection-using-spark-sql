// Application Shell: Vertical Left Sidebar + Content Routing
// Strictly adheres to Section C0 and master prompt requirements:
// - Left vertical sidebar fixed on left (~232px, collapsible to ~64px rail)
// - NO horizontal menu bar at the top on desktop/tablet anywhere (/ or /app/*)
// - Content sits on the right
// - Exact 7 sidebar items: Overview 1, India 3D Map 2, State Dossier 3,
//   National Analytics 4, Data Explorer 5, Dataset Studio 6, Methodology 7
// - Complete introduction website mounted at `/` (LandingPage)
// - Application mounted at `/app/*`
// - Dynamic URL synchronization & shareable links (?year=YYYY&state=NAME)

import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  Command,
  ChevronRight,
  Menu,
  Clock,
  Radio,
  Calendar,
  Shield,
} from 'lucide-react';
import { StripeBadge } from './components/MotionPrimitives';
import {
  clearApiCache,
  fetchBootstrap,
  fetchMatrix,
  fetchOverview,
  fetchStateDetail,
  fetchStates,
  fetchTrends,
  fetchYears,
} from './lib/api';
import type {
  BootstrapResponse,
  MatrixRow,
  OverviewResponse,
  StateRow,
  TrendPoint,
} from './lib/types';
import { Sidebar, type AppRoute } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { Overview } from './components/Overview';
import { StateIntelligence } from './components/StateIntelligence';
import { NationalAnalytics } from './components/NationalAnalytics';
import { DataExplorer } from './components/DataExplorer';
import { Methodology } from './components/Methodology';
import { AtmosphericBackground } from './components/AtmosphericBackground';
import { DatasetStudio } from './studio/DatasetStudio';
import { Skeleton } from './components/ui';
import { LazyIndiaMap3D as IndiaMap3D } from './map/lazy';
import { CODE_TO_STATE, STATE_TO_CODE } from './lib/geo';
import { CommandPalette } from './components/CommandPalette';
import { IndiaPrismMark } from './components/IndiaPrismMark';

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
  if (p === '' || p === '/') return { route: 'landing' };
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
  return { route: 'landing' };
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      return parsePathname(window.location.pathname).route;
    }
    return 'landing';
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
  const [bootstrapData, setBootstrapData] = useState<BootstrapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('Telangana');
  const [dark, setDark] = useState(() => prefersDark());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [clockTime, setClockTime] = useState<string>('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
      case 'landing':
        document.title = `${baseTitle} — 3D National Observatory`;
        break;
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
      const [boot, s, o, t, yr] = await Promise.all([
        fetchBootstrap().catch(() => null),
        fetchStates(y),
        fetchOverview(y),
        fetchTrends(),
        fetchYears(),
      ]);
      if (boot) setBootstrapData(boot);
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

  // Historical matrix for the explorer and landing table
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
        // Retain year query param if not landing
        if (route !== 'landing' && year !== 2024) {
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

  const isAppSection = currentRoute !== 'landing';

  return (
    <MotionConfig reducedMotion="user">
      <div className={`platform-root ${dark ? 'dark' : 'light'}`}>
        <AtmosphericBackground section={currentRoute} dark={dark} />

        {/* Precision Hairline Tricolor Bar */}
        <div className="national-accent-bar" aria-hidden="true">
          <span className="accent-saffron" />
          <span className="accent-white" />
          <span className="accent-green" />
        </div>

        {/* ===================================================================
            TWO-COLUMN GRID LAYOUT (Section C0 Hard Requirement):
            [Vertical Left Sidebar: 232px] [Content Column: 1fr]
            NO horizontal top menu bar anywhere.
            =================================================================== */}
        <div className="app-shell-layout">
          {/* Vertical Left Sidebar */}
          <Sidebar
            currentRoute={currentRoute}
            onNavigate={(route, path) => navigateTo(route, path)}
            selectedState={selected}
            dark={dark}
            onToggleTheme={() => setDark(!dark)}
            onOpenShortcuts={() => setShowShortcuts(true)}
            sparkOnline={!error}
            isMobileOpen={isMobileOpen}
            onCloseMobile={() => setIsMobileOpen(false)}
          />

          {/* Right Content Area */}
          <div className="app-content-column">
            {/* Mobile Drawer Trigger for Landing Page */}
            {!isAppSection && (
              <button
                className="landing-mobile-menu-btn mobile-menu-btn"
                onClick={() => setIsMobileOpen(true)}
                aria-label="Open navigation drawer"
              >
                <Menu size={18} />
              </button>
            )}

            {/* Minimal In-Content Header (Only shown inside /app/*, NOT on /) */}
            {isAppSection && (
              <div className="content-page-subbar">
                <div className="subbar-left">
                  {/* Mobile Drawer Hamburger Button */}
                  <button
                    className="mobile-menu-trigger-btn mobile-menu-btn"
                    onClick={() => setIsMobileOpen(true)}
                    aria-label="Open navigation drawer"
                  >
                    <Menu size={18} />
                  </button>

                  <div className="subbar-breadcrumbs">
                    <button
                      className="subbar-crumb-link"
                      onClick={() => navigateTo('landing', '/')}
                    >
                      ICIP 2026
                    </button>
                    <ChevronRight size={11} className="subbar-sep" />
                    <span className="subbar-crumb-app">APP</span>
                    <ChevronRight size={11} className="subbar-sep" />
                    <span className="subbar-crumb-current">
                      {currentRoute === 'overview' && 'OVERVIEW'}
                      {currentRoute === 'map' && 'INDIA 3D MAP'}
                      {currentRoute === 'state' && `STATE DOSSIER // ${selected.toUpperCase()}`}
                      {currentRoute === 'analytics' && 'NATIONAL ANALYTICS'}
                      {currentRoute === 'explorer' && 'DATA EXPLORER'}
                      {currentRoute === 'studio' && 'DATASET STUDIO'}
                      {currentRoute === 'methodology' && 'METHODOLOGY'}
                    </span>
                  </div>
                </div>

                <div className="subbar-right">
                  {/* Year Switcher for the Application Views */}
                  {currentRoute !== 'studio' && currentRoute !== 'methodology' && (
                    <div className="subbar-year-switcher">
                      <span className="subbar-year-label">CYCLE:</span>
                      <div className="subbar-year-pills">
                        {years.map((y) => {
                          const isActive = year === y;
                          return (
                            <button
                              key={y}
                              className={`subbar-year-btn ${isActive ? 'active' : ''}`}
                              onClick={() => setYear(y)}
                            >
                              {isActive && (
                                <motion.div
                                  className="subbar-active-year-pill"
                                  layoutId="subbarYearActivePill"
                                  transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                                  aria-hidden="true"
                                />
                              )}
                              <span className="year-btn-text">{y}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* IST Clock */}
                  {clockTime && (
                    <div className="subbar-clock-pill" title="Indian Standard Time">
                      <Clock size={12} className="clock-icon" />
                      <span>{clockTime}</span>
                    </div>
                  )}

                  {/* Command Palette Trigger */}
                  <button
                    className="subbar-action-icon-btn"
                    onClick={() => setIsCommandPaletteOpen(true)}
                    title="Command Palette (⌘K / Ctrl+K)"
                    aria-label="Command Palette"
                  >
                    <Command size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Error Callout if Backend Service Unreachable */}
            {error && (
              <div className="error-callout global-error">
                <AlertTriangle size={18} className="error-icon" />
                <div className="error-content">
                  <strong>Backend service unreachable</strong>
                  <p>{error}</p>
                  <small>
                    Run <code>uvicorn backend.main:app --port 8000</code> to reconnect the Spark SQL backend.
                  </small>
                </div>
                <button className="primary-btn" onClick={retry}>
                  <RefreshCw size={13} /> Reconnect
                </button>
              </div>
            )}

            {/* Main Section Viewport */}
            <main
              className={`app-main-viewport ${
                currentRoute === 'landing'
                  ? 'viewport-landing'
                  : currentRoute === 'map'
                  ? 'viewport-map-cockpit'
                  : 'viewport-editorial'
              }`}
              id="main-content"
            >
              {/* Mobile Menu Opener on Landing Page */}
              {!isAppSection && (
                <button
                  className="landing-mobile-menu-btn"
                  onClick={() => setIsMobileOpen(true)}
                  aria-label="Open navigation menu"
                >
                  <Menu size={18} />
                  <span>Menu</span>
                </button>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentRoute}
                  className="route-animation-container"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* 1. Introduction Website at `/` */}
                  {currentRoute === 'landing' && (
                    <ErrorBoundary label="Introduction Website">
                      <LandingPage
                        bootstrapData={bootstrapData}
                        states={states}
                        matrixRows={matrixRows}
                        year={year}
                        dark={dark}
                        onNavigate={(r, p) => navigateTo(r as AppRoute, p)}
                        onSelectState={handleSelectState}
                      />
                    </ErrorBoundary>
                  )}

                  {/* 2. Overview at `/app` */}
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
                        source="NCRB, Crime in India · Ministry of Home Affairs / Press Information Bureau · 21 July 2026"
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

              {/* Minimal App Footer */}
              {isAppSection && currentRoute !== 'map' && (
                <footer className="platform-footer">
                  <div className="footer-content">
                    <div className="footer-left">
                      <div className="footer-brand">
                        <IndiaPrismMark size={16} />
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
              )}
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

      {/* Floating Tactical HUD: Top-Right Controls */}
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

      {/* Floating Bottom Intelligence Drawer (When a Jurisdiction is Selected) */}
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
