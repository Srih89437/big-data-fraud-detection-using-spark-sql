// Searchable statewise case table with yearly history and CSV/JSON export.

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Search,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  ExternalLink,
  Table as TableIcon,
} from 'lucide-react';
import type { MatrixRow, StateRow } from '../lib/types';
import { Skeleton } from './ui';

export interface DataExplorerProps {
  states: StateRow[];
  years: number[];
  year: number;
  loading: boolean;
  onSelect: (name: string) => void;
  /** Full historical matrix: jurisdiction -> year -> cases. */
  history: Map<string, Map<number, number>>;
  matrixRows?: MatrixRow[];
}

type SortKey = 'name' | 'category' | 'cases' | number;
type SortDir = 'asc' | 'desc';
type CategoryFilter = 'all' | 'State' | 'Union Territory' | 'high_volume';

const fmt = (n: number) => n.toLocaleString('en-IN');

function toCsv(
  rows: StateRow[],
  years: number[],
  history: Map<string, Map<number, number>>,
): string {
  const header = ['state_ut', 'category', 'active_year_cases', ...years.map(String)];
  const lines = [header.join(',')];
  for (const r of rows) {
    const hist = history.get(r.state_ut);
    const yearVals = years.map((y) => hist?.get(y) ?? '');
    lines.push(
      [r.state_ut, r.category, r.cases, ...yearVals]
        .map((v) => {
          const s = String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    );
  }
  return lines.join('\n');
}

function MiniSparkline({ points, color = '#E07A38' }: { points: number[]; color?: string }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 64;
  const height = 18;
  const coords = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * (width - 6) + 3;
    const y = height - 3 - ((p - min) / range) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M ${coords.join(' L ')}`;
  const lastCoord = coords[coords.length - 1].split(',');

  return (
    <svg width={width} height={height} className="inline-sparkline" aria-hidden="true">
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastCoord[0]} cy={lastCoord[1]} r={2.2} fill={color} />
    </svg>
  );
}

export function DataExplorer({
  states,
  years,
  year,
  loading,
  onSelect,
  history,
  matrixRows,
}: DataExplorerProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('cases');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const maxCasesInYear = useMemo(() => {
    let m = 1;
    for (const s of states) if (s.cases > m) m = s.cases;
    return m;
  }, [states]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = states.filter((s) => {
      if (filter === 'State' && s.category !== 'State') return false;
      if (filter === 'Union Territory' && s.category !== 'Union Territory') return false;
      if (filter === 'high_volume' && s.cases < 5000) return false;
      if (q && !s.state_ut.toLowerCase().includes(q)) return false;
      return true;
    });

    out = [...out].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.state_ut.localeCompare(b.state_ut);
      } else if (sortKey === 'category') {
        cmp = a.category.localeCompare(b.category);
      } else if (sortKey === 'cases') {
        cmp = a.cases - b.cases;
      } else if (typeof sortKey === 'number') {
        const valA = history.get(a.state_ut)?.get(sortKey) ?? 0;
        const valB = history.get(b.state_ut)?.get(sortKey) ?? 0;
        cmp = valA - valB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return out;
  }, [states, query, filter, sortKey, sortDir, history]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = toCsv(rows, years, history);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `India_Cybercrime_${year}_Matrix.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded CSV for ${rows.length} jurisdictions`);
  };

  const handleDownloadJson = () => {
    const data = rows.map((r) => {
      const hist = history.get(r.state_ut);
      const multiYear: Record<string, number> = {};
      for (const y of years) {
        multiYear[String(y)] = hist?.get(y) ?? 0;
      }
      return {
        jurisdiction: r.state_ut,
        classification: r.category,
        cases_in_selected_year: r.cases,
        reporting_year: year,
        historical_series: multiYear,
      };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `India_Cybercrime_${year}_Matrix.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported JSON for ${rows.length} jurisdictions`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="explorer-root-container">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="explorer-toast-pill"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <CheckCircle2 size={15} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explorer Command Header */}
      <div className="explorer-header-deck">
        <div className="explorer-header-left">
          <div className="explorer-eyebrow">
            <span className="eyebrow-accent-dot" />
            <span className="eyebrow-title">CENTRAL JURISDICTION MATRIX</span>
            <span className="eyebrow-slash">/</span>
            <span className="eyebrow-year">MASTER DATASET</span>
          </div>
          <h1 className="explorer-main-headline">
            All 36 jurisdictions,
            <span className="headline-gradient-text"> in one table.</span>
          </h1>
          <p className="explorer-headline-desc">
            Compare registered case counts across states and union territories from 2020 to 2024.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="explorer-export-actions">
          <button className="explorer-action-btn stripe-glow-btn" onClick={handleDownloadCsv}>
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>
          <button className="explorer-action-btn ghost-action-btn" onClick={handleDownloadJson}>
            <FileCode size={14} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* High-Performance Filter & Search Bar */}
      <div className="explorer-toolbar-bar">
        <div className="explorer-search-input-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search state, union territory, or volume threshold…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="clear-search-btn" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        <div className="explorer-filter-pills">
          <button
            className={`filter-chip ${filter === 'all' ? 'active-chip' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Jurisdictions ({states.length})
          </button>
          <button
            className={`filter-chip ${filter === 'State' ? 'active-chip' : ''}`}
            onClick={() => setFilter('State')}
          >
            States (28)
          </button>
          <button
            className={`filter-chip ${filter === 'Union Territory' ? 'active-chip' : ''}`}
            onClick={() => setFilter('Union Territory')}
          >
            UTs (8)
          </button>
          <button
            className={`filter-chip ${filter === 'high_volume' ? 'active-chip' : ''}`}
            onClick={() => setFilter('high_volume')}
          >
            High Volume (&gt;5,000 FIRs)
          </button>
        </div>
      </div>

      {/* Central High-Density Table */}
      <div className="explorer-matrix-card">
        <div className="matrix-table-wrap">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th className="col-jurisdiction sortable-th" onClick={() => toggleSort('name')}>
                  <div className="th-content">
                    <span>JURISDICTION</span>
                    {sortKey === 'name' && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
                <th className="col-category sortable-th" onClick={() => toggleSort('category')}>
                  <div className="th-content">
                    <span>CLASSIFICATION</span>
                    {sortKey === 'category' && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
                <th className="col-active-cases sortable-th text-right" onClick={() => toggleSort('cases')}>
                  <div className="th-content justify-end">
                    <span>CASES ({year})</span>
                    {sortKey === 'cases' && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
                <th className="col-sparkbar">VOLUME RATIO</th>
                <th className="col-trend-sparkline text-center">5-YR TREND</th>
                {years.map((y) => (
                  <th
                    key={y}
                    className={`col-hist-year sortable-th text-right ${year === y ? 'active-col-th' : ''}`}
                    onClick={() => toggleSort(y)}
                  >
                    <div className="th-content justify-end">
                      <span>{y}</span>
                      {sortKey === y && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </div>
                  </th>
                ))}
                <th className="col-action">DOSSIER</th>
              </tr>
            </thead>
            <tbody>
              {loading && states.length === 0 ? (
                <tr>
                  <td colSpan={6 + years.length}>
                    <Skeleton height={200} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6 + years.length} className="empty-table-cell">
                    No jurisdictions matched "{query}".
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const hist = history.get(r.state_ut);
                  const barWidth = Math.max(3, Math.min(100, (r.cases / maxCasesInYear) * 100));
                  return (
                    <tr key={r.state_ut} className="matrix-tr" onClick={() => onSelect(r.state_ut)}>
                      <td className="col-rank">{idx + 1}</td>
                      <td className="col-jurisdiction">
                        <strong className="jurisdiction-name">{r.state_ut}</strong>
                      </td>
                      <td className="col-category">
                        <span className={`cat-pill ${r.category === 'Union Territory' ? 'cat-ut' : 'cat-state'}`}>
                          {r.category === 'Union Territory' ? 'UT' : 'State'}
                        </span>
                      </td>
                      <td className="col-active-cases text-right">
                        <span className="tabular-num case-count-bold">{fmt(r.cases)}</span>
                      </td>
                      <td className="col-sparkbar">
                        <div className="sparkbar-track">
                          <div
                            className="sparkbar-fill"
                            style={{ width: `${barWidth}%` }}
                            title={`${r.state_ut}: ${fmt(r.cases)} cases`}
                          />
                        </div>
                      </td>
                      <td className="col-trend-sparkline text-center">
                        {(() => {
                          const mRow = matrixRows?.find((m) => m.state_ut === r.state_ut);
                          const pts = mRow?.sparkline || years.map((y) => hist?.get(y) ?? 0);
                          const trendColor = pts[pts.length - 1] >= pts[0] ? '#E07A38' : '#22C55E';
                          return <MiniSparkline points={pts} color={trendColor} />;
                        })()}
                      </td>
                      {years.map((y) => {
                        const val = hist?.get(y);
                        return (
                          <td
                            key={y}
                            className={`col-hist-year text-right ${year === y ? 'active-col-td' : ''}`}
                          >
                            <span className="tabular-num hist-num">
                              {val !== undefined ? fmt(val) : '—'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="col-action" onClick={(e) => { e.stopPropagation(); onSelect(r.state_ut); }}>
                        <button className="open-dossier-link" title={`Open ${r.state_ut} dossier`}>
                          <span>Dossier</span>
                          <ExternalLink size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="matrix-footer-deck">
          <span className="footer-records-count">Showing {rows.length} of {states.length} reporting jurisdictions</span>
        </div>
      </div>
    </div>
  );
}
