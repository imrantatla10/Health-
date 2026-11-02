"""Procedural cinematic music bed + synchronised sound effects under the ElevenLabs narration.
Inputs: build/voice.wav, build/cues.json (exported by the animation). Output: build/mix.wav (48 kHz stereo)."""
import json, os, wave
import numpy as np

B = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")
SR = 48000
with wave.open(os.path.join(B, "voice.wav")) as f:
    voice = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32) / 32768
N = len(voice); DUR = N / SR
cues = json.load(open(os.path.join(B, "cues.json")))
T, CUES = cues["T"], cues["CUES"]
rs = np.random.default_rng(7)
t_all = np.arange(N) / SR


def add(buf, sig, at, g=1.0):
    i = int(at * SR)
    if i >= len(buf): return
    if i < 0: sig, i = sig[-i:], 0
    sig = sig[: len(buf) - i]; buf[i:i + len(sig)] += sig * g


def bp(x, lo, hi):  # FFT band-pass with soft edges
    n = len(x); L = 1 << int(np.ceil(np.log2(max(n, 2))))
    X = np.fft.rfft(x, L); fr = np.fft.rfftfreq(L, 1 / SR)
    m = 1 / np.sqrt(1 + (lo / np.maximum(fr, 1)) ** 4) / np.sqrt(1 + (fr / hi) ** 4)
    return np.fft.irfft(X * m, L)[:n]


def norm(x): return x / (np.abs(x).max() + 1e-9)
def tt(d): return np.arange(int(d * SR)) / SR
def env_ad(n, a, r):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e
def note(m): return 440 * 2 ** ((m - 69) / 12)


# ---------------- music ----------------
music = np.zeros(N)
def pad(freqs, d, bright=1200):
    x = tt(d); s = sum(np.sin(2 * np.pi * f * x + np.sin(2 * np.pi * 0.3 * x) * 0.5) + 0.5 * np.sin(2 * np.pi * f * 2.002 * x) + 0.25 * np.sin(2 * np.pi * f * 3.01 * x) for f in freqs)
    return bp(s / len(freqs), 60, bright) * env_ad(len(x), 0.8, 1.2)
def pluck(f, d=0.6):
    x = tt(d); return (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 7)
def kick(g=1):
    x = tt(0.4); return np.sin(2 * np.pi * np.cumsum(45 + 80 * np.exp(-x * 28)) / SR) * np.exp(-x * 8) * g

bpm = 96; beat = 60 / bpm; bar = 4 * beat
prog_a = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]]        # Am F C G — curious
prog_t = [[50, 53, 57], [50, 53, 58], [52, 55, 59], [52, 56, 59]]        # tension (Dm, Bb/D, Em, E)
prog_c = [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]]        # C G Am F — resolve
sections = [(0, T["s4"], prog_a, 0.9), (T["s4"], T["s6"], prog_t, 1.0), (T["s6"], T["s7"], prog_a, 1.0), (T["s7"], DUR, prog_c, 1.15)]
for (a, b, prog, lvl) in sections:
    x = a; k = 0
    while x < b - 0.2:
        ch = prog[k % 4]; d = min(bar, b - x) + 1.0
        add(music, pad([note(m) for m in ch], d), x, 0.33 * lvl)
        add(music, pad([note(ch[0] - 24)], d, 300), x, 0.4 * lvl)
        for i in range(8):
            tb = x + i * beat / 2
            if tb >= b: break
            add(music, pluck(note(ch[i % 3] + 12 + (12 if i % 4 == 3 else 0))), tb, 0.10 * lvl)
        for i in range(4):
            tb = x + i * beat
            if tb < b and a > 0: add(music, kick(0.35 if i % 2 == 0 else 0.18), tb)
        x += bar; k += 1
