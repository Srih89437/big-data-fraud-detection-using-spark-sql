import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { geoConicConformal } = require('../frontend/node_modules/d3-geo');

const geojson = JSON.parse(readFileSync('frontend/public/geo/india-states.geojson', 'utf8'));

// Test setting center, parallels, and scale directly vs fitExtent
const proj = geoConicConformal()
  .parallels([12.5, 32.0])
  .rotate([-82.0, -22.0])
  .scale(800)
  .translate([0, 0]);

function getFirstCoord(geom) {
  if (geom.type === 'Polygon') return geom.coordinates[0][0];
  if (geom.type === 'MultiPolygon') return geom.coordinates[0][0][0];
  return null;
}

const testStates = [
  'Jammu and Kashmīr',
  'Ladākh',
  'Kerala',
  'Tamil Nādu',
  'Gujarāt',
  'Arunāchal Pradesh'
];

for (const f of geojson.features) {
  const name = f.properties.shapeName || f.properties.name;
  for (const ts of testStates) {
    if (name.toLowerCase() === ts.toLowerCase()) {
      const coord = getFirstCoord(f.geometry);
      const [px, py] = proj(coord);
      console.log(`State: ${name.padEnd(20)} (${f.properties.shapeISO}) -> lon/lat [${coord[0].toFixed(2)}, ${coord[1].toFixed(2)}] -> [px, py]: [${px.toFixed(2)}, ${py.toFixed(2)}]`);
      break;
    }
  }
}
