// Sovereign Navigation Bar: Precision Top-Level Floating Segmented Dock
// Features spring physics active pill, keyboard shortcut indicators, grouped navigation,
// and responsive adaptation.

import {
  BarChart3,
  Compass,
  Database,
  FileText,
  LayoutDashboard,
  Map as MapIcon,
  Box,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export type SectionId =
  | 'overview'
  | 'map'
  | 'state'
  | 'analytics'
  | 'explorer'
  | 'studio'
  | 'methodology';

export interface SectionDef {
  id: SectionId;
  label: string;
  short: string;
  subtitle: string;
  icon: LucideIcon;
  shortcut: string;
  group: 'intel' | 'analysis' | 'docs';
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    short: 'Overview',
    subtitle: 'National summary & trends',
    icon: LayoutDashboard,
    shortcut: '1',
    group: 'intel',
  },
  {
    id: 'map',
    label: 'India 3D Map',
    short: '3D Map',
    subtitle: 'Geographic choropleth',
    icon: MapIcon,
    shortcut: '2',
    group: 'intel',
  },
  {
    id: 'state',
    label: 'State Dossier',
    short: 'State',
    subtitle: 'Jurisdiction dossier',
    icon: Compass,
    shortcut: '3',
    group: 'intel',
  },
  {
    id: 'analytics',
    label: 'National Analytics',
    short: 'Analytics',
    subtitle: 'Comparative metrics',
    icon: BarChart3,
    shortcut: '4',
    group: 'analysis',
  },
  {
    id: 'explorer',
    label: 'Data Explorer',
    short: 'Explorer',
    subtitle: 'Full jurisdiction matrix',
    icon: Database,
    shortcut: '5',
    group: 'analysis',
  },
  {
    id: 'studio',
    label: 'Dataset Studio',
    short: 'Studio',
    subtitle: 'Upload & 3D visualizers',
    icon: Box,
    shortcut: '6',
    group: 'analysis',
  },
  {
    id: 'methodology',
    label: 'Methodology',
    short: 'Docs',
    subtitle: 'Data provenance & engine',
    icon: FileText,
    shortcut: '7',
    group: 'docs',
  },
];

interface NavigationProps {
  active: SectionId;
  onChange: (id: SectionId) => void;
  selectedState: string | null;
}

export function Navigation({ active, onChange, selectedState }: NavigationProps) {
  return (
    <nav className="sovereign-nav-dock" aria-label="Main section navigation">
      <div className="dock-pill-track">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              className={`dock-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onChange(s.id)}
              aria-current={isActive ? 'page' : undefined}
              title={`${s.label} (${s.subtitle}) · Press '${s.shortcut}'`}
            >
              {isActive && (
                <motion.div
                  className="dock-active-glow-pill"
                  layoutId="sovereignActiveTabIndicator"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  aria-hidden="true"
                />
              )}
              <span className="dock-icon-wrap">
                <Icon size={15} strokeWidth={isActive ? 2.4 : 1.8} />
              </span>
              <span className="dock-tab-label">{s.label}</span>
              {s.id === 'state' && selectedState && (
                <span className="dock-state-badge" title={`Active: ${selectedState}`}>
                  {selectedState}
                </span>
              )}
              <kbd className="dock-hotkey-badge">{s.shortcut}</kbd>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
