"""Insert dramatic pauses into the ElevenLabs voiceover and remap word timings.

Output: build/voice.wav (48 kHz mono) and build/timeline.json
"""
import json, os, re, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(ROOT, "..", "build")
os.makedirs(BUILD, exist_ok=True)
SR = 48000
LEAD = 0.25            # small lead-in before the first word
TAIL = 3.0             # hold for the final title card
# (cut after word, pause seconds)
PAUSES = [("days?", 0.6), ("remove.", 1.2), ("CAVITIES...", 0.6),
          ("DAMAGE...", 0.6), ("LOSS.", 0.8), ("pain.", 0.8)]

raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i",
                      os.path.join(ROOT, "..", "audio", "take1.mp3"),
                      "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
a = np.frombuffer(raw, dtype=np.float32).copy()

words = [w for w in json.load(open(os.path.join(ROOT, "words_raw.json")))["words"]
         if w.get("type", "word") == "word" and not w["text"].startswith("[")
         and not w["text"].endswith("]")]


def quietest(t0, t1):
    """time of quietest 20 ms window between t0 and t1"""
    i0, i1 = int(t0 * SR), int(t1 * SR)
    win = int(0.02 * SR)
    best, bt = 1e9, (t0 + t1) / 2
    for i in range(i0, max(i0 + 1, i1 - win), win // 2):
        e = float(np.mean(a[i:i + win] ** 2))
        if e < best:
            best, bt = e, (i + win / 2) / SR
    return bt


cuts = []
for key, dur in PAUSES:
    idx = next(i for i, w in enumerate(words) if w["text"] == key)
    t0 = words[idx]["end"] - 0.45
    t1 = words[idx + 1]["start"] + 0.25 if idx + 1 < len(words) else t0 + 0.6
    cuts.append((quietest(t0, max(t1, t0 + 0.06)), dur))
cuts.sort()

# assemble
pieces, prev = [np.zeros(int(LEAD * SR), np.float32)], 0
for ct, dur in cuts:
    ci = int(ct * SR)
    pieces += [a[prev:ci], np.zeros(int(dur * SR), np.float32)]
    prev = ci
pieces += [a[prev:], np.zeros(int(TAIL * SR), np.float32)]
out = np.concatenate(pieces)


def remap(t):
    return LEAD + t + sum(d for c, d in cuts if c <= t)


tl = {"dur": round(len(out) / SR, 3),
      "words": [{"w": w["text"], "s": round(remap(w["start"]), 3),
                 "e": round(remap(w["end"]), 3)} for w in words]}
json.dump(tl, open(os.path.join(BUILD, "timeline.json"), "w"), indent=1)

import wave
with wave.open(os.path.join(BUILD, "voice.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print("duration", tl["dur"], "cuts", [(round(c, 2), d) for c, d in cuts])
