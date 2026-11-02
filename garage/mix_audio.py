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
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / np.sqrt(1 + (lo / np.maximum(fr, 1)) ** 4) / np.sqrt(1 + (fr / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


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
sections = [(0, T["s3"], prog_a, 0.9), (T["s3"], T["s5"], prog_t, 1.0), (T["s5"], T["s10"], prog_a, 1.0), (T["s10"], DUR, prog_c, 1.1)]
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
venv = np.convolve(np.abs(voice), np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same")
music *= 1 - 0.55 * np.clip(venv / 0.03, 0, 1)
music *= np.minimum(1, t_all / 1.0) * np.minimum(1, (DUR - t_all) / 1.5)

# ---------------- SFX ----------------
def s_whoosh(d=0.5):
    x = tt(d); n = rs.standard_normal(len(x)); return norm(bp(n, 300, 4000)) * np.sin(np.pi * x / d) ** 2 * 0.45
def s_rumble(d=1.6):
    x = tt(d); return norm(bp(rs.standard_normal(len(x)), 25, 160)) * env_ad(len(x), 0.3, 0.8) * 0.7
def s_fall():
    x = tt(0.9); f = 900 * np.exp(-x * 2.5) + 120; w = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15 + norm(bp(rs.standard_normal(len(x)), 200, 2000)) * 0.2
    return w * env_ad(len(x), 0.05, 0.2)
def s_rewind():
    x = tt(0.45); f = 200 + 2500 * (x / 0.45) ** 2; return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + norm(bp(rs.standard_normal(len(x)), 1000, 6000)) * 0.2) * env_ad(len(x), 0.05, 0.08)
def s_hyd(d):
    x = tt(max(d, 0.2)); hum = sum(np.sin(2 * np.pi * 98 * h * x) / h for h in range(1, 7)) * 0.18
    whine = np.sin(2 * np.pi * (620 + 30 * np.sin(2 * np.pi * 3 * x)) * x) * 0.04
    return (hum + whine + norm(bp(rs.standard_normal(len(x)), 80, 900)) * 0.08) * env_ad(len(x), 0.12, 0.2)
def s_clunk():
    x = tt(0.5); return (np.sin(2 * np.pi * 85 * x) * np.exp(-x * 14) + norm(bp(rs.standard_normal(len(x)), 300, 3000)) * np.exp(-x * 40) * 0.5) * 0.8
def s_click():
    x = tt(0.08); return (np.sin(2 * np.pi * 2400 * x) * np.exp(-x * 120) + norm(bp(rs.standard_normal(len(x)), 2000, 9000)) * np.exp(-x * 200) * 0.6) * 0.6
def s_hiss(d=1.4):
    x = tt(d); return norm(bp(rs.standard_normal(len(x)), 3000, 10000)) * env_ad(len(x), 0.2, 0.4) * 0.22
def s_clang():
    x = tt(1.6); ring = sum(np.sin(2 * np.pi * f * x) * np.exp(-x * dd) * a for f, dd, a in [(212, 2.5, .5), (537, 3.5, .35), (1130, 5, .25), (2210, 8, .15)])
    return (ring + np.sin(2 * np.pi * 60 * x) * np.exp(-x * 9) + norm(bp(rs.standard_normal(len(x)), 500, 6000)) * np.exp(-x * 30) * 0.6) * 0.7
def s_lock():
    x = tt(0.35); return (norm(bp(rs.standard_normal(len(x)), 1500, 8000)) * np.exp(-x * 90) * 0.7 + np.sin(2 * np.pi * 1800 * x) * np.exp(-x * 60) * 0.3 + np.sin(2 * np.pi * 140 * x) * np.exp(-x * 25) * 0.6) * 0.75
def s_tap():
    x = tt(0.12); return (np.sin(2 * np.pi * (700 + rs.random() * 300) * x) * np.exp(-x * 60) + norm(bp(rs.standard_normal(len(x)), 800, 5000)) * np.exp(-x * 80) * 0.4) * 0.35
def s_bump():
    x = tt(0.4); return np.sin(2 * np.pi * 70 * x) * np.exp(-x * 12) * 0.7
def s_turn(d):
    x = tt(d); return (sum(np.sin(2 * np.pi * 70 * h * x) / h for h in range(1, 5)) * 0.15 + norm(bp(rs.standard_normal(len(x)), 100, 700)) * 0.06) * env_ad(len(x), 0.3, 0.4)
def s_idle(d):
    x = tt(d); fir = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 24 * x)); return bp(fir * np.sin(2 * np.pi * 48 * x) + 0.3 * rs.standard_normal(len(x)), 30, 400) * env_ad(len(x), 0.5, 0.6) * 0.35
