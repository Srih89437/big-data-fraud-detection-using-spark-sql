import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { PreviewData } from './types';

interface DataPreviewTableProps {
  datasetId: string;
}

export function DataPreviewTable({ datasetId }: DataPreviewTableProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      sort_dir: sortDir,
    });
    if (search.trim()) params.append('search', search.trim());
    if (sortBy) params.append('sort_by', sortBy);

    fetch(`http://127.0.0.1:8000/api/custom-datasets/${datasetId}/preview?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Preview fetch failed');
        return res.json();
      })
      .then((json: PreviewData) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [datasetId, page, pageSize, search, sortBy, sortDir]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div className="preview-table-container">
      {/* Top Search & Stats Bar */}
      <div className="preview-toolbar">
        <div className="preview-search-wrap">
          <Search size={14} className="preview-search-icon" />
          <input
            type="text"
            className="preview-search-input"
            placeholder="Search records across all attributes…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="preview-meta-stats">
          <span>
            Total Rows: <strong>{data?.total_rows.toLocaleString() ?? '…'}</strong>
          </span>
          {data && data.filtered_rows !== data.total_rows && (
            <span className="filtered-pill">
              Filtered: <strong>{data.filtered_rows.toLocaleString()}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Table Grid */}
      <div className="preview-table-scroll">
        <table className="dataset-data-table">
          <thead>
            <tr>
              <th className="row-num-th">#</th>
              {data?.columns.map((col) => {
                const isSorted = sortBy === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`sortable-th ${isSorted ? 'active-sort' : ''}`}
                    title={`Sort by ${col}`}
                  >
                    <div className="th-content">
                      <span>{col}</span>
                      {isSorted ? (
                        sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={11} className="dim-sort-icon" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={(data?.columns.length ?? 0) + 1} className="preview-table-loading">
                  Loading preview data…
                </td>
              </tr>
            ) : data?.rows.length === 0 ? (
              <tr>
                <td colSpan={(data?.columns.length ?? 0) + 1} className="preview-table-empty">
                  No records match your search criteria.
                </td>
              </tr>
            ) : (
              data?.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  <td className="row-num-td">{(page - 1) * pageSize + rIdx + 1}</td>
                  {data.columns.map((col) => {
                    const val = row[col];
                    const isNull = val === null || val === undefined || val === '';
                    return (
                      <td key={col} className={isNull ? 'null-cell' : ''}>
                        {isNull ? <span className="null-tag">NULL</span> : String(val)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="preview-pagination-bar">
        <span className="pagination-info">
          Page <strong>{page}</strong> of <strong>{data?.total_pages ?? 1}</strong>
        </span>

        <div className="pagination-buttons">
          <button
            className="pagination-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>
          <button
            className="pagination-btn"
            disabled={page >= (data?.total_pages ?? 1) || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
