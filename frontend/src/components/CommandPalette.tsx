import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Map as MapIcon,
  Compass,
  BarChart3,
  Database,
  Box,
  FileText,
  Calendar,
  Sun,
  Moon,
  ChevronRight,
  ArrowRight,
  MapPin,
  Sliders,
} from 'lucide-react';
import type { AppRoute } from './Sidebar';
import type { StateRow } from '../lib/types';
import { STATE_TO_CODE } from '../lib/geo';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: AppRoute, path: string) => void;
  onSelectState: (stateName: string) => void;
  onSelectYear: (year: number) => void;
  onToggleTheme: () => void;
  states: StateRow[];
  years: number[];
  currentYear: number;
  dark: boolean;
}

interface PaletteItem {
  id: string;
  category: 'Pages' | 'Jurisdictions' | 'Years' | 'Actions';
  label: string;
  subLabel?: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onSelectState,
  onSelectYear,
  onToggleTheme,
  states,
  years,
  currentYear,
  dark,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build full list of palette items
  const allItems = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      // Primary Pages
      {
        id: 'page-overview',
        category: 'Pages',
        label: 'Overview',
        subLabel: 'National Threat Matrix & Cockpit',
        shortcut: '1',
        icon: <LayoutDashboard size={16} />,
        action: () => onNavigate('overview', '/app'),
      },
      {
        id: 'page-map',
        category: 'Pages',
        label: 'India 3D Map',
        subLabel: '36-Jurisdiction 3D Choropleth & Extruded Columns',
        shortcut: '2',
        icon: <MapIcon size={16} />,
        action: () => onNavigate('map', '/app/map'),
      },
      {
        id: 'page-state',
        category: 'Pages',
        label: 'State Dossier',
        subLabel: 'Single Jurisdiction Deep-Dive',
        shortcut: '3',
        icon: <Compass size={16} />,
        action: () => onNavigate('state', '/app/state'),
      },
      {
        id: 'page-analytics',
        category: 'Pages',
        label: 'National Analytics',
        subLabel: 'Longitudinal Trajectories & Category Split',
        shortcut: '4',
        icon: <BarChart3 size={16} />,
        action: () => onNavigate('analytics', '/app/analytics'),
      },
      {
        id: 'page-explorer',
        category: 'Pages',
        label: 'Data Explorer',
        subLabel: 'Multi-Year Evidence Table & Instant Export',
        shortcut: '5',
        icon: <Database size={16} />,
        action: () => onNavigate('explorer', '/app/data'),
      },
      {
        id: 'page-studio',
        category: 'Pages',
        label: 'Dataset Studio',
        subLabel: 'Custom Telemetry Ingest & 3D Visualizer',
        shortcut: '6',
        icon: <Box size={16} />,
        action: () => onNavigate('studio', '/app/studio'),
      },
      {
        id: 'page-methodology',
        category: 'Pages',
        label: 'Methodology',
        subLabel: 'Provenance, Primary Source & Spark Pipeline',
        shortcut: '7',
        icon: <FileText size={16} />,
        action: () => onNavigate('methodology', '/app/method'),
      },
      {
        id: 'page-landing',
        category: 'Pages',
        label: 'Introduction Website',
        subLabel: 'Public Overview & Craft Presentation (/)',
        shortcut: '0',
        icon: <ArrowRight size={16} />,
        action: () => onNavigate('landing', '/'),
      },

      // Actions
      {
        id: 'action-theme',
        category: 'Actions',
        label: `Switch to ${dark ? 'Light' : 'Dark'} Mode`,
        subLabel: 'Toggle color scheme (Paper / Ink)',
        shortcut: 'T',
        icon: dark ? <Sun size={16} /> : <Moon size={16} />,
        action: onToggleTheme,
      },
    ];

    // Reporting Years
    for (const y of years) {
      list.push({
        id: `year-${y}`,
        category: 'Years',
        label: `Reporting Cycle ${y}`,
        subLabel: y === currentYear ? 'Active reporting year' : `Switch calendar year to ${y}`,
        shortcut: String(y),
        icon: <Calendar size={16} />,
        action: () => onSelectYear(y),
      });
    }

    // 36 Jurisdictions
    for (const s of states) {
      const code = STATE_TO_CODE[s.state_ut] || s.state_ut;
      list.push({
        id: `state-${s.state_ut}`,
        category: 'Jurisdictions',
        label: s.state_ut,
        subLabel: `${s.cases.toLocaleString('en-IN')} FIRs registered (${code})`,
        shortcut: code,
        icon: <MapPin size={16} />,
        action: () => onSelectState(s.state_ut),
      });
    }

    return list;
  }, [states, years, currentYear, dark, onNavigate, onSelectState, onSelectYear, onToggleTheme]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.subLabel && item.subLabel.toLowerCase().includes(q)) ||
        (item.shortcut && item.shortcut.toLowerCase() === q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Keep active index in bounds
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[activeIndex]) {
        filteredItems[activeIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="command-palette-backdrop" onClick={onClose}>
          <motion.div
            className="command-palette-modal"
            initial={{ opacity: 0, scale: 0.96, y: -14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -14 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Input Header */}
            <div className="palette-input-box">
              <Search size={18} className="palette-search-icon" />
              <input
                ref={inputRef}
                type="text"
                className="palette-search-input"
                placeholder="Search 36 states, years, views, actions… (Press Esc to close)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
              <span className="palette-esc-badge">ESC</span>
            </div>

            {/* Results List */}
            <div className="palette-results-list" role="listbox">
              {filteredItems.length === 0 ? (
                <div className="palette-empty-state">
                  <span>No matching commands or jurisdictions found for "{query}"</span>
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <div
                      key={item.id}
                      className={`palette-item-row ${isActive ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      role="option"
                      aria-selected={isActive}
                    >
                      <div className="item-icon-wrap" aria-hidden="true">
                        {item.icon}
                      </div>
                      <div className="item-text-group">
                        <span className="item-label">{item.label}</span>
                        {item.subLabel && <span className="item-sublabel">{item.subLabel}</span>}
                      </div>
                      <div className="item-category-tag">
                        <span>{item.category}</span>
                        {item.shortcut && <kbd className="item-shortcut">{item.shortcut}</kbd>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Palette Footer Guidance */}
            <div className="palette-footer-bar">
              <div className="palette-nav-hint">
                <kbd>↑</kbd> <kbd>↓</kbd> to navigate
                <kbd>↵</kbd> to select
                <kbd>Esc</kbd> to dismiss
              </div>
              <div className="palette-hint-right">
                <span>36 Jurisdictions · 2020–2024</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