# duck under voice
k = int(0.15 * SR); cs = np.concatenate([[0], np.cumsum(np.abs(voice))]); venv = (cs[np.minimum(np.arange(N) + k // 2, N)] - cs[np.maximum(np.arange(N) - k // 2, 0)]) / k
music *= 1 - 0.55 * np.clip(venv / 0.03, 0, 1)
music *= np.minimum(1, t_all / 1.0) * np.minimum(1, (DUR - t_all) / 1.5)

# ---------------- SFX ----------------
def s_whoosh(d=0.5):
    x = tt(d); n = rs.standard_normal(len(x)); return norm(bp(n, 300, 4000)) * np.sin(np.pi * x / d) ** 2 * 0.45
def s_thud():
    x = tt(1.0); return (np.sin(2 * np.pi * np.cumsum(55 + 70 * np.exp(-x * 20)) / SR) * np.exp(-x * 7) + norm(bp(rs.standard_normal(len(x)), 80, 900)) * np.exp(-x * 14) * 0.5) * 0.95
def s_scrape(d):
    x = tt(d); n = norm(bp(rs.standard_normal(len(x)), 150, 1600)); am = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 1.4 * x)) ** 2
    return n * am * env_ad(len(x), 0.2, 0.3) * 0.35
def s_swing():
    x = tt(1.3); return norm(bp(rs.standard_normal(len(x)), 120, 1200)) * np.sin(np.pi * x / 1.3) ** 2 * 0.35
def s_step():
    x = tt(0.15); return (np.sin(2 * np.pi * (180 + rs.random() * 60) * x) * np.exp(-x * 40) + norm(bp(rs.standard_normal(len(x)), 300, 2500)) * np.exp(-x * 60) * 0.4) * 0.35
def s_creak():
    x = tt(0.9); f = 140 + 60 * np.sin(2 * np.pi * 1.1 * x) + 25 * x; saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    gr = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 32 * x)); return bp(saw * gr, 200, 2500) * env_ad(len(x), 0.1, 0.25) * 0.5
def s_yelp():
    x = tt(0.45); f = 500 + 500 * np.sin(np.pi * x / 0.45); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(x), 0.03, 0.15) * 0.12
def s_splash():
    x = tt(2.2); body = norm(bp(rs.standard_normal(len(x)), 250, 7000)) * (np.exp(-x * 2.6) * 0.9)
    low = np.sin(2 * np.pi * np.cumsum(60 + 80 * np.exp(-x * 12)) / SR) * np.exp(-x * 6) * 0.7
    drops = np.zeros(len(x))
    for _ in range(70):
        i = int(rs.uniform(0.15, 1.9) * SR); L = 1600; f = rs.uniform(900, 3200)
        if i + L < len(x): drops[i:i + L] += np.sin(2 * np.pi * np.cumsum(f * (1 + np.arange(L) / L)) / SR) * np.exp(-np.arange(L) / SR * 90) * 0.12
    return (body + low + drops) * 0.95
def s_bubbles():
    x = tt(1.2); o = np.zeros(len(x))
    for _ in range(18):
        i = int(rs.uniform(0, 1.0) * SR); L = 3000; f = rs.uniform(300, 900)
        if i + L < len(x): o[i:i + L] += np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * np.arange(L) / L)) / SR) * np.exp(-np.arange(L) / SR * 40) * 0.2
    return o
def s_spit():
    x = tt(0.6); return norm(bp(rs.standard_normal(len(x)), 1200, 8000)) * env_ad(len(x), 0.02, 0.4) * 0.35
def s_dip():
    x = tt(0.4); return norm(bp(rs.standard_normal(len(x)), 800, 5000)) * env_ad(len(x), 0.02, 0.3) * 0.18
def s_knock():
    x = tt(0.25); f = 420 + rs.random() * 160
    return (np.sin(2 * np.pi * f * x) * np.exp(-x * 30) + np.sin(2 * np.pi * f * 2.7 * x) * np.exp(-x * 45) * 0.4 + norm(bp(rs.standard_normal(len(x)), 800, 5000)) * np.exp(-x * 90) * 0.5) * 0.45
def s_engine(d):
    x = tt(d); rpm = 38 + 14 * np.minimum(1, x / 1.5); ph = np.cumsum(rpm) / SR
    fir = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * ph)); return bp(fir * np.sin(2 * np.pi * 2 * ph) + 0.3 * rs.standard_normal(len(x)), 30, 600) * env_ad(len(x), 0.6, 0.8) * 0.4
def s_gulp():
    x = tt(0.35); f = 260 - 120 * x / 0.35; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(x), 0.02, 0.15) * 0.18
def s_pile():
    x = tt(0.9); return (np.sin(2 * np.pi * np.cumsum(48 + 60 * np.exp(-x * 25)) / SR) * np.exp(-x * 8) + np.sin(2 * np.pi * 310 * x) * np.exp(-x * 25) * 0.4 + norm(bp(rs.standard_normal(len(x)), 100, 2000)) * np.exp(-x * 30) * 0.4) * 0.9
def s_slide():
    x = tt(0.8); return norm(bp(rs.standard_normal(len(x)), 300, 2200)) * env_ad(len(x), 0.1, 0.25) * 0.3
def s_clunk():
    x = tt(0.5); return (np.sin(2 * np.pi * 95 * x) * np.exp(-x * 14) + norm(bp(rs.standard_normal(len(x)), 300, 3000)) * np.exp(-x * 40) * 0.5) * 0.7
def s_lift():
    x = tt(1.2); f = 180 + 120 * x; return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.08 + norm(bp(rs.standard_normal(len(x)), 150, 900)) * 0.05) * env_ad(len(x), 0.2, 0.3)
