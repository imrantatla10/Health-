# Reusable prompt — 3D vertical explainer video (Dan voice)

Copy everything between the lines, fill in the TITLE / SCRIPT / NOTES block at the top, and send it.

---

TITLE: [your video title]

SCRIPT:
[paste your narration script here — scene by scene if you have it, or just the full text]

MY NOTES (optional):
[anything specific: characters, setting, must-show moments, tone, length if not 60–75 s]

=== PRODUCTION RULES (apply to every video, do not ask me again) ===

1. OUTPUT
- One finished vertical video: 1080×1920, 9:16, 30 fps, H.264 MP4 with AAC audio, loudness about −14 LUFS.
- Duration: match the narration (default 60–75 s). If I give a target length, hit it exactly by gently adjusting voice tempo (max ±12%) and pauses.
- Save the video in `output/` named after the title, commit and push it to the current branch, and send me the file when done. Keep the file under 95 MB (re-encode if needed).
- Do the whole job end to end without stopping to ask me questions. Only ask if the script is missing.

2. VOICEOVER — ELEVENLABS, ALWAYS "DAN"
- Use ElevenLabs ONLY for the narration audio (and word-timing transcription). Do not use ElevenLabs image/video generation.
- Voice: "Dan" by Dan Akers — voice_id `w3Suj1uMOItyQu3JChfz` (warm, engaging British male, natural RP). Always this voice, never substitute.
- Model: `eleven_v4`. Read the full script in one take so delivery is natural; generate the default 2 takes and pick the one closest to the target length.
- Delivery: friendly, curious, conversational, slightly humorous British storyteller explaining something amazing. Not a news reader. Light audio tags only where they help (e.g. [curious] at the start, [amused] for the punchline).
- Transcribe the chosen take with ElevenLabs Scribe to get word timestamps; use them to sync scene cuts, captions, animations and sound effects. Use my script's spelling for captions if the transcript mishears a word.
- No visible narrator, presenter, avatar, microphone or news desk.

3. VISUAL STYLE — HYBRID 3D + 2D
- Build real 3D scenes (Three.js rendered frame by frame in headless Chromium, like the `garage/` project in this repo — reuse its pipeline: `prep_voice.py`, `render.js` with parallel segments, `mix_audio.py`, overlay helpers, caption system).
- Clean, premium, modern 3D look: PBR materials, soft sun shadows, ACES tone mapping, environment reflections, procedural textures (brick, concrete, grass, metal, glass, skin, fabric), fog for depth, cinematic lighting per mood (day, golden hour, rain, night, interior).
- 3D CHARACTERS: whenever the script involves people, animals or a "hero" object, build stylised 3D characters (rounded, friendly, Pixar-like proportions) with expressive faces (eyes that blink, eyebrows, mouth shapes), simple body animation (walk, point, react, gesture, surprise). Keep each character's look, colours and clothing identical in every scene. Characters never lip-sync as a presenter — the voice is the off-screen narrator; characters act out the story.
- Keep every object consistent across scenes (same house, car, character, machine, colours).
- 2D overlay layer on top of the 3D: elegant technical callouts with leader lines anchored to 3D points, animated arrows/flow chevrons, small inset diagrams, warning chips (red), success chips (green ✓), measurements and labels. Minimal and supportive — never cluttered.
- Captions: bold Inter Display Black, 2–3 words at a time, white with dark outline, key words highlighted yellow, synced word-by-word, positioned around y≈1400.
- Opening hook: big 3-line title (white / yellow / white) over the first establishing shot for ~3–4 s.
- End card: title again plus a short honest line if the topic needs a safety/accuracy disclaimer. Fade to black at the end.

4. CAMERA & DIRECTION
- Every scene follows the script beat that is being spoken; each camera move must explain something.
- Use a varied cinematic shot list: aerial drone establishing shots, slow push-ins, low-angle hero shots, macro close-ups of mechanisms/details, side-on and front cutaway cross-sections (ground/walls made removable or ghosted), overhead "x-ray" shots with surfaces made semi-transparent, smooth tracking shots following motion, wide reveals and a final pull-back.
- Vertical-first framing: subject centred and large, tall compositions, essential content kept out of the top ~200 px and bottom ~350 px (social UI zones).
- Short white flash + whoosh on scene cuts; subtle camera shake on impacts; small humorous moments where the script allows (e.g. a "rewind" gag).
- Never put the camera inside walls/objects — check preview frames for every scene and fix any clipping, blocked views or unreadable close-ups before the final render.

5. SOUND DESIGN
- Procedural cinematic music bed under the voice (curious → tension → resolve, matching the story), ducked under narration.
- Synchronised sound effects for every on-screen action (clicks, mechanical motors, impacts, whooshes, ambience, weather, crowd, nature — whatever the script shows).
- Voice always clearly on top.

6. ACCURACY
- Science/engineering/health content must be correct and not overstated; show safety elements and real-world requirements where relevant. Don't make unsupported claims. No real brand logos, real people or copyrighted characters.

7. QUALITY CHECK BEFORE DELIVERY
- Render preview contact sheets for all scenes, fix problems, then render the full video.
- Verify: exact duration, 1080×1920, audio/caption sync, no black or broken frames, loudness.
- Tell me briefly what was made, which voice take was used, and anything I should double-check.

---
