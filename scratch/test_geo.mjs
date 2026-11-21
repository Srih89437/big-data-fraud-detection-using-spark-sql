import fs from 'fs';
import * as d3 from 'd3-geo';
import polylabel from 'polylabel';

const geo = JSON.parse(fs.readFileSync('frontend/public/geo/india-states.geojson', 'utf8'));

// Conic Conformal projection standard for India
const proj = d3.geoConicConformal()
  .parallels([12.5, 32.0])
  .rotate([-82, -22])
  .scale(1000)
  .translate([0, 0]);

console.log('Feature count:', geo.features.length);

let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

for (const f of geo.features) {
  const name = f.properties.shapeName || f.properties.ST_NM;
  const geom = f.geometry;
  const coords = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const poly of coords) {
    for (const ring of poly) {
      for (const [lon, lat] of ring) {
        const [x, y] = proj([lon, lat]);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
}

console.log(`Projected bounds: X=[${minX.toFixed(2)}, ${maxX.toFixed(2)}], Y=[${minY.toFixed(2)}, ${maxY.toFixed(2)}]`);

// Check Tamil Nadu vs Jammu & Kashmir or Ladakh
const tn = geo.features.find(f => (f.properties.shapeName || '').includes('Tamil') || (f.properties.ST_NM || '').includes('Tamil'));
const jk = geo.features.find(f => (f.properties.shapeName || '').includes('Jammu') || (f.properties.ST_NM || '').includes('Jammu') || (f.properties.shapeName || '').includes('Ladakh'));

function getCentroid(feature) {
  const geom = feature.geometry;
  const coords = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  // largest ring
  let largestRing = null;
  let maxPts = 0;
  for (const poly of coords) {
    if (poly[0].length > maxPts) {
      maxPts = poly[0].length;
      largestRing = poly[0].map(([lon, lat]) => proj([lon, lat]));
    }
  }
  const label = polylabel([largestRing], 1.0);
  return label;
}

if (tn) console.log('Tamil Nadu polylabel:', getCentroid(tn));
if (jk) console.log('Jammu & Kashmir / Ladakh polylabel:', getCentroid(jk));
