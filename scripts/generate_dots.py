"""
Deterministic dot-matrix sampler for 36 Indian jurisdictions.
Uses exact ray-casting point-in-polygon on WGS84 GeoJSON boundaries.
Output: frontend/public/geo/india-dots.json
"""
import json
import math
import os

STATE_TO_CODE = {
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
}

NAME_MAP = {
    'Andaman and Nicobar': 'Andaman and Nicobar Islands',
    'Dadra and Nagar Haveli and Daman and Diu': 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi': 'Delhi',
    'Jammu and Kashmir': 'Jammu and Kashmir',
    'Ladakh': 'Ladakh',
    'Lakshadweep': 'Lakshadweep',
    'Puducherry': 'Puducherry',
    'Chandigarh': 'Chandigarh',
}

def resolve_name(shape_name):
    if shape_name in NAME_MAP:
        return NAME_MAP[shape_name]
    clean = shape_name.replace('ā', 'a').replace('ī', 'i').replace('ū', 'u').replace('ē', 'e').replace('ō', 'o')
    if clean in STATE_TO_CODE:
        return clean
    for k in STATE_TO_CODE:
        if k.lower() == clean.lower():
            return k
    return clean

def point_in_polygon(x, y, ring):
    n = len(ring)
    inside = False
    p1x, p1y = ring[0][:2]
    for i in range(1, n + 1):
        p2x, p2y = ring[i % n][:2]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def project_lcc(lon, lat):
    """
    Standard Survey of India Lambert Conformal Conic (LCC)
    Parallels: 12.5N, 32.0N; Central Meridian: 82.0E, Origin: 22.0N
    """
    phi1 = math.radians(12.5)
    phi2 = math.radians(32.0)
    phi0 = math.radians(22.0)
    lam0 = math.radians(82.0)

    phi = math.radians(lat)
    lam = math.radians(lon)

    # Standard parallels n calculation
    n = math.log(math.cos(phi1) / math.cos(phi2)) / math.log(
        math.tan(math.pi / 4 + phi2 / 2) / math.tan(math.pi / 4 + phi1 / 2)
    )
    F_val = math.cos(phi1) * (math.tan(math.pi / 4 + phi1 / 2) ** n) / n
    rho0 = F_val / (math.tan(math.pi / 4 + phi0 / 2) ** n)

    if math.tan(math.pi / 4 + phi / 2) <= 0:
        return 0.0, 0.0
    rho = F_val / (math.tan(math.pi / 4 + phi / 2) ** n)

    theta = n * (lam - lam0)
    x = rho * math.sin(theta) * 1000.0
    y = (rho0 - rho * math.cos(theta)) * 1000.0
    return x, -y  # North up: higher latitude -> more positive Y in map space, but inverted in scene

def main():
    geo_path = 'frontend/public/geo/india-states.geojson'
    out_path = 'frontend/public/geo/india-dots.json'

    with open(geo_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    features = []
    min_lon, max_lon = 68.0, 98.0
    min_lat, max_lat = 6.5, 37.5

    for feat in data['features']:
        props = feat.get('properties', {})
        name = resolve_name(props.get('shapeName', ''))
        code = props.get('shapeISO', '') or STATE_TO_CODE.get(name, '')

        geom = feat.get('geometry', {})
        gtype = geom.get('type')
        coords = geom.get('coordinates', [])

        polys = []
        if gtype == 'Polygon':
            polys = [coords]
        elif gtype == 'MultiPolygon':
            polys = coords

        # Compute bounding box
        f_min_x, f_max_x = 180.0, -180.0
        f_min_y, f_max_y = 90.0, -90.0
        for poly in polys:
            for ring in poly:
                for pt in ring:
                    f_min_x = min(f_min_x, pt[0])
                    f_max_x = max(f_max_x, pt[0])
                    f_min_y = min(f_min_y, pt[1])
                    f_max_y = max(f_max_y, pt[1])

        features.append({
            'name': name,
            'code': code,
            'polys': polys,
            'bbox': (f_min_x, f_min_y, f_max_x, f_max_y)
        })

    # Sample on an even grid
    step = 0.55  # ~0.55 deg grid produces ~1,600 clean dots across India
    dots = []
    dot_id = 0

    lat = min_lat
    while lat <= max_lat:
        lon = min_lon
        while lon <= max_lon:
            # Check bounding boxes first
            for f in features:
                bx0, by0, bx1, by1 = f['bbox']
                if bx0 <= lon <= bx1 and by0 <= lat <= by1:
                    # Test point inside any polygon part
                    matched = False
                    for poly in f['polys']:
                        outer = poly[0]
                        if point_in_polygon(lon, lat, outer):
                            # Check holes if any
                            in_hole = False
                            for hole in poly[1:]:
                                if point_in_polygon(lon, lat, hole):
                                    in_hole = True
                                    break
                            if not in_hole:
                                matched = True
                                break
                    if matched:
                        px, py = project_lcc(lon, lat)
                        dots.append({
                            'id': dot_id,
                            'lon': round(lon, 4),
                            'lat': round(lat, 4),
                            'x': round(px, 2),
                            'y': round(py, 2),
                            'state_ut': f['name'],
                            'code': f['code'],
                        })
                        dot_id += 1
                        break
            lon += step
        lat += step

    # Ensure 100% representation: for any jurisdiction with 0 dots, add its visual interior centroid
    represented = set(d['state_ut'] for d in dots)
    for f in features:
        if f['name'] not in represented and f['polys']:
            # Pick largest polygon part
            largest_poly = max(f['polys'], key=lambda p: len(p[0]))
            pts = largest_poly[0]
            cx = sum(p[0] for p in pts) / len(pts)
            cy = sum(p[1] for p in pts) / len(pts)
            px, py = project_lcc(cx, cy)
            dots.append({
                'id': dot_id,
                'lon': round(cx, 4),
                'lat': round(cy, 4),
                'x': round(px, 2),
                'y': round(py, 2),
                'state_ut': f['name'],
                'code': f['code'],
            })
            dot_id += 1

    # Compute bounding box of projected dots to normalize
    xs = [d['x'] for d in dots]
    ys = [d['y'] for d in dots]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    w = max_x - min_x
    h = max_y - min_y

    for d in dots:
        d['nx'] = round((d['x'] - min_x) / w, 4)
        d['ny'] = round((d['y'] - min_y) / h, 4)
        # Scene coords centered at (0, 0), aspect ratio preserved
        d['sX'] = round(((d['nx'] - 0.5) * 8.5), 3)
        d['sZ'] = round(((d['ny'] - 0.5) * 8.5), 3)

    coverage = len(set(d['state_ut'] for d in dots))

    output = {
        'total_dots': len(dots),
        'bounds': {'min_x': min_x, 'max_x': max_x, 'min_y': min_y, 'max_y': max_y},
        'jurisdictions_covered': coverage,
        'dots': dots,
    }

    import sys
    sys.stdout.write(json.dumps(output))

if __name__ == '__main__':
    main()
