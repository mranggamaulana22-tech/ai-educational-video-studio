import numpy as np, cv2, json, os
from scipy import ndimage as ndi

W, H = 460, 605
out = "layers"; os.makedirs(out, exist_ok=True)
im = cv2.imread('/mnt/user-data/uploads/felisa-panel-portrait.png', cv2.IMREAD_UNCHANGED)
A0 = im[:, :, 3].astype(np.float32) / 255
bgc = np.array([30, 22, 8], np.float32)  # BGR of panel dark (8,22,30)
comp = (im[:, :, :3].astype(np.float32) * A0[..., None] + bgc * (1 - A0[..., None])).clip(0, 255)

def poly_mask(pts, ss=4):
    m = np.zeros((H * ss, W * ss), np.uint8)
    cv2.fillPoly(m, [np.round(np.array(pts, np.float32) * ss).astype(np.int32)], 255)
    return cv2.resize(m, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255

def ellipse_mask(c, rx, ry, tilt_deg, ss=4):
    m = np.zeros((H * ss, W * ss), np.uint8)
    cv2.ellipse(m, (int(c[0] * ss), int(c[1] * ss)), (int(rx * ss), int(ry * ss)), tilt_deg, 0, 360, 255, -1)
    return cv2.resize(m, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255

def blur(a, s): return cv2.GaussianBlur(a, (0, 0), s)

def fill(img, unknown):
    known = (1 - (unknown > 0.5)).astype(np.float32)
    out_ = img.copy(); done = known > 0.5
    for s in [1.5, 3, 6, 12, 24, 48, 96]:
        k = done.astype(np.float32)
        num = np.stack([blur(out_[:, :, c] * k, s) for c in range(3)], -1)
        den = blur(k, s)
        est = num / np.maximum(den, 1e-4)[..., None]
        sel = (~done) & (den > 0.06)
        out_[sel] = est[sel]; done = done | sel
    return out_

def smooth(m, s=1.0): return blur(m, s)

# ---------- region definitions (koordinat gambar 460x605) ----------
FACE = [(171,153),(173,165),(177,185),(182,200),(190,215),(205,229),(223,236),(238,234),(257,219),(272,203),(279,182),(282,160),(281,147),(272,131),(263,103),(247,88),(223,83),(203,92),(187,110),(176,132)]
ZONE = [(178,128),(176,100),(180,72),(196,53),(223,45),(250,48),(272,60),(284,86),(287,120),(283,126)]
LIPLINE = [(198,202),(210,204.5),(222,205),(232,203.5),(241,200.5),(251,195.5)]
EYES = {"L": dict(c=(188,152), rx=12.5, ry=5.2, tilt=5, iris=(188,152,6.3)),
        "R": dict(c=(248,146), rx=14.5, ry=6.6, tilt=-8, iris=(247.5,146,7.0))}

face_m = poly_mask(FACE)
zone_m = poly_mask(ZONE)

# skin color test
hsv = cv2.cvtColor(comp.astype(np.uint8), cv2.COLOR_BGR2HSV)
Hh, S, V = [hsv[:, :, i].astype(int) for i in range(3)]
skin = ((Hh <= 22) & (S > 35) & (S < 190) & (V > 95)).astype(np.float32)
skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
nonskin = 1 - skin

def save_rgba(name, rgb, a):
    a8 = (np.clip(a, 0, 1) * 255).round().astype(np.uint8)
    rgb8 = rgb.clip(0, 255).astype(np.uint8)
    rgb8[a8 == 0] = 0
    bgra = np.dstack([rgb8, a8])
    cv2.imwrite(f"{out}/{name}.png", bgra, [cv2.IMWRITE_PNG_COMPRESSION, 9])

# ---------- BASE: seluruh gambar, wajah diisi (tidak ada hantu dagu) ----------
face_core = (erode := cv2.erode((face_m > 0.5).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32))
base = fill(comp, face_core)
save_rgba("base", base, np.ones((H, W), np.float32))

# ---------- HAIRBACK: tambalan kepala (lebar penuh, y 0..262), wajah+poni diisi ----------
zone_core = cv2.erode((zone_m > 0.5).astype(np.uint8), np.ones((13, 13), np.uint8)).astype(np.float32)
hb_unknown = np.maximum(face_core, zone_core)
hb_rgb = fill(comp, hb_unknown)
yy = np.arange(H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32)
fade = np.clip((258 - yy) / 43.0, 0, 1)  # 1 sampai y=215, 0 di y=258
fade = fade * fade * (3 - 2 * fade)
save_rgba("hairback", hb_rgb, fade)

# ---------- FACE ----------
bang_hair = smooth(cv2.dilate(nonskin, np.ones((3, 3), np.uint8)), 0.8)
under = (zone_m > 0.3) & (face_m > 0.3) & (yy < 127) & (nonskin > 0.5)
under = cv2.dilate(under.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)
face_rgb = fill(comp, under * (face_m > 0.2))  # rekonstruksi dahi di bawah poni
# iris -> sklera
scl = np.array([190, 200, 212], np.float32)  # BGR kira-kira sklera kemerahan
for k, e in EYES.items():
    cx, cy, r = e["iris"]
    d = ellipse_mask((cx, cy), r + 0.8, r + 0.8, 0)
    ap = ellipse_mask(e["c"], e["rx"], e["ry"], e["tilt"])
    ring = (ap > 0.5) & (d < 0.2) & (skin < 0.5)
    sel = comp[ring]
    col = scl
    if len(sel) > 6:
        lum = sel.mean(1); sel = sel[lum >= np.percentile(lum, 40)]
        col = sel.mean(0) * 0.92
    d = smooth(d * ap, 0.6)
    face_rgb = face_rgb * (1 - d[..., None]) + col * d[..., None]
face_a = smooth(face_m, 0.8)
save_rgba("face", face_rgb, face_a)

# ---------- BANGS ----------
zs = smooth(cv2.erode((zone_m > 0.5).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32), 3.0)
hair_in_face = np.clip(bang_hair * 1.0, 0, 1)
a_b = zs * (1 - (face_m > 0.5) * (1 - hair_in_face))
a_b = a_b * (1 - np.clip((yy - 118) / 9.0, 0, 1) * 0)  # biarkan zona yang membatasi
save_rgba("bangs", comp, a_b)

# ---------- IRIS ----------
iris_a = np.zeros((H, W), np.float32)
aper_a = np.zeros((H, W), np.float32)
lid_a = np.zeros((H, W), np.float32)
lid_unknown = np.zeros((H, W), np.float32)
for k, e in EYES.items():
    cx, cy, r = e["iris"]
    iris_a = np.maximum(iris_a, smooth(ellipse_mask((cx, cy), r + 0.3, r + 0.3, 0), 0.5))
    aper_a = np.maximum(aper_a, smooth(ellipse_mask(e["c"], e["rx"], e["ry"], e["tilt"]), 0.5))
    lid_a = np.maximum(lid_a, smooth(ellipse_mask(e["c"], e["rx"] * 1.18, e["ry"] * 1.55, e["tilt"]), 0.9))
    lid_unknown = np.maximum(lid_unknown, ellipse_mask(e["c"], e["rx"] * 1.5, e["ry"] * 2.6, e["tilt"]))
save_rgba("iris", comp, iris_a)
# kelopak: kulit sekitar mata
known_skin = (skin * (face_m > 0.5)).astype(np.float32)
lid_src = comp.copy()
unk = np.maximum(lid_unknown, 1 - known_skin)  # hanya piksel kulit yang jadi sumber
lid_rgb = fill(lid_src, np.maximum(lid_unknown, (1 - known_skin) * (face_m > 0.5)))
save_rgba("lid", lid_rgb, lid_a)
save_rgba("aperture", np.zeros((H, W, 3), np.float32), aper_a)

# ---------- LOWER LIP ----------
xs = np.array([p[0] for p in LIPLINE]); ys = np.array([p[1] for p in LIPLINE])
xx = np.arange(W, dtype=np.float32)[None, :] * np.ones((H, 1), np.float32)
line_y = np.interp(xx, xs, ys)
inreg = ((xx >= 202) & (xx <= 245) & (yy >= line_y + 0.5) & (yy <= line_y + 11)).astype(np.float32)
ll_a = smooth(inreg, 1.1)
save_rgba("lowerlip", comp, ll_a)

# ---------- VIGNETTE (alpha asli) ----------
save_rgba("vignette", np.zeros((H, W, 3), np.float32), A0)

json.dump(dict(LIPLINE=LIPLINE, EYES={k: dict(c=e["c"], rx=e["rx"], ry=e["ry"], tilt=e["tilt"], iris=e["iris"]) for k, e in EYES.items()}), open(f"{out}/meta.json", "w"))

# ---------- tes komposit numpy dengan offset ----------
def over(dst, rgb, a, dx=0, dy=0):
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    rgb2 = cv2.warpAffine(rgb, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    a2 = cv2.warpAffine(a, M, (W, H), flags=cv2.INTER_LINEAR, borderValue=0)
    return dst * (1 - a2[..., None]) + rgb2 * a2[..., None]

def render(dxh=0, dxf=0, dxb=0, dy=0):
    d = base.copy()
    d = over(d, hb_rgb, fade, dxh, dy * 0.5)
    d = over(d, face_rgb, face_a, dxf, dy)
    sh = dxf * 0.3
    ia = cv2.warpAffine(iris_a, np.float32([[1, 0, sh], [0, 1, 0]]), (W, H), flags=cv2.INTER_LINEAR) * aper_a
    irgb = cv2.warpAffine(comp, np.float32([[1, 0, sh], [0, 1, 0]]), (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    d = over(d, irgb, ia, dxf, dy)
    d = over(d, comp, a_b, dxb, dy * 1.4)
    return d * A0[..., None] + bgc * 0  # vignette
for tag, args in {"rest": (0, 0, 0, 0), "move": (2, 4, 6, 1)}.items():
    r = render(*args)
    c = r[20:290, 90:400].astype(np.uint8)
    cv2.imwrite(f"test_{tag}.png", cv2.resize(c, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC))
print("layers:", sorted(os.listdir(out)))
