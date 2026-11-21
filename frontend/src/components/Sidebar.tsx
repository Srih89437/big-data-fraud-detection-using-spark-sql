// Left Vertical Sidebar (Portrait) Navigation System
// Complies strictly with Section C0:
// - Fixed vertical left sidebar (~232px width, collapsible to ~64px icon rail)
// - NO horizontal top menu on desktop/tablet
// - Exactly 7 items in exact wording and order:
//   1. Overview — 1
//   2. India 3D Map — 2
//   3. State Dossier — 3 (with currently selected state shown as secondary line)
//   4. National Analytics — 4
//   5. Data Explorer — 5
//   6. Dataset Studio — 6
//   7. Methodology — 7
// - Framer Motion layoutId sliding active indicator + amber marker
// - Bottom health pill, theme toggle, help (?), and collapse toggle

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Map as MapIcon,
  Compass,
  BarChart3,
  Database,
  Box,
  FileText,
  Sun,
  Moon,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Activity,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { IndiaPrismMark } from './IndiaPrismMark';

export type AppRoute =
  | 'landing'
  | 'overview'
  | 'map'
  | 'state'
  | 'analytics'
  | 'explorer'
  | 'studio'
  | 'methodology';

export interface NavItemDef {
  id: AppRoute;
  path: string;
  label: string;
  shortcut: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItemDef[] = [
  {
    id: 'overview',
    path: '/app',
    label: 'Overview',
    shortcut: '1',
    icon: LayoutDashboard,
    description: 'National Threat Matrix',
  },
  {
    id: 'map',
    path: '/app/map',
    label: 'India 3D Map',
    shortcut: '2',
    icon: MapIcon,
    description: '36-Jurisdiction Choropleth',
  },
  {
    id: 'state',
    path: '/app/state',
    label: 'State Dossier',
    shortcut: '3',
    icon: Compass,
    description: 'Jurisdiction Deep-Dive',
  },
  {
    id: 'analytics',
    path: '/app/analytics',
    label: 'National Analytics',
    shortcut: '4',
    icon: BarChart3,
    description: 'Longitudinal Trajectories',
  },
  {
    id: 'explorer',
    path: '/app/data',
    label: 'Data Explorer',
    shortcut: '5',
    icon: Database,
    description: 'Multi-Year Evidence Table',
  },
  {
    id: 'studio',
    path: '/app/studio',
    label: 'Dataset Studio',
    shortcut: '6',
    icon: Box,
    description: 'Custom Telemetry & 3D Charts',
  },
  {
    id: 'methodology',
    path: '/app/method',
    label: 'Methodology',
    shortcut: '7',
    icon: FileText,
    description: 'Provenance & Spark Pipeline',
  },
];

interface SidebarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute, path: string) => void;
  selectedState: string | null;
  dark: boolean;
  onToggleTheme: () => void;
  onOpenShortcuts: () => void;
  sparkOnline: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  currentRoute,
  onNavigate,
  selectedState,
  dark,
  onToggleTheme,
  onOpenShortcuts,
  sparkOnline,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('icip_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('icip_sidebar_collapsed', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="sidebar-mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        className={`vertical-left-sidebar left-vertical-sidebar ${collapsed ? 'collapsed' : ''} ${
          isMobileOpen ? 'mobile-open' : ''
        }`}
        aria-label="Primary Platform Navigation"
      >
        {/* Brand Header */}
        <div className="sidebar-brand-area">
          <button
            className="sidebar-brand-btn"
            onClick={() => {
              onNavigate('landing', '/');
              onCloseMobile();
            }}
            title="Return to Public Overview (/)"
          >
            <div className="sidebar-crest-mark" aria-hidden="true">
              <IndiaPrismMark size={20} />
            </div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-title">INDIA CYBER INTEL</span>
                <span className="sidebar-brand-subtitle">SURVEY ROOM · 2026</span>
              </div>
            )}
          </button>

          {/* Mobile close button */}
          <button
            className="sidebar-mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Middle: 7 Items in exact order */}
        <nav className="sidebar-nav-list" aria-label="Sections">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            const isStateDossier = item.id === 'state';

            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onNavigate(item.id, item.path);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                title={
                  collapsed
                    ? `${item.label} (${item.shortcut})`
                    : `${item.label} · Press '${item.shortcut}'`
                }
              >
                {isActive && (
                  <motion.div
                    className="sidebar-active-indicator"
                    layoutId="activeSidebarIndicator"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    aria-hidden="true"
                  />
                )}

                <div className="sidebar-item-icon-wrap" aria-hidden="true">
                  <Icon size={17} strokeWidth={isActive ? 2.3 : 1.8} />
                </div>

                {!collapsed && (
                  <div className="sidebar-item-label-group">
                    <span className="sidebar-item-label">{item.label}</span>
                    {isStateDossier && (
                      <span
                        className="sidebar-item-secondary-chip"
                        title={selectedState ? `Active: ${selectedState}` : 'No state selected'}
                      >
                        {selectedState || 'Select a state'}
                      </span>
                    )}
                  </div>
                )}

                {!collapsed && (
                  <kbd className="sidebar-item-shortcut" aria-hidden="true">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Area: Health, Theme, Help, Collapse */}
        <div className="sidebar-footer-area">
          {/* Spark Health Indicator */}
          <div
            className="sidebar-health-pill"
            title={sparkOnline ? 'Apache Spark SQL 3.5 Online' : 'Backend offline'}
          >
            <span
              className={`health-dot ${sparkOnline ? 'online' : 'offline'}`}
              aria-hidden="true"
            />
            {!collapsed && (
              <span className="health-label">
                {sparkOnline ? 'SPARK 3.5 ONLINE' : 'SPARK DISCONNECTED'}
              </span>
            )}
          </div>

          <div className="sidebar-actions-row">
            {/* Theme Toggle */}
            <button
              className="sidebar-action-btn"
              onClick={onToggleTheme}
              title={`Switch to ${dark ? 'light' : 'dark'} mode (T)`}
              aria-label="Toggle color theme"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Help / Shortcuts */}
            <button
              className="sidebar-action-btn"
              onClick={onOpenShortcuts}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              <HelpCircle size={15} />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              className="sidebar-action-btn collapse-toggle-btn"
              onClick={toggleCollapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
