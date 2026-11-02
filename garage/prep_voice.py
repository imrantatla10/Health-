"""Fit the ElevenLabs narration (take 2) to exactly 70.000 s.

Pitch-preserving tempo change (ffmpeg atempo), small lead-in, tail for the end card.
Writes build/voice.wav (48 kHz mono) and build/timeline.json (remapped word times).
"""
import json, os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(ROOT, "build"); os.makedirs(B, exist_ok=True)
SR, DUR, LEAD, TAIL = 48000, 70.0, 0.25, 1.55

words = json.load(open(os.path.join(ROOT, "words_raw.json")))["words"]
words = [w for w in words if w.get("type", "word") == "word"]
# script spelling for captions (transcriber heard "did")
for w in words:
    if w["text"] == "did": w["text"] = "dig"
s0, s1 = words[0]["start"] - 0.06, words[-1]["end"] + 0.12
tempo = (s1 - s0) / (DUR - LEAD - TAIL)

raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", os.path.join(ROOT, "audio", "take2.mp3"),
                      "-af", f"atrim={s0}:{s1},asetpts=PTS-STARTPTS,atempo={tempo:.6f}",
                      "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
a = np.frombuffer(raw, np.float32)
n = int(DUR * SR)
out = np.zeros(n, np.float32)
i0 = int(LEAD * SR); seg = a[: n - i0]
out[i0:i0 + len(seg)] = seg
# short fade on edges
f = int(0.01 * SR); out[i0:i0 + f] *= np.linspace(0, 1, f)
with wave.open(os.path.join(B, "voice.wav"), "wb") as wv:
    wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR)
    wv.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())

m = lambda t: round(LEAD + (t - s0) / tempo, 3)
tl = {"dur": DUR, "tempo": tempo, "words": [{"w": w["text"], "s": m(w["start"]), "e": m(w["end"])} for w in words]}
json.dump(tl, open(os.path.join(B, "timeline.json"), "w"), indent=1)
print(f"tempo {tempo:.4f}  speech ends {m(words[-1]['end'])}  samples {len(seg)/SR:.2f}s")
