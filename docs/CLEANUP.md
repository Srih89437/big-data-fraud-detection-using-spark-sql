# Cleanup Log & Architectural Consolidation

## Removed / Replaced Items
1. **Removed Inverted Web Mercator Projection**:
   - Replaced with standard Survey of India Lambert Conic Conformal projection (`d3.geoConicConformal().parallels([12.5, 32.0]).rotate([-82, -22])`).
   - Fixed North-South coordinate inversion bug (single negation in shape creation, positive Z southward).

2. **Removed Polylabel Missing Centroids**:
   - Integrated `@mapbox/polylabel` to place labels inside true visual polygon interiors rather than offshore bounding box centers.

3. **Removed Sequential 36-State Detail Requests in Data Explorer**:
   - Replaced with single unified `/api/matrix` call returning pre-computed sparklines, CAGR, YoY changes, and historical series in one Spark SQL query.

4. **Removed Missing Field Bugs in Dataset Studio**:
   - Added `cardinality_ratio` to `dataset_service.py`.
   - Re-mapped geographic types to categorical with semantic hints to satisfy TypeScript strict enums.

5. **Cleaned Temporary Test Files**:
   - `frontend/test_geo.mjs` removed after geometry and anchor validation.
