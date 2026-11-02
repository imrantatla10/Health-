"""Place the ElevenLabs narration (take 1, Dan, eleven_v4) on a 68.000 s timeline.

Natural tempo (1.00x): speech is 65.0 s, so no stretching is needed. Small lead-in, tail for the end card.
Writes build/voice.wav (48 kHz mono) and build/timeline.json (word times from ElevenLabs Scribe)."""
import json, os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(ROOT, "build"); os.makedirs(B, exist_ok=True)
SR, DUR, LEAD, TEMPO = 48000, 68.0, 0.35, 1.0

words = json.load(open(os.path.join(ROOT, "words_raw.json")))["words"]
words = [w for w in words if w.get("type", "word") == "word" and not w["text"].startswith("[")]
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", os.path.join(ROOT, "audio", "take1.mp3"),
                      "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
a = np.frombuffer(raw, np.float32)
n = int(DUR * SR); out = np.zeros(n, np.float32)
i0 = int(LEAD * SR); seg = a[: n - i0]; out[i0:i0 + len(seg)] = seg
f = int(0.01 * SR); out[i0:i0 + f] *= np.linspace(0, 1, f)
with wave.open(os.path.join(B, "voice.wav"), "wb") as wv:
    wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR)
    wv.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
m = lambda t: round(LEAD + t / TEMPO, 3)
tl = {"dur": DUR, "tempo": TEMPO, "words": [{"w": w["text"], "s": m(w["start"]), "e": m(w["end"])} for w in words]}
json.dump(tl, open(os.path.join(B, "timeline.json"), "w"), indent=1)
print(f"words {len(words)}  speech ends {m(words[-1]['end'])}  audio {len(seg)/SR:.2f}s")
