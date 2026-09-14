#!/usr/bin/env python3
"""
Generates glossy chrome 3D Bosch brand favicons:
1. favicon.svg: Vector glossy chrome Bosch Armature with specular glints, reflections and drop shadow
2. sapShell_Favicon.png: Glossy chrome ray-shaded 512x512 PNG fallback (Ultra HiDPI / Retina)
3. favicon.ico: Multi-resolution glossy chrome icon container (16x16, 32x32, 48x48, 64x64, 128x128, 256x256)
Works stand-alone in subrepos (scripts/) or at workspace root.
"""
import math
import os
import re
import struct
import zlib

script_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(script_dir, '..', 'src', 'client', 'components', 'BoschLogo.tsx')):
    repo_root = os.path.abspath(os.path.join(script_dir, '..'))
    logo_source_path = os.path.join(repo_root, 'src', 'client', 'components', 'BoschLogo.tsx')
    app_dirs = [repo_root]
else:
    repo_root = script_dir
    logo_source_path = os.path.join(repo_root, 'HPC-Dashboard', 'src', 'client', 'components', 'BoschLogo.tsx')
    app_dirs = [repo_root, os.path.join(repo_root, 'HPC-Dashboard'), os.path.join(repo_root, 'SLURM-Dashboard')]

with open(logo_source_path) as f:
    code = f.read()
paths = re.findall(r'<path d=\"([^\"]+)\"', code)
armature_p1 = paths[-2]
armature_p2 = paths[-1]

def arc_center(x1, y1, x2, y2, rx, ry, phi, fA, fS):
    dx2 = (x1 - x2) / 2.0
    dy2 = (y1 - y2) / 2.0
    cos_phi = math.cos(phi)
    sin_phi = math.sin(phi)
    x1_ = cos_phi * dx2 + sin_phi * dy2
    y1_ = -sin_phi * dx2 + cos_phi * dy2
    rx_sq = rx * rx
    ry_sq = ry * ry
    x1_sq = x1_ * x1_
    y1_sq = y1_ * y1_
    denom = rx_sq * y1_sq + ry_sq * x1_sq
    radicant = (rx_sq * ry_sq - denom) / max(1e-12, denom)
    radicant = max(0.0, radicant)
    coef = (-1 if fA == fS else 1) * math.sqrt(radicant)
    cx_ = coef * (rx * y1_) / ry
    cy_ = coef * -(ry * x1_) / rx
    cx = cos_phi * cx_ - sin_phi * cy_ + (x1 + x2) / 2.0
    cy = sin_phi * cx_ + cos_phi * cy_ + (y1 + y2) / 2.0
    return cx, cy

def vectorize_path(d_str):
    tokens = re.findall(r'([a-zA-Z])|([-+]?(?:\d*\.\d+|\d+))', d_str)
    stream = []
    for cmd, num in tokens:
        if cmd: stream.append(cmd)
        elif num: stream.append(float(num))

    subpaths = []
    curr_poly = []
    cx, cy = 0.0, 0.0
    subpath_start_x, subpath_start_y = 0.0, 0.0
    i = 0
    cmd = ''
    while i < len(stream):
        item = stream[i]
        if isinstance(item, str):
            cmd = item
            i += 1

        if cmd == 'M':
            cx, cy = stream[i], stream[i+1]
            i += 2
            if curr_poly: subpaths.append(curr_poly); curr_poly = []
            subpath_start_x, subpath_start_y = cx, cy
            curr_poly.append((cx, cy))
            cmd = 'L'
        elif cmd == 'm':
            cx, cy = cx + stream[i], cy + stream[i+1]
            i += 2
            if curr_poly: subpaths.append(curr_poly); curr_poly = []
            subpath_start_x, subpath_start_y = cx, cy
            curr_poly.append((cx, cy))
            cmd = 'l'
        elif cmd == 'L':
            cx, cy = stream[i], stream[i+1]; i += 2; curr_poly.append((cx, cy))
        elif cmd == 'l':
            cx, cy = cx + stream[i], cy + stream[i+1]; i += 2; curr_poly.append((cx, cy))
        elif cmd == 'H':
            cx = stream[i]; i += 1; curr_poly.append((cx, cy))
        elif cmd == 'h':
            cx += stream[i]; i += 1; curr_poly.append((cx, cy))
        elif cmd == 'V':
            cy = stream[i]; i += 1; curr_poly.append((cx, cy))
        elif cmd == 'v':
            cy += stream[i]; i += 1; curr_poly.append((cx, cy))
        elif cmd in ('A', 'a'):
            rx, ry = stream[i], stream[i+1]
            phi = math.radians(stream[i+2])
            fA = int(stream[i+3])
            fS = int(stream[i+4])
            if cmd == 'A': nx, ny = stream[i+5], stream[i+6]
            else: nx, ny = cx + stream[i+5], cy + stream[i+6]
            i += 7
            cen_x, cen_y = arc_center(cx, cy, nx, ny, rx, ry, phi, fA, fS)
            theta1 = math.atan2(cy - cen_y, cx - cen_x)
            theta2 = math.atan2(ny - cen_y, nx - cen_x)
            if not fS and theta2 > theta1: theta2 -= 2*math.pi
            elif fS and theta2 < theta1: theta2 += 2*math.pi
            steps = max(16, int(abs(theta2 - theta1) / (math.pi / 32)))
            for s in range(1, steps + 1):
                t = theta1 + (theta2 - theta1) * (s / steps)
                curr_poly.append((cen_x + rx * math.cos(t), cen_y + ry * math.sin(t)))
            cx, cy = nx, ny
        elif cmd in ('Z', 'z'):
            if curr_poly and curr_poly[0] != (cx, cy): curr_poly.append(curr_poly[0])
            subpaths.append(curr_poly); curr_poly = []
            cx, cy = subpath_start_x, subpath_start_y
        else: i += 1
    if curr_poly: subpaths.append(curr_poly)
    return subpaths

