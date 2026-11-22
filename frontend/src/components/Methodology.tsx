// Methodology: Technical Documentation & Provenance Standards.
// Details exact administrative data sources, Survey of India / DataMeet cartographic provenance,
// statistical definitions, compute engine architecture, and strict limitations.

import { Database, MapPin, AlertCircle, Cpu, Scale, CheckCircle2 } from 'lucide-react';
import { Reveal } from './ui';

const MethodologyPanel = ({
  index,
  icon: Icon,
  title,
  subtitle,
  children,
  action,
}: {
  index: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div
    className="method-doc-panel"
  >
    <div className="method-panel-header">
      <div className="method-panel-icon-wrap">
        <Icon size={18} />
      </div>
      <div className="method-panel-titles">
        <span className="method-panel-index">{index}</span>
        <h3 className="method-panel-title">{title}</h3>
        <p className="method-panel-subtitle">{subtitle}</p>
      </div>
      {action && <div className="method-panel-action">{action}</div>}
    </div>
    <div className="method-panel-body">{children}</div>
  </div>
);

export function Methodology() {
  return (
    <div className="section-container">
      {/* Hero Header */}
      <Reveal className="section-hero">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="eyebrow-accent" />
            <span className="eyebrow-text">TECHNICAL DOCUMENTATION</span>
            <span className="eyebrow-rule" />
          </div>
          <h1 className="hero-title">
            Provenance, Engine &
            <span className="hero-em"> Interpretive Limits.</span>
          </h1>
          <p className="hero-desc">
            A short guide to the dataset, state boundaries, Spark SQL processing, and the limits of these counts.
          </p>
        </div>
      </Reveal>

      {/* Data interpretation */}
      <Reveal delay={0.05} className="methodology-alert-banner">
        <div className="alert-banner-icon">
          <AlertCircle size={22} />
        </div>
        <div className="alert-banner-text">
          <strong>How to read these numbers</strong>
          <p>
            Figures represent registered cybercrime cases. They are not a count of every incident, losses in money, complaints,
            or convictions.
          </p>
        </div>
      </Reveal>

      {/* Docs Grid */}
      <div className="method-docs-grid">
        {/* Panel 1 */}
        <MethodologyPanel
          index="§ 14"
          icon={Database}
          title="Case Statistics Provenance"
          subtitle="Statewise case counts · 2020–2024"
        >
          <dl className="editorial-spec-list">
            <dt>Primary Source</dt>
            <dd>
              The bundled statewise cybercrime dataset covering calendar years 2020 through 2024.
            </dd>

            <dt>Coverage</dt>
            <dd>
              28 states and 8 union territories, with yearly case counts for 2020–2024.
            </dd>

            <dt>What Figures Represent</dt>
            <dd>
              <div className="spec-check-item positive-check">
                <CheckCircle2 size={14} />
                <span>Counts of registered cybercrime cases by jurisdiction and year.</span>
              </div>
            </dd>

            <dt>What Figures Do NOT Represent</dt>
            <dd>
              <div className="spec-check-item negative-check">
                <AlertCircle size={14} />
                <span>Unreported incidents, financial losses, or population-adjusted rates.</span>
              </div>
            </dd>
          </dl>
        </MethodologyPanel>

        {/* Panel 2 */}
        <MethodologyPanel
          index="§ 15"
          icon={MapPin}
          title="Cartographic & Geospatial Standards"
          subtitle="Bundled India state and union territory boundaries"
          action={
            <span className="panel-stat-pill">
              <MapPin size={13} />
              <span>WGS84 / CRS84</span>
            </span>
          }
        >
          <dl className="editorial-spec-list">
            <dt>Boundary Dataset</dt>
            <dd>
              The boundary layer covers all 36 jurisdictions, including Goa and the island territories.
            </dd>

            <dt>Attribution & Licence</dt>
            <dd>
              The map uses the bundled geoBoundaries data under its Creative Commons Attribution 2.5 India licence.
            </dd>

            <dt>Projection & Verification</dt>
            <dd>
              WGS84 coordinates are projected with d3-geo and displayed as separate jurisdiction shapes in the 3D map.
            </dd>
          </dl>
        </MethodologyPanel>

        {/* Panel 3 */}
        <MethodologyPanel
          index="§ 16"
          icon={Cpu}
          title="Compute Engine & Spark SQL Processing"
          subtitle="Backend calculations and dashboard API"
          action={
            <span className="panel-stat-pill">
              <Cpu size={13} />
              <span>SPARK SQL 3.5 + FASTAPI</span>
            </span>
          }
        >
          <dl className="editorial-spec-list">
            <dt>Query Execution</dt>
            <dd>
              Aggregations, rankings, category totals, and yearly matrices are calculated with
              <strong> Apache Spark SQL</strong> in the backend.
            </dd>

            <dt>API Endpoints</dt>
            <dd>
              FastAPI endpoints provide:
              <ul className="api-endpoint-list">
                <li><code>GET /api/overview?year={'{y}'}</code> — National aggregates & jurisdiction counts</li>
                <li><code>GET /api/states?year={'{y}'}</code> — Statewise case counts and administrative types</li>
                <li><code>GET /api/trends</code> — Five-year all-India historical registration trajectory</li>
                <li><code>GET /api/state/{'{name}'}</code> — Deep 2020–2024 historical dossier for specific jurisdiction</li>
                <li><code>GET /api/years</code> — Available reporting calendar periods</li>
              </ul>
            </dd>

            <dt>Deterministic Caching</dt>
            <dd>
              Client-side LRU memory caching ensures rapid state switching and camera transitions without duplicate network fetches.
            </dd>
          </dl>
        </MethodologyPanel>

        {/* Panel 4 */}
        <MethodologyPanel
          index="§ 17"
          icon={Scale}
          title="Dataset Notes"
          subtitle="Baseline case counts and custom uploads are kept separate"
          action={
            <span className="panel-stat-pill">
              <Scale size={13} />
              <span>DATA SCOPE</span>
            </span>
          }
        >
          <dl className="editorial-spec-list">
            <dt>Dashboard data</dt>
            <dd>
              Statewise case counts drive the overview, map, dossier, and national analytics.
            </dd>

            <dt>Other indicators</dt>
            <dd>
              Other bundled indicators are not included in statewise totals or map calculations.
            </dd>

            <dt>Dataset Studio</dt>
            <dd>
              Uploaded datasets can be explored separately and do not change the dashboard's baseline figures.
            </dd>
          </dl>
        </MethodologyPanel>
      </div>

    </div>
  );
}
