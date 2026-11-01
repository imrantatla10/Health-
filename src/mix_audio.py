"""Procedural music bed + sound effects, mixed under the ElevenLabs voiceover.
Reads build/voice.wav and build/cues.json (SFX times exported by the animation)."""
import json, os, wave
import numpy as np

B = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "build")
SR = 48000
with wave.open(os.path.join(B, "voice.wav")) as f:
    voice = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32) / 32768
N = len(voice); DUR = N / SR
cues = json.load(open(os.path.join(B, "cues.json")))
T = cues["T"]
t = np.arange(N) / SR
rs = np.random.default_rng(1)


def env(n, a, d):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    return e * np.exp(-np.arange(n) / SR / d)


def add(buf, sig, at, g=1.0):
    i = int(at * SR)
    if i >= len(buf): return
    sig = sig[: len(buf) - max(i, 0)]
    if i < 0: sig, i = sig[-i:], 0
    buf[i:i + len(sig)] += sig * g


def note(f): return 440 * 2 ** ((f - 69) / 12)


def saw_soft(freq, n, det=0.006):
    tt = np.arange(n) / SR; s = 0
    for k in range(1, 7):
        s = s + np.sin(2 * np.pi * freq * k * tt) / k + np.sin(2 * np.pi * freq * (1 + det) * k * tt) / k
    return s / 4


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y


def lp_fast(x, fc):  # one-pole via FFT approximation (fast)
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (fr / fc) ** 4), len(x))


music = np.zeros(N)
bpm = 100; beat = 60 / bpm
s6, s8 = T["s6"], T["s8"]

def kick(g=1):
    n = int(0.35 * SR); tt = np.arange(n) / SR
    f = 50 + 90 * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * g

def hat():
    n = int(0.05 * SR); return np.diff(rs.standard_normal(n + 1)) * np.exp(-np.arange(n) / SR * 90) * 0.25

def pluck(fr, d=0.35):
    n = int(d * 2.5 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * fr * tt) + 0.4 * np.sin(4 * np.pi * fr * tt)) * np.exp(-tt / d * 2.2)

# Section A: curious pulse (A minor) 0 -> s6
prog = [(57, [69, 72, 76]), (53, [69, 72, 77]), (48, [67, 72, 76]), (55, [67, 71, 74])]
x = 0.2; bar = 0
while x < s6 - 0.1:
    root, ch = prog[bar % 4]
    n = int(beat * 4 * SR); seg = saw_soft(note(root - 12), n) * env(n, 0.02, 1.6) * 0.35
    add(music, lp_fast(seg, 500), x)
    for b in range(4):
        tb = x + b * beat
        if tb > s6 - 0.1: break
        add(music, kick(0.55), tb)
        add(music, hat(), tb + beat / 2, 0.6)
        for j in range(2):
            add(music, pluck(note(ch[(b * 2 + j) % 3] + 12), 0.25), tb + j * beat / 2, 0.12)
    x += beat * 4; bar += 1
# Section B: dark drone + heartbeat s6 -> s8
n = int((s8 - s6) * SR)
dr = saw_soft(note(33), n, 0.01) * 0.5 + saw_soft(note(40), n, 0.008) * 0.25
dr = lp_fast(dr, 260) * np.minimum(1, np.arange(n) / SR / 1.5) * np.minimum(1, (n - np.arange(n)) / SR / 0.8)
add(music, dr * 0.9, s6)
hb = s6 + 1.8
while hb < s8 - 0.6:
    add(music, kick(0.8), hb); add(music, kick(0.5), hb + 0.22); hb += 0.95