def s_rattle(d):
    x = tt(d); o = np.zeros(len(x)); k = 0
    while k / 7.0 < d - 0.1:
        i = int(k / 7.0 * SR); seg = s_knock()[: len(x) - i] * 0.6; o[i:i + len(seg)] += seg; k += 1
    return o * env_ad(len(x), 0.1, 0.3)
def s_giggle(d):
    x = tt(d); o = np.zeros(len(x))
    for st in np.arange(0.1, d - 0.5, 0.9):
        for j in range(5):
            i = int((st + j * 0.11) * SR); L = int(0.08 * SR); f = 900 + 120 * np.sin(j) + rs.uniform(-40, 40)
            if i + L < len(x): xx = np.arange(L) / SR; o[i:i + L] += np.sin(2 * np.pi * f * xx + 3 * np.sin(2 * np.pi * 6 * xx)) * np.sin(np.pi * xx / (L / SR)) * 0.05
    return o
def s_chime():
    x = tt(2.0); return sum(np.sin(2 * np.pi * f * x) * np.exp(-x * dd) * a for f, dd, a in [(1047, 2, .3), (1319, 2.5, .25), (1568, 3, .2), (2093, 4, .15)]) * 0.55
def s_pop():
    x = tt(0.15); return np.sin(2 * np.pi * np.cumsum(500 + 900 * (1 - np.exp(-x * 40))) / SR) * np.exp(-x * 30) * 0.4
def s_swell():
    x = tt(2.0); return pad([note(60), note(64), note(67), note(72)], 2.0, 3000) * np.linspace(0, 1, len(x)) ** 2 * 0.45
def s_cheer():
    x = tt(3.0); o = np.zeros(len(x))
    for _ in range(140):
        i = int(rs.uniform(0, 2.5) * SR); L = int(0.03 * SR)
        if i + L < len(x): o[i:i + L] += norm(bp(rs.standard_normal(L), 600, 5000)) * np.exp(-np.arange(L) / SR * 120) * 0.25
    return o * env_ad(len(x), 0.2, 1.0) + norm(bp(rs.standard_normal(len(x)), 300, 3000)) * env_ad(len(x), 0.4, 1.2) * 0.05
def s_boom():
    x = tt(2.5); return (np.sin(2 * np.pi * np.cumsum(32 + 50 * np.exp(-x * 6)) / SR) * np.exp(-x * 1.6) + norm(bp(rs.standard_normal(len(x)), 40, 600)) * np.exp(-x * 4) * 0.4) * 0.7

GEN = dict(whoosh=s_whoosh, thud=s_thud, scrape=s_scrape, swing=s_swing, step=s_step, creak=s_creak, yelp=s_yelp, splash=s_splash, bubbles=s_bubbles, spit=s_spit, dip=s_dip,
           knock=s_knock, engine=s_engine, gulp=s_gulp, pile=s_pile, slide=s_slide, clunk=s_clunk, lift=s_lift, rattle=s_rattle, giggle=s_giggle, chime=s_chime, pop=s_pop,
           swell=s_swell, cheer=s_cheer, boom=s_boom)
GAIN = dict(whoosh=0.6, chime=0.8, knock=0.9, step=0.8)
sfx = np.zeros(N)
for c in CUES:
    fn = GEN[c["k"]]; sig = fn(c["d"]) if "d" in c else fn()
    add(sfx, sig, c["t"], GAIN.get(c["k"], 1.0))
# nature ambience: river flow + birdsong
river = norm(bp(rs.standard_normal(N), 200, 3500)) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.13 * t_all)) * 0.07
birds = np.zeros(N)
for _ in range(int(DUR * 0.9)):
    st = rs.uniform(0, DUR - 1); f0 = rs.uniform(2600, 4200)
    for j in range(rs.integers(2, 5)):
        L = int(0.09 * SR); xx = np.arange(L) / SR; f = f0 + 900 * np.sin(np.pi * xx / 0.09) * (1 if j % 2 else -1)
        add(birds, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * xx / 0.09) * 0.025, st + j * 0.13)
amb = (river + birds) * np.minimum(1, t_all / 0.8)
sfx += amb

sfx *= 1 - 0.35 * np.clip(venv / 0.03, 0, 1)
mix_m = music * 0.22 + sfx * 0.55
d = int(0.012 * SR)
L = voice + mix_m; R = voice + np.concatenate([np.zeros(d), mix_m[:-d]])
st = np.stack([L, R], 1)
st = np.tanh(st * 1.15) / np.tanh(1.15)
st *= 0.97 / np.abs(st).max()
with wave.open(os.path.join(B, "mix.wav"), "wb") as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((st * 32767).astype(np.int16).tobytes())
print("mix", round(DUR, 3), "s; peak", float(np.abs(st).max()))