sp1 = vectorize_path(armature_p1)
sp2 = vectorize_path(armature_p2)

def point_in_poly(x, y, poly):
    inside = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if ((y1 > y) != (y2 > y)) and (x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1):
            inside = not inside
    return inside

def is_inside_mark(x, y):
    in1 = False
    for sp in sp1:
        if point_in_poly(x, y, sp): in1 = not in1
    if in1: return True
    in2 = False
    for sp in sp2:
        if point_in_poly(x, y, sp): in2 = not in2
    return in2

def render_glossy_chrome(dim):
    ss = 2
    sw = dim * ss
    sh = dim * ss

    min_x, max_x = 0.0, 96.4
    min_y, max_y = 0.18, 96.58
    w_svg = max_x - min_x
    h_svg = max_y - min_y
    pad = 3.2 * ss
    scale = min((sw - 2 * pad) / w_svg, (sh - 2 * pad) / h_svg)
    offset_x = (sw - w_svg * scale) / 2.0
    offset_y = (sh - h_svg * scale) / 2.0

    mask = bytearray(sw * sh)
    for y in range(sh):
        svg_y = min_y + (y + 0.5 - offset_y) / scale
        for x in range(sw):
            svg_x = min_x + (x + 0.5 - offset_x) / scale
            if is_inside_mark(svg_x, svg_y):
                mask[y * sw + x] = 1

    bevel_rad = 3.0 * ss
    max_dist = bevel_rad
    dist_map = [0.0] * (sw * sh)

    irad = int(math.ceil(bevel_rad))
    for y in range(sh):
        for x in range(sw):
            if mask[y * sw + x] == 0:
                continue
            d_min_sq = max_dist * max_dist
            for dy in range(-irad, irad + 1):
                ny = y + dy
                if ny < 0 or ny >= sh:
                    d_min_sq = min(d_min_sq, dy * dy)
                    continue
                row_off = ny * sw
                for dx in range(-irad, irad + 1):
                    nx = x + dx
                    if nx < 0 or nx >= sw or mask[row_off + nx] == 0:
                        dist_sq = dx * dx + dy * dy
                        if dist_sq < d_min_sq:
                            d_min_sq = dist_sq
            dist_map[y * sw + x] = min(max_dist, math.sqrt(d_min_sq))

    rgba = bytearray(sw * sh * 4)
    shadow_alpha = bytearray(sw * sh)
    s_off_y = int(1.8 * ss)
    s_off_x = int(1.0 * ss)
    s_blur = 2.2 * ss
    s_blur_sq = s_blur * s_blur

    for y in range(sh):
        for x in range(sw):
            if mask[y * sw + x]:
                for sdy in range(-int(s_blur), int(s_blur) + 1):
                    sy = y + s_off_y + sdy
                    if 0 <= sy < sh:
                        for sdx in range(-int(s_blur), int(s_blur) + 1):
                            sx = x + s_off_x + sdx
                            if 0 <= sx < sw:
                                d2 = (sdx**2 + sdy**2) / s_blur_sq
                                if d2 < 1.0:
                                    val = int(90 * (1.0 - d2))
                                    idx = sy * sw + sx
                                    if val > shadow_alpha[idx]:
                                        shadow_alpha[idx] = val

    for y in range(sh):
        for x in range(sw):
            idx = (y * sw + x) * 4
            sa = shadow_alpha[y * sw + x]
            if sa > 0 and mask[y * sw + x] == 0:
                rgba[idx] = 12
                rgba[idx+1] = 15
                rgba[idx+2] = 20
                rgba[idx+3] = sa

    # Key light: Top-left elevated, intense shiny light
    lx, ly, lz = -0.58, -0.58, 0.57
    l_len = math.sqrt(lx*lx + ly*ly + lz*lz)
    lx /= l_len; ly /= l_len; lz /= l_len

    # Secondary fill light: Bottom-right
    flx, fly, flz = 0.5, 0.6, 0.62
    fl_len = math.sqrt(flx*flx + fly*fly + flz*flz)
    flx /= fl_len; fly /= fl_len; flz /= fl_len

    for y in range(sh):
        for x in range(sw):
            if mask[y * sw + x] == 0:
                continue
            idx = (y * sw + x) * 4

            d = dist_map[y * sw + x]
            frac = d / bevel_rad
            # Curved convex bubble profile for high-gloss metallic sheen
            h_val = math.sqrt(max(0.0, 1.0 - (1.0 - frac)**2))

            dx = (dist_map[y * sw + min(sw-1, x+1)] - dist_map[y * sw + max(0, x-1)]) * 0.5
            dy = (dist_map[min(sh-1, y+1) * sw + x] - dist_map[max(0, y-1) * sw + x]) * 0.5

            nx = -dx * 2.0
            ny = -dy * 2.0
            nz = 1.0
            n_len = math.sqrt(nx*nx + ny*ny + nz*nz)
            nx /= n_len; ny /= n_len; nz /= n_len

            # Reflection vector R = 2*(N.V)*N - V, where V = (0, 0, 1)
            rx = 2.0 * nz * nx
            ry = 2.0 * nz * ny
            rz = 2.0 * nz * nz - 1.0

            # Chrome Environment Reflection Map based on reflection vector R
            elev = ry
            if elev < -0.2:
                # Sky: gradient from #ffffff down to silver-blue #a8b8c8
                t = (elev + 1.0) / 0.8
                cr = 160.0 + 95.0 * t
                cg = 175.0 + 80.0 * t
                cb = 200.0 + 55.0 * t
            elif elev < 0.05:
                # Horizon flare: intense white horizon shine
                t = (elev + 0.2) / 0.25
                flare = math.exp(-math.pow((t - 0.7) * 5.0, 2))
                cr = 220.0 + 35.0 * flare
                cg = 230.0 + 25.0 * flare
                cb = 245.0 + 10.0 * flare
            elif elev < 0.32:
                # Dark ground reflection line (sharp chrome contrast)
                t = (elev - 0.05) / 0.27
                base_dark = 35.0 + 55.0 * t
                cr = base_dark * 0.95
                cg = base_dark * 1.0
                cb = base_dark * 1.15
            else:
                # Ground bounce reflection
                t = (elev - 0.32) / 0.68
                bounce = math.exp(-math.pow((t - 0.65) * 3.5, 2)) * 95.0
                cr = 80.0 + 70.0 * t + bounce
                cg = 90.0 + 75.0 * t + bounce
                cb = 105.0 + 85.0 * t + bounce * 1.05

            # Specular Highlights (Blinn-Phong)
            hx, hy, hz = lx, ly, lz + 1.0
            h_len = math.sqrt(hx*hx + hy*hy + hz*hz)
            hx /= h_len; hy /= h_len; hz /= h_len
            ndoth = max(0.0, nx * hx + ny * hy + nz * hz)
            spec_sharp = math.pow(ndoth, 80.0) * 260.0
            spec_broad = math.pow(ndoth, 22.0) * 110.0

            fhx, fhy, fhz = flx, fly, flz + 1.0
            fh_len = math.sqrt(fhx*fhx + fhy*fhy + fhz*fhz)
            fhx /= fh_len; fhy /= fh_len; fhz /= fh_len
            fndoth = max(0.0, nx * fhx + ny * fhy + nz * fhz)
            spec_rim = math.pow(fndoth, 40.0) * 90.0

            lit_r = cr + spec_sharp + spec_broad + spec_rim
            lit_g = cg + spec_sharp + spec_broad + spec_rim
            lit_b = cb + spec_sharp * 1.02 + spec_broad * 1.05 + spec_rim * 1.05

            if frac < 0.15:
                edge_light = max(0.0, -(nx + ny) * 0.707)
                edge_glint = edge_light * (1.0 - frac / 0.15) * 140.0
                lit_r += edge_glint
                lit_g += edge_glint
                lit_b += edge_glint * 1.05
                if (nx + ny) > 0.3:
                    darken = 1.0 - (1.0 - frac / 0.15) * 0.4
                    lit_r *= darken
                    lit_g *= darken
                    lit_b *= darken

            rgba[idx] = int(max(0.0, min(255.0, lit_r)))
            rgba[idx+1] = int(max(0.0, min(255.0, lit_g)))
            rgba[idx+2] = int(max(0.0, min(255.0, lit_b)))
            rgba[idx+3] = 255

    out_rgba = bytearray(dim * dim * 4)
    for ty in range(dim):
        for tx in range(dim):
            r_sum, g_sum, b_sum, a_sum = 0, 0, 0, 0
            for sy in range(ss):
                for sx in range(ss):
                    px = tx * ss + sx
                    py = ty * ss + sy
                    p_idx = (py * sw + px) * 4
                    alpha = rgba[p_idx+3]
                    r_sum += rgba[p_idx] * alpha
                    g_sum += rgba[p_idx+1] * alpha
                    b_sum += rgba[p_idx+2] * alpha
                    a_sum += alpha
            out_idx = (ty * dim + tx) * 4
            if a_sum > 0:
                out_rgba[out_idx] = int(round(r_sum / a_sum))
                out_rgba[out_idx+1] = int(round(g_sum / a_sum))
                out_rgba[out_idx+2] = int(round(b_sum / a_sum))
                out_rgba[out_idx+3] = int(round(a_sum / (ss * ss)))
            else:
                out_rgba[out_idx] = 0
                out_rgba[out_idx+1] = 0
                out_rgba[out_idx+2] = 0
                out_rgba[out_idx+3] = 0

    raw = bytearray()
    for y in range(dim):
        raw.append(0)
        raw.extend(out_rgba[y*dim*4 : (y+1)*dim*4])
    def chunk(tag, payload):
        return struct.pack('>I', len(payload)) + tag + payload + struct.pack('>I', zlib.crc32(tag + payload) & 0xffffffff)
    out = b'\x89PNG\r\n\x1a\n'
    out += chunk(b'IHDR', struct.pack('>IIBBBBB', dim, dim, 8, 6, 0, 0, 0))
    out += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    out += chunk(b'IEND', b'')
    return out

