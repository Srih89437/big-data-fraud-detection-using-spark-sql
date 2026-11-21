// Methodology: Official Technical Documentation & Provenance Standards.
// Details exact administrative data sources, Survey of India / DataMeet cartographic provenance,
// statistical definitions, compute engine architecture, and strict limitations.

import { ShieldCheck, Database, MapPin, AlertCircle, Cpu, ExternalLink, Scale, CheckCircle2, BookOpen } from 'lucide-react';
import { Reveal } from './ui';
import { motion } from 'framer-motion';

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
  <motion.div
    className="method-doc-panel"
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
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
  </motion.div>
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
            A comprehensive specification of data origin, geographic boundary standards,
            distributed Apache Spark query processing, and explicit statistical interpretation boundaries.
          </p>
        </div>
      </Reveal>

      {/* Critical Statistical Notice Banner */}
      <Reveal delay={0.05} className="methodology-alert-banner">
        <div className="alert-banner-icon">
          <AlertCircle size={22} />
        </div>
        <div className="alert-banner-text">
          <strong>Mandatory Statistical Interpretation Notice</strong>
          <p>
            Figures presented across this platform represent <em>police-registered First Information Reports (FIRs)</em> under the
            Information Technology Act and Indian Penal Code sections. They <strong>do not</strong> represent total cybercrime occurrences,
            financial fraud volumes, monetary amounts defrauded, victim complaint portal tickets, or judicial conviction rates.
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
          subtitle="National Crime Records Bureau (NCRB) Statewise Dataset"
          action={
            <a
              href="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2287039&lang=1&reg=3"
              target="_blank"
              rel="noreferrer"
              className="method-source-link"
            >
              <span>PIB Gazette 2287039</span>
              <ExternalLink size={12} />
            </a>
          }
        >
          <dl className="editorial-spec-list">
            <dt>Official Source</dt>
            <dd>
              National Crime Records Bureau (NCRB), <em>Crime in India</em> annual publications;
              tabled by the Ministry of Home Affairs via Press Information Bureau (PIB Release ID: 2287039), 21 July 2026.
            </dd>

            <dt>Underlying Dataset</dt>
            <dd>
              <code>data/statewise_cyber_crimes_2020_2024.csv</code> — Official longitudinal series recording registered
              cases across all 28 states and 8 Union Territories (36 administrative jurisdictions) for calendar years 2020 through 2024.
            </dd>

            <dt>Coverage Standard</dt>
            <dd>
              100% jurisdictional coverage of India's administrative boundaries. Every state and Union Territory maintains
              continuous yearly entries.
            </dd>

            <dt>What Figures Represent</dt>
            <dd>
              <div className="spec-check-item positive-check">
                <CheckCircle2 size={14} />
                <span>Counts of police-registered criminal cases (FIRs) under cybercrime crime-heads.</span>
              </div>
            </dd>

            <dt>What Figures Do NOT Represent</dt>
            <dd>
              <div className="spec-check-item negative-check">
                <AlertCircle size={14} />
                <span>Unreported incidents, Citizen Financial Cyber Fraud Reporting System (1930) distress calls, bank dispute chargebacks, or population-adjusted crime rates.</span>
              </div>
            </dd>
          </dl>
        </MethodologyPanel>

        {/* Panel 2 */}
        <MethodologyPanel
          index="§ 15"
          icon={MapPin}
          title="Cartographic & Geospatial Standards"
          subtitle="Survey of India and DataMeet verified administrative boundaries"
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
              <code>frontend/public/geo/india-states.geojson</code> — Level-1 administrative divisions (ADM1) covering
              all 36 jurisdictions. Island territories are preserved with complete multi-part fidelity
              (Andaman & Nicobar Islands: 187 polygon parts; Lakshadweep: 22 parts; Puducherry: 21 parts).
            </dd>

            <dt>Attribution & Licence</dt>
            <dd>
              Derived from geoBoundaries (gbOpen IND ADM1) and the DataMeet India open-source cartographic community,
              aligned with Election Commission of India administrative boundaries.
              Licensed under <strong>Creative Commons Attribution 2.5 India (CC BY 2.5 IN)</strong>.
            </dd>

            <dt>Projection & Verification</dt>
            <dd>
              Native WGS84 coordinates projected via Spherical Mercator for WebGL 3D rendering.
              Strict verification via <code>tools/validate_boundaries.py</code> guarantees zero self-intersections,
              36/36 matched boundaries, and identical coordinate bounds. No boundary was synthesized or approximated.
            </dd>
          </dl>
        </MethodologyPanel>

        {/* Panel 3 */}
        <MethodologyPanel
          index="§ 16"
          icon={Cpu}
          title="Compute Engine & Spark SQL Processing"
          subtitle="Distributed analytics pipeline and real-time REST serving"
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
              All aggregations, rank computations, category segmentations, and multi-year time-series matrices
              are computed using <strong>Apache Spark SQL</strong> (PySpark 3.5.0) within the local warehouse.
              The web client performs zero speculative statistical derivation.
            </dd>

            <dt>API Endpoints</dt>
            <dd>
              High-throughput asynchronous FastAPI gateway exposing:
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
          title="Dataset Separation & Governance"
          subtitle="Clear delineation between official records and diagnostic prototypes"
          action={
            <span className="panel-stat-pill">
              <Scale size={13} />
              <span>DATA GOVERNANCE</span>
            </span>
          }
        >
          <dl className="editorial-spec-list">
            <dt>Official Statistics</dt>
            <dd>
              <code>data/statewise_cyber_crimes_2020_2024.csv</code> is the authoritative single source of truth
              for this observatory.
            </dd>

            <dt>Indicator Table 9A</dt>
            <dd>
              <code>data/india_cyber_crimes.csv</code> contains all-India crime indicators and is strictly isolated
              from statewise geographical calculations to eliminate aggregation mismatch.
            </dd>

            <dt>Original Streamlit Prototype</dt>
            <dd>
              The original machine-learning prototype (<code>app.py</code> and <code>src/spark_engine.py</code>)
              with demo synthetic transaction records remains preserved in the repository root for algorithmic reference
              and is not part of this public intelligence dashboard.
            </dd>
          </dl>
        </MethodologyPanel>
      </div>

      {/* Footer compliance strip */}
      <Reveal delay={0.2} className="method-compliance-strip">
        <div className="compliance-item">
          <ShieldCheck size={16} />
          <span>Official NCRB data only — no synthetic or interpolated figures</span>
        </div>
        <div className="compliance-item">
          <BookOpen size={16} />
          <span>All computations traceable to public government publications</span>
        </div>
        <div className="compliance-item">
          <Database size={16} />
          <span>Apache Spark SQL processes all aggregations server-side</span>
        </div>
      </Reveal>
    </div>
  );
}
