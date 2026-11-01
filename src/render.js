// usage: node render.js preview t1,t2,...   |  node render.js video
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const BUILD = path.join(__dirname, '..', 'build');
(async () => {
  const mode = process.argv[2] || 'preview';
  const tl = JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline.json')));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('PAGEERR', e.message); process.exit(1); });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.load("900 80px 'Inter Display'"));
  const info = await page.evaluate(tl => { const r = setup(tl); return { T: r.T, SFX: r.SFX }; }, tl);
  fs.writeFileSync(path.join(BUILD, 'cues.json'), JSON.stringify(info, null, 1));
  const grab = async t => Buffer.from((await page.evaluate(t => { render(t); return document.getElementById('c').toDataURL('image/jpeg', 0.93); }, t)).split(',')[1], 'base64');
  if (mode === 'preview') {
    const ts = (process.argv[3] || '1').split(',').map(Number);
    fs.mkdirSync(path.join(BUILD, 'preview'), { recursive: true });
    for (const t of ts) fs.writeFileSync(path.join(BUILD, 'preview', `f_${t.toFixed(2)}.jpg`), await grab(t));
  } else {
    const fps = 30, n = Math.round(tl.dur * fps);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', path.join(BUILD, 'video_silent.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < n; i++) {
      const buf = await grab(i / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log('frame', i, '/', n);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