# 1. Output Glossy Chrome SVG
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 97 97">
  <!-- Glossy Chrome Bosch Armature -->
  <defs>
    <filter id="chrome-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="1.0" dy="2.0" stdDeviation="1.8" flood-color="#0b1016" flood-opacity="0.45"/>
    </filter>

    <filter id="chrome-bevel" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" result="blurMap"/>
      
      <feSpecularLighting in="blurMap" surfaceScale="3.0" specularConstant="2.2" specularExponent="35" lighting-color="#ffffff" result="sharpSpec">
        <feDistantLight azimuth="220" elevation="56"/>
      </feSpecularLighting>
      <feComposite in="sharpSpec" in2="SourceAlpha" operator="in" result="sharpSpecCut"/>

      <feDiffuseLighting in="blurMap" surfaceScale="1.4" diffuseConstant="1.1" lighting-color="#e2ebf5" result="diffuseFill">
        <feDistantLight azimuth="50" elevation="65"/>
      </feDiffuseLighting>
      <feComposite in="diffuseFill" in2="SourceAlpha" operator="in" result="diffuseCut"/>

      <feMerge>
        <feMergeNode in="SourceGraphic"/>
        <feMergeNode in="diffuseCut"/>
        <feMergeNode in="sharpSpecCut"/>
      </feMerge>
    </filter>

    <linearGradient id="glossyRingGrad" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="12%" stop-color="#edf4fc"/>
      <stop offset="28%" stop-color="#adc1d6"/>
      <stop offset="42%" stop-color="#ffffff"/>
      <stop offset="46%" stop-color="#182330"/>
      <stop offset="55%" stop-color="#3d4e60"/>
      <stop offset="70%" stop-color="#9bb3cc"/>
      <stop offset="86%" stop-color="#d6e3f0"/>
      <stop offset="100%" stop-color="#4a5a6a"/>
    </linearGradient>

    <linearGradient id="glossyCoreGrad" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="16%" stop-color="#e8f0f8"/>
      <stop offset="32%" stop-color="#9cb2c7"/>
      <stop offset="44%" stop-color="#ffffff"/>
      <stop offset="48%" stop-color="#101822"/>
      <stop offset="60%" stop-color="#324252"/>
      <stop offset="76%" stop-color="#b2c6db"/>
      <stop offset="90%" stop-color="#e2ecf7"/>
      <stop offset="100%" stop-color="#3e4d5c"/>
    </linearGradient>

    <linearGradient id="glossyRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="#73899f" stop-opacity="0.8"/>
      <stop offset="70%" stop-color="#16202c" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#eaf2fa" stop-opacity="0.85"/>
    </linearGradient>
  </defs>

  <g filter="url(#chrome-shadow)">
    <g filter="url(#chrome-bevel)">
      <path d="{armature_p1}" fill="url(#glossyRingGrad)" stroke="url(#glossyRimGrad)" stroke-width="0.35" stroke-linejoin="round"/>
      <path d="{armature_p2}" fill="url(#glossyCoreGrad)" stroke="url(#glossyRimGrad)" stroke-width="0.35" stroke-linejoin="round"/>
    </g>
  </g>
