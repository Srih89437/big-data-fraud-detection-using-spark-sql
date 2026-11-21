import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  Table,
  Box,
  Layers,
  Sliders,
  ChevronRight,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Activity,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type {
  CustomDatasetMeta,
  DatasetProfile,
  QueryResult,
  VizType,
  Recommendation,
} from './types';
import { BarMatrix3D } from './visualizers/BarMatrix3D';
import { ScatterPlot3D } from './visualizers/ScatterPlot3D';
import { BubbleCluster3D } from './visualizers/BubbleCluster3D';
import { SurfaceTerrain3D } from './visualizers/SurfaceTerrain3D';
import { TimeProgression3D } from './visualizers/TimeProgression3D';
import { GeoPrism3D } from './visualizers/GeoPrism3D';
import { DataPreviewTable } from './DataPreviewTable';
import { DatasetProfiler } from './DatasetProfiler';
import { API_BASE } from '../lib/api';

interface DatasetStudioProps {
  dark?: boolean;
}

export function DatasetStudio({ dark = true }: DatasetStudioProps) {
  const [datasets, setDatasets] = useState<CustomDatasetMeta[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [activeTab, setActiveTab] = useState<'viz' | 'preview' | 'profile'>('viz');

  // Active dataset profile
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Visualization state
  const [vizType, setVizType] = useState<VizType>('bar_matrix_3d');
  const [xCol, setXCol] = useState<string>('');
  const [yCol, setYCol] = useState<string>('');
  const [zCol, setZCol] = useState<string>('');
  const [colorCol, setColorCol] = useState<string>('');
  const [sizeCol, setSizeCol] = useState<string>('');
  const [aggFunc, setAggFunc] = useState<string>('sum');
  const [heightScale, setHeightScale] = useState<number>(1.2);

  // Dynamic Query Result
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen container
  const [isFullscreen, setIsFullscreen] = useState(false);
  const studioContainerRef = useRef<HTMLDivElement>(null);

  const fetchDatasets = useCallback(() => {
    setLoadingDatasets(true);
    fetch(`${API_BASE}/api/custom-datasets`)
      .then((res) => res.json())
      .then((json) => {
        const list: CustomDatasetMeta[] = json.datasets || [];
        setDatasets(list);
        setLoadingDatasets(false);
        if (list.length > 0 && !activeDatasetId) {
          // Default to India State Cyber Infrastructure or first available
          const preferred =
            list.find((d) => d.id === 'india_state_cyber_infrastructure.csv') || list[0];
          setActiveDatasetId(preferred.id);
        }
      })
      .catch(() => {
        setLoadingDatasets(false);
      });
  }, [activeDatasetId]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  // Load Profile when activeDatasetId changes
  useEffect(() => {
    if (!activeDatasetId) return;
    setLoadingProfile(true);
    fetch(`${API_BASE}/api/custom-datasets/${activeDatasetId}/profile`)
      .then((res) => {
        if (!res.ok) throw new Error('Profile fetch failed');
        return res.json();
      })
      .then((data: DatasetProfile) => {
        setProfile(data);
        setLoadingProfile(false);

        // Deterministically map schema dimensions based on column types
        if (data.columns && data.columns.length > 0) {
          const numCols = data.columns.filter((c) => c.inferred_type === 'numeric');
          const catCols = data.columns.filter((c) => c.inferred_type === 'categorical');
          const geoCols = data.columns.filter((c) => c.semantic_type === 'india_state_ut');
          if (geoCols.length > 0 && numCols.length > 0) {
            setVizType('geo_map_3d');
            setXCol(geoCols[0].name);
            setYCol(numCols[0].name);
          } else {
            setVizType('bar_matrix_3d');
            setXCol(catCols[0]?.name || data.columns[0].name);
            setYCol(numCols[0]?.name || data.columns[0].name);
            setZCol(numCols[1]?.name || '');
          }
        }
      })
      .catch(() => {
        setLoadingProfile(false);
      });
  }, [activeDatasetId]);

  // Run dynamic analytical query whenever mappings change
  useEffect(() => {
    if (!activeDatasetId || !yCol) return;
    setQueryLoading(true);

    fetch(`${API_BASE}/api/custom-datasets/${activeDatasetId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_col: xCol || undefined,
        y_col: yCol,
        z_col: zCol || undefined,
        color_col: colorCol || undefined,
        size_col: sizeCol || undefined,
        agg_func: aggFunc,
        limit: 300,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Query failed');
        return res.json();
      })
      .then((data: QueryResult) => {
        setQueryResult(data);
        setQueryLoading(false);
      })
      .catch(() => {
        setQueryLoading(false);
      });
  }, [activeDatasetId, xCol, yCol, zCol, colorCol, sizeCol, aggFunc]);

  // Handle File Upload
  const handleFileUpload = (file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${API_BASE}/api/custom-datasets/upload`, {
      method: 'POST',
      body: formData,
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => Promise.reject(err));
        return res.json();
      })
      .then((data) => {
        setUploading(false);
        setUploadSuccess(`Ingested "${file.name}" successfully (${data.row_count} rows).`);
        fetchDatasets();
        setActiveDatasetId(data.dataset_id);
      })
      .catch((err) => {
        setUploading(false);
        setUploadError(err.detail || 'File ingestion failed. Check CSV/JSON format.');
      });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Remove dataset "${id}" from workspace?`)) return;

    fetch(`${API_BASE}/api/custom-datasets/${id}`, {
      method: 'DELETE',
    })
      .then((res) => res.json())
      .then(() => {
        fetchDatasets();
        if (activeDatasetId === id) {
          setActiveDatasetId(null);
          setProfile(null);
          setQueryResult(null);
        }
      })
      .catch(() => {});
  };

  const toggleFullscreen = () => {
    if (!studioContainerRef.current) return;
    if (!document.fullscreenElement) {
      studioContainerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);
  const numericColumns = profile?.columns.filter((c) => c.inferred_type === 'numeric') || [];
  const allColumns = profile?.columns || [];

  return (
    <div
      ref={studioContainerRef}
      className={`dataset-studio-root ${isFullscreen ? 'studio-fullscreen' : ''}`}
    >
      {/* Studio Top Control Header */}
      <div className="studio-topbar">
        <div className="studio-identity">
          <div className="studio-icon-pill">
            <Database size={15} />
          </div>
          <div>
            <div className="studio-title-row">
              <h2 className="studio-title">Dataset Studio</h2>
              <span className="studio-version-tag">ENTERPRISE INGESTION</span>
            </div>
            <p className="studio-tagline">
              Custom Big Data Ingestion · Schema Profiling · Autonomous 3D Analytical Visualizers
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="studio-view-tabs">
          <button
            className={`studio-tab-btn ${activeTab === 'viz' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('viz')}
          >
            <Box size={13} />
            <span>3D Visualizer</span>
          </button>
          <button
            className={`studio-tab-btn ${activeTab === 'preview' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Table size={13} />
            <span>Data Preview</span>
          </button>
          <button
            className={`studio-tab-btn ${activeTab === 'profile' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <Activity size={13} />
            <span>Schema Profiler</span>
          </button>

          <button
            className="studio-fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Main Studio Body: Left Sidebar + Center Workspace */}
      <div className="studio-body">
        {/* Left Pane: Dataset Library & Dropzone */}
        <div className="studio-sidebar">
          {/* Upload Dropzone */}
          <div
            className={`studio-dropzone ${uploading ? 'uploading' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.json,.jsonl"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <UploadCloud size={20} className="dropzone-icon" />
            <div className="dropzone-text">
              <strong>Upload Custom Telemetry</strong>
              <span>CSV, TSV, JSON, JSONL</span>
            </div>
            {uploading && <div className="dropzone-loader">Ingesting…</div>}
          </div>

          {uploadError && (
            <div className="studio-msg-badge error-msg">
              <AlertCircle size={12} />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="studio-msg-badge success-msg">
              <CheckCircle2 size={12} />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Dataset Library Header */}
          <div className="sidebar-section-header">
            <FileSpreadsheet size={13} />
            <span>INGESTED REPOSITORIES ({datasets.length})</span>
            <button className="icon-refresh-btn" onClick={fetchDatasets} title="Refresh dataset list">
              <RefreshCw size={11} className={loadingDatasets ? 'spin' : ''} />
            </button>
          </div>

          {/* Dataset List */}
          <div className="studio-dataset-list">
            {datasets.map((d) => {
              const active = d.id === activeDatasetId;
              return (
                <div
                  key={d.id}
                  className={`dataset-list-item ${active ? 'active-item' : ''}`}
                  onClick={() => setActiveDatasetId(d.id)}
                >
                  <div className="dataset-item-info">
                    <strong className="dataset-name-label">{d.name}</strong>
                    <div className="dataset-meta-row">
                      <span>{d.row_count.toLocaleString()} rows</span>
                      <span>·</span>
                      <span>{d.column_count} cols</span>
                      <span>·</span>
                      <span>{d.size_formatted}</span>
                    </div>
                  </div>

                  <div className="dataset-item-badges">
                    {d.is_demo ? (
                      <span className="demo-badge">REF</span>
                    ) : (
                      <button
                        className="delete-dataset-btn"
                        onClick={(e) => handleDelete(d.id, e)}
                        title="Delete custom dataset"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <ChevronRight size={13} className="item-arrow" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Workspace Area */}
        <div className="studio-workspace">
          {activeTab === 'viz' && (
            <div className="studio-viz-layout">
              {/* 3D Visualizer Canvas */}
              <div className="studio-canvas-container">
                {queryLoading && (
                  <div className="studio-viz-overlay-loading">
                    <div className="map-loader-spinner" />
                    <span>Aggregating 3D coordinate matrices…</span>
                  </div>
                )}

                {queryResult && (queryResult.points?.length > 0 || (queryResult as any).records?.length > 0) ? (
                  <>
                    {vizType === 'bar_matrix_3d' && (
                      <BarMatrix3D data={queryResult} heightScale={heightScale} dark={dark} />
                    )}
                    {vizType === 'scatter_3d' && (
                      <ScatterPlot3D data={queryResult} dark={dark} />
                    )}
                    {vizType === 'bubble_3d' && (
                      <BubbleCluster3D data={queryResult} dark={dark} />
                    )}
                    {vizType === 'surface_3d' && (
                      <SurfaceTerrain3D data={queryResult} heightScale={heightScale} dark={dark} />
                    )}
                    {vizType === 'time_series_3d' && (
                      <TimeProgression3D data={queryResult} dark={dark} />
                    )}
                    {vizType === 'geo_map_3d' && (
                      <GeoPrism3D data={queryResult} dark={dark} />
                    )}
                  </>
                ) : (
                  <div className="studio-empty-viz">
                    <Activity size={32} />
                    <h4>Select dimensions in the inspector to render 3D analytics</h4>
                  </div>
                )}
              </div>

              {/* Right Variable Mapping Inspector */}
              <div className="studio-inspector">
                <div className="inspector-header">
                  <Sliders size={13} />
                  <span>3D VARIABLE MAPPING</span>
                </div>

                {/* 3D Visualization Type Selector */}
                <div className="inspector-group">
                  <label className="inspector-label">VISUALIZATION ENGINE</label>
                  <div className="viz-type-grid">
                    {[
                      { id: 'bar_matrix_3d', label: 'Bar Matrix 3D' },
                      { id: 'scatter_3d', label: 'Scatter Cloud' },
                      { id: 'bubble_3d', label: 'Bubble 3D' },
                      { id: 'surface_3d', label: 'Surface 3D' },
                      { id: 'time_series_3d', label: '4D Temporal' },
                      { id: 'geo_map_3d', label: 'India Map 3D' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        className={`viz-type-btn ${vizType === m.id ? 'active' : ''}`}
                        onClick={() => setVizType(m.id as VizType)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coordinate Selectors */}
                <div className="inspector-group">
                  <label className="inspector-label">X-AXIS (CATEGORY / IDENTIFIER)</label>
                  <select
                    className="inspector-select"
                    value={xCol}
                    onChange={(e) => setXCol(e.target.value)}
                  >
                    <option value="">None / Serpentine Index</option>
                    {allColumns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.inferred_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="inspector-group">
                  <label className="inspector-label">Y-AXIS / HEIGHT ELEVATION (METRIC)</label>
                  <select
                    className="inspector-select"
                    value={yCol}
                    onChange={(e) => setYCol(e.target.value)}
                  >
                    {numericColumns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} (NUMERIC)
                      </option>
                    ))}
                  </select>
                </div>

                {(vizType === 'scatter_3d' || vizType === 'bubble_3d' || vizType === 'surface_3d') && (
                  <div className="inspector-group">
                    <label className="inspector-label">Z-AXIS / DEPTH (CONTINUOUS)</label>
                    <select
                      className="inspector-select"
                      value={zCol}
                      onChange={(e) => setZCol(e.target.value)}
                    >
                      <option value="">Auto Coordinate</option>
                      {numericColumns.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} (NUMERIC)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {vizType === 'bubble_3d' && (
                  <div className="inspector-group">
                    <label className="inspector-label">BUBBLE SIZE DIMENSION</label>
                    <select
                      className="inspector-select"
                      value={sizeCol}
                      onChange={(e) => setSizeCol(e.target.value)}
                    >
                      <option value="">Default Uniform Size</option>
                      {numericColumns.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} (NUMERIC)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="inspector-group">
                  <label className="inspector-label">AGGREGATION OPERATOR</label>
                  <div className="agg-btn-group">
                    {['sum', 'avg', 'count', 'max', 'min'].map((op) => (
                      <button
                        key={op}
                        className={`agg-btn ${aggFunc === op ? 'active' : ''}`}
                        onClick={() => setAggFunc(op)}
                      >
                        {op.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="inspector-group">
                  <div className="inspector-slider-header">
                    <label className="inspector-label">ELEVATION SCALE</label>
                    <span className="slider-val">{heightScale.toFixed(1)}×</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="3.0"
                    step="0.1"
                    value={heightScale}
                    onChange={(e) => setHeightScale(parseFloat(e.target.value))}
                    className="inspector-range"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && activeDatasetId && (
            <DataPreviewTable datasetId={activeDatasetId} />
          )}

          {activeTab === 'profile' && profile && (
            <DatasetProfiler profile={profile} />
          )}
        </div>
      </div>
    </div>
  );
}