def s_fan(d):
    x = tt(d); spin = np.minimum(1, x / 0.8); return (norm(bp(rs.standard_normal(len(x)), 200, 2500)) * 0.12 + np.sin(2 * np.pi * 180 * spin * x) * 0.03) * spin * env_ad(len(x), 0.1, 0.5)
def s_rain(d):
    x = tt(d); n = norm(bp(rs.standard_normal(len(x)), 800, 9000)) * 0.22
    drops = np.zeros(len(x)); idx = rs.integers(0, len(x) - 400, int(d * 60))
    for i in idx: drops[i:i + 400] += np.sin(2 * np.pi * rs.uniform(1500, 4000) * np.arange(400) / SR) * np.exp(-np.arange(400) / SR * 300) * 0.15
    return (n + drops) * env_ad(len(x), 0.6, 0.8)
def s_flow(d):
    x = tt(d); return norm(bp(rs.standard_normal(len(x)), 300, 2500)) * (0.6 + 0.4 * np.sin(2 * np.pi * 5 * x) ** 2) * env_ad(len(x), 0.4, 0.5) * 0.12
def s_reveal():
    x = tt(1.6); return pad([note(60), note(64), note(67), note(72)], 1.6, 3000) * np.linspace(0, 1, len(x)) ** 2 * 0.5
def s_pop():
    x = tt(0.15); return np.sin(2 * np.pi * np.cumsum(500 + 900 * (1 - np.exp(-x * 40))) / SR) * np.exp(-x * 30) * 0.4
def s_chime():
    x = tt(2.0); return sum(np.sin(2 * np.pi * f * x) * np.exp(-x * dd) * a for f, dd, a in [(1047, 2, .3), (1319, 2.5, .25), (1568, 3, .2), (2093, 4, .15)]) * 0.6
def s_boom():
    x = tt(2.5); return (np.sin(2 * np.pi * np.cumsum(32 + 50 * np.exp(-x * 6)) / SR) * np.exp(-x * 1.6) + norm(bp(rs.standard_normal(len(x)), 40, 600)) * np.exp(-x * 4) * 0.4) * 0.8

GEN = dict(whoosh=s_whoosh, rumble=s_rumble, fall=s_fall, rewind=s_rewind, hyd=s_hyd, clunk=s_clunk, click=s_click, hiss=s_hiss, clang=s_clang,
           lock=s_lock, tap=s_tap, bump=s_bump, turn=s_turn, idle=s_idle, fan=s_fan, rain=s_rain, flow=s_flow, reveal=s_reveal, pop=s_pop, chime=s_chime, boom=s_boom)
GAIN = dict(whoosh=0.6, hyd=0.9, rain=0.9, idle=0.8, chime=0.8, tap=0.9)
sfx = np.zeros(N)
for c in CUES:
    fn = GEN[c["k"]]; sig = fn(c["d"]) if "d" in c else fn()
    add(sfx, sig, c["t"], GAIN.get(c["k"], 1.0))
# underground ambience bed (subtle room tone) in the mechanical scenes
amb = bp(rs.standard_normal(N), 40, 300); amb = norm(amb) * 0.05
mask = ((t_all > T["s2"]) & (t_all < T["s10"])).astype(float)
mask = np.convolve(mask, np.ones(SR) / SR, mode="same")
sfx += amb * mask

sfx *= 1 - 0.35 * np.clip(venv / 0.03, 0, 1)
mix_m = music * 0.22 + sfx * 0.5
voice_c = voice * 1.0
# light stereo: voice centre, music/sfx slightly widened
d = int(0.012 * SR)
L = voice_c + mix_m; R = voice_c + np.concatenate([np.zeros(d), mix_m[:-d]])
st = np.stack([L, R], 1)
st = np.tanh(st * 1.15) / np.tanh(1.15)
st *= 0.97 / np.abs(st).max()
with wave.open(os.path.join(B, "mix.wav"), "wb") as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((st * 32767).astype(np.int16).tobytes())
print("mix", round(DUR, 3), "s; peak", float(np.abs(st).max()))