</svg>
'''

for target_dir in app_dirs:
    with open(os.path.join(target_dir, "favicon.svg"), "w") as f:
        f.write(svg_content)
print("Synchronized glossy chrome favicon.svg")

# 2. Output multi-resolution glossy chrome PNGs
png_512_data = None
for dim in (16, 32, 48, 64, 128, 256, 512):
    data = render_glossy_chrome(dim)
    if dim == 512:
        png_512_data = data
    fn = f"sapShell_Favicon_{dim}x{dim}.png"
    with open(os.path.join(repo_root, fn), "wb") as f:
        f.write(data)
    print(f"Generated glossy chrome {fn}")

# 3. Generate multi-size favicon.ico (16, 32, 48, 64, 128, 256)
def make_ico(png_files, out_path):
    entries = []
    offset = 6 + len(png_files) * 16
    images_data = []
    for fn, w, h in png_files:
        with open(os.path.join(repo_root, fn), 'rb') as f:
            data = f.read()
        images_data.append(data)
        width_byte = 0 if w >= 256 else w
        height_byte = 0 if h >= 256 else h
        entries.append(struct.pack('<BBBBHHII', width_byte, height_byte, 0, 0, 1, 32, len(data), offset))
        offset += len(data)
    with open(out_path, 'wb') as f:
        f.write(struct.pack('<HHH', 0, 1, len(png_files)))
        for e in entries:
            f.write(e)
        for img in images_data:
            f.write(img)

ico_sizes = [
    ("sapShell_Favicon_16x16.png", 16, 16),
    ("sapShell_Favicon_32x32.png", 32, 32),
    ("sapShell_Favicon_48x48.png", 48, 48),
    ("sapShell_Favicon_64x64.png", 64, 64),
    ("sapShell_Favicon_128x128.png", 128, 128),
    ("sapShell_Favicon_256x256.png", 256, 256),
]
for target_dir in app_dirs:
    make_ico(ico_sizes, os.path.join(target_dir, "favicon.ico"))
print("Synchronized glossy chrome favicon.ico (including 256x256)")

# 4. Synchronize 512x512 sapShell_Favicon.png (Ultra HiDPI / Retina / Apple Touch)
for target_dir in app_dirs:
    with open(os.path.join(target_dir, "sapShell_Favicon.png"), "wb") as f:
        f.write(png_512_data)
print("Synchronized glossy chrome sapShell_Favicon.png (512x512)")
