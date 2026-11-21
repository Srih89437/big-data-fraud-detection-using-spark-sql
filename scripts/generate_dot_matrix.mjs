// Deterministic dot-matrix sampler for all 36 Indian jurisdictions.
// Samples dots on an even grid across India's bounding box and checks containment
// using d3.geoContains against each feature in india-states.geojson.
// Output: frontend/public/geo/india-dots.json

import fs from 'node:fs';
import path from 'node:path';
import * as d3 from 'd3-geo';

const geoPath = path.resolve('frontend/public/geo/india-states.geojson');
const outPath = path.resolve('frontend/public/geo/india-dots.json');

const geojson = JSON.parse(fs.readFileSync(geoPath, 'utf8'));

// Standard Lambert Conic Conformal projection matching geo.ts
const indiaProjection = d3
  .geoConicConformal()
  .parallels([12.5, 32.0])
  .rotate([-82, -22])
  .scale(1000)
  .translate([0, 0]);

const STATE_TO_CODE = {
  'Andhra Pradesh': 'IN-AP',
  'Arunachal Pradesh': 'IN-AR',
  'Assam': 'IN-AS',
  'Bihar': 'IN-BR',
  'Chhattisgarh': 'IN-CT',
  'Goa': 'IN-GA',
  'Gujarat': 'IN-GJ',
  'Haryana': 'IN-HR',
  'Himachal Pradesh': 'IN-HP',
  'Jharkhand': 'IN-JH',
  'Karnataka': 'IN-KA',
  'Kerala': 'IN-KL',
  'Madhya Pradesh': 'IN-MP',
  'Maharashtra': 'IN-MH',
  'Manipur': 'IN-MN',
  'Meghalaya': 'IN-ML',
  'Mizoram': 'IN-MZ',
  'Nagaland': 'IN-NL',
  'Odisha': 'IN-OR',
  'Punjab': 'IN-PB',
  'Rajasthan': 'IN-RJ',
  'Sikkim': 'IN-SK',
  'Tamil Nadu': 'IN-TN',
  'Telangana': 'IN-TG',
  'Tripura': 'IN-TR',
  'Uttar Pradesh': 'IN-UP',
  'Uttarakhand': 'IN-UT',
  'West Bengal': 'IN-WB',
  'Andaman and Nicobar Islands': 'IN-AN',
  'Chandigarh': 'IN-CH',
  'Dadra and Nagar Haveli and Daman and Diu': 'IN-DH',
  'Delhi': 'IN-DL',
  'Jammu and Kashmir': 'IN-JK',
  'Ladakh': 'IN-LA',
  'Lakshadweep': 'IN-LD',
  'Puducherry': 'IN-PY',
};

// Map diacritic/variant names from GeoJSON to canonical names
const NAME_MAP = {
  'Andaman and Nicobar': 'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi': 'Delhi',
  'Jammu and Kashmir': 'Jammu and Kashmir',
  'Ladakh': 'Ladakh',
  'Lakshadweep': 'Lakshadweep',
  'Puducherry': 'Puducherry',
  'Chandigarh': 'Chandigarh',
};

function resolveCanonicalName(shapeName) {
  if (NAME_MAP[shapeName]) return NAME_MAP[shapeName];
  // Strip diacritics
  const clean = shapeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (STATE_TO_CODE[clean]) return clean;
  for (const k of Object.keys(STATE_TO_CODE)) {
    if (k.toLowerCase() === clean.toLowerCase()) return k;
  }
  return clean;
}

console.log('Sampling dot matrix across 36 jurisdictions...');

// Compute overall bounding box in projected space
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const feat of geojson.features) {
  const bounds = d3.geoPath().projection(indiaProjection).bounds(feat);
  if (bounds) {
    minX = Math.min(minX, bounds[0][0]);
    minY = Math.min(minY, bounds[0][1]);
    maxX = Math.max(maxX, bounds[1][0]);
    maxY = Math.max(maxY, bounds[1][1]);
  }
}

console.log(`Projected bounds: X [${minX.toFixed(1)}, ${maxX.toFixed(1)}], Y [${minY.toFixed(1)}, ${maxY.toFixed(1)}]`);

// Grid resolution in projected coordinates
const step = 20; // 20 units gives ~1,500 - 2,000 dots across India
const dots = [];

// Prepare prepared features for faster testing
const features = geojson.features.map(f => {
  const cName = resolveCanonicalName(f.properties.shapeName);
  const code = f.properties.shapeISO || STATE_TO_CODE[cName] || '';
  return {
    feature: f,
    name: cName,
    code,
    bounds: d3.geoPath().projection(indiaProjection).bounds(f),
  };
});

let dotId = 0;
for (let y = minY; y <= maxY; y += step) {
  for (let x = minX; x <= maxX; x += step) {
    const invert = indiaProjection.invert([x, y]);
    if (!invert) continue;
    const [lon, lat] = invert;

    // Check which feature contains this point
    for (const f of features) {
      if (
        x >= f.bounds[0][0] &&
        x <= f.bounds[1][0] &&
        y >= f.bounds[0][1] &&
        y <= f.bounds[1][1]
      ) {
        if (d3.geoContains(f.feature, [lon, lat])) {
          // Normalize to [0..1] range and [-5..5] scene space
          const nx = (x - minX) / (maxX - minX);
          const ny = (y - minY) / (maxY - minY);
          // Scene 3D coordinates (centered at origin, scale 5)
          const sX = (nx - 0.5) * 10;
          const sZ = (ny - 0.5) * 10;

          dots.push({
            id: dotId++,
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            nx: Math.round(nx * 1000) / 1000,
            ny: Math.round(ny * 1000) / 1000,
            sX: Math.round(sX * 100) / 100,
            sZ: Math.round(sZ * 100) / 100,
            lon: Math.round(lon * 1000) / 1000,
            lat: Math.round(lat * 1000) / 1000,
            state_ut: f.name,
            code: f.code,
          });
          break; // Point belongs to one jurisdiction
        }
      }
    }
  }
}

console.log(`Generated ${dots.length} dots covering India.`);

// Count dots per state
const countByState = {};
for (const d of dots) {
  countByState[d.state_ut] = (countByState[d.state_ut] || 0) + 1;
}

const stateCount = Object.keys(countByState).length;
console.log(`Jurisdictions with dots: ${stateCount}/36`);

const payload = {
  total_dots: dots.length,
  step,
  bounds: { minX, minY, maxX, maxY },
  jurisdictions_covered: stateCount,
  dots,
};

fs.writeFileSync(outPath, JSON.stringify(payload));
console.log(`Saved dot matrix to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