# riser into Day 30 boom
n = int(1.6 * SR); rz = rs.standard_normal(n) * np.linspace(0, 1, n) ** 2
add(music, lp_fast(rz, 3000) * 0.25, T["pop"]["d30"] - 1.6)
# Section C: uplifting (C major) s8 -> end
prog2 = [(48, [72, 76, 79]), (55, [71, 74, 79]), (57, [72, 76, 81]), (53, [72, 77, 81])]
x = s8 + 0.05; bar = 0
while x < DUR - 0.2:
    root, ch = prog2[bar % 4]
    n = int(beat * 4 * SR); pad = sum(saw_soft(note(m), n) for m in ch) / 3
    add(music, lp_fast(pad, 1400) * env(n, 0.25, 4.0) * 0.28, x)
    add(music, lp_fast(saw_soft(note(root - 12), n), 400) * env(n, 0.02, 2) * 0.35, x)
    for b in range(4):
        tb = x + b * beat
        if tb > DUR - 0.3: break
        add(music, kick(0.6), tb); add(music, hat(), tb + beat / 2, 0.7)
        for j in range(4):
            add(music, pluck(note(ch[(b + j) % 3] + 12), 0.2), tb + j * beat / 4, 0.09)
    x += beat * 4; bar += 1

# sidechain duck under voice
venv = np.convolve(np.abs(voice), np.ones(int(0.12 * SR)) / int(0.12 * SR), mode="same")
duck = 1 - 0.45 * np.clip(venv / 0.04, 0, 1)
music *= duck
music *= np.minimum(1, t / 0.4) * np.minimum(1, (DUR - t) / 1.2)

# ---- SFX ----
sfx = np.zeros(N)
def s_whoosh():
    n = int(0.45 * SR); nz = rs.standard_normal(n); tt = np.arange(n) / SR
    X = np.fft.rfft(nz); fr = np.fft.rfftfreq(n, 1 / SR)
    y = np.fft.irfft(X * np.exp(-((fr - 1800) / 1500) ** 2), n)
    return y / np.abs(y).max() * np.sin(np.pi * tt / 0.45) ** 2 * 0.5
def s_pop():
    n = int(0.12 * SR); tt = np.arange(n) / SR; f = 500 + 900 * (1 - np.exp(-tt * 40))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 35) * 0.55
def s_hit():
    n = int(0.9 * SR); tt = np.arange(n) / SR
    low = np.sin(2 * np.pi * np.cumsum(40 + 80 * np.exp(-tt * 18)) / SR) * np.exp(-tt * 4)
    cr = rs.standard_normal(n) * np.exp(-tt * 30) * 0.4
    return (low + cr) * 0.8
def s_boom():
    n = int(2.0 * SR); tt = np.arange(n) / SR
    low = np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-tt * 10)) / SR) * np.exp(-tt * 1.8)
    return (low + lp_fast(rs.standard_normal(n), 900) * np.exp(-tt * 6) * 0.6) * 0.95
def s_tick():
    n = int(0.03 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * 2200 * tt) * np.exp(-tt * 200) * 0.35
def s_chime():
    n = int(1.4 * SR); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) * a for f, d, a in [(1568, 3, .3), (2093, 4, .25), (3136, 6, .15), (4186, 8, .1)]) * 0.6
def s_freeze():
    n = int(0.6 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 3000 * tt) * 0.2 + np.diff(rs.standard_normal(n + 1)) * 0.2) * np.exp(-tt * 8) + s_hit()[:n] * 0.5
def s_boing():
    n = int(0.5 * SR); tt = np.arange(n) / SR; f = 250 + 120 * np.sin(2 * np.pi * 9 * tt) * np.exp(-tt * 4)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 6) * 0.4
GEN = dict(whoosh=s_whoosh, pop=s_pop, hit=s_hit, boom=s_boom, tick=s_tick, chime=s_chime, freeze=s_freeze, boing=s_boing)
for c in cues["SFX"]:
    add(sfx, GEN[c["k"]](), c["t"])

mix = voice * 1.0 + music * 0.16 + sfx * 0.32
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
with wave.open(os.path.join(B, "mix.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
print("mixed", DUR, "peak", float(np.abs(mix).max()))
