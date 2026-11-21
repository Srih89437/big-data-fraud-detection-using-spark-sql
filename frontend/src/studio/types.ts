export interface CustomDatasetMeta {
  id: string;
  name: string;
  filename: string;
  size_bytes: number;
  size_formatted: string;
  row_count: number;
  column_count: number;
  columns: string[];
  modified_at: number;
  is_demo: boolean;
}

export interface ColumnProfile {
  name: string;
  inferred_type: 'numeric' | 'categorical' | 'datetime' | 'text';
  semantic_type: 'general' | 'india_state_ut' | 'country' | 'currency' | 'percentage' | 'timestamp';
  total_count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  cardinality_ratio: number;
  sample_values: any[];
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
}

export interface Recommendation {
  type: 'bar_matrix_3d' | 'scatter_3d' | 'bubble_3d' | 'surface_3d' | 'time_series_3d' | 'geo_map_3d';
  title: string;
  reason: string;
  confidence: number;
  mappings: {
    x?: string;
    y?: string;
    z?: string;
    height?: string;
    color?: string;
    size?: string;
    time?: string;
    geo?: string;
  };
}

export interface DatasetProfile {
  dataset_id: string;
  filename: string;
  row_count: number;
  column_count: number;
  columns: ColumnProfile[];
  recommendations: Recommendation[];
}

export interface PreviewData {
  columns: string[];
  rows: Record<string, any>[];
  total_rows: number;
  filtered_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface QueryPoint {
  x_label: string;
  z_label?: string;
  y_val: number;
  color_val?: number | string;
  size_val?: number;
  count?: number;
  [key: string]: any;
}

export interface QueryResult {
  points: QueryPoint[];
  meta: {
    total_sampled: number;
    agg_func: string;
    x_col?: string;
    y_col?: string;
    z_col?: string;
    color_col?: string;
    size_col?: string;
    min_val?: number;
    max_val?: number;
  };
}

export type VizType =
  | 'bar_matrix_3d'
  | 'scatter_3d'
  | 'bubble_3d'
  | 'surface_3d'
  | 'time_series_3d'
  | 'geo_map_3d';
