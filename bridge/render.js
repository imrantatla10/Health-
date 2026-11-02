// usage: node render.js preview t1,t2,...   |  node render.js video [startFrame endFrame out.mp4]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const B = path.join(__dirname, 'build');
(async () => {
  const mode = process.argv[2] || 'preview';
  const tl = JSON.parse(fs.readFileSync(path.join(B, 'timeline.json')));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', e => { console.error('PAGEERR', e.message); process.exit(1); });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('CONSOLE', m.text()); });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  await page.evaluate(() => Promise.all(["900 80px 'Inter Display'", "800 40px 'Inter Display'", "700 22px 'Inter Display'", "600 30px 'Inter Display'"].map(f => document.fonts.load(f))));
  const info = await page.evaluate(tl => setup(tl), tl);
  fs.writeFileSync(path.join(B, 'cues.json'), JSON.stringify(info, null, 1));
  const grab = async t => Buffer.from((await page.evaluate(t => { render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.94); }, t)).split(',')[1], 'base64');
  if (mode === 'preview') {
    const ts = (process.argv[3] || '1').split(',').map(Number);
    fs.mkdirSync(path.join(B, 'preview'), { recursive: true });
    for (const t of ts) { const t0 = Date.now(); fs.writeFileSync(path.join(B, 'preview', `f_${t.toFixed(2)}.jpg`), await grab(t)); console.log('frame', t, Date.now() - t0, 'ms'); }
  } else {
    const fps = 30, n = Math.round(tl.dur * fps);
    const f0 = +(process.argv[3] || 0), f1 = +(process.argv[4] || n), outf = process.argv[5] || path.join(B, 'video_silent.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', outf], { stdio: ['pipe', 'inherit', 'inherit'] });
    const st = Date.now();
    for (let i = f0; i < f1; i++) {
      const buf = await grab(i / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((i - f0) % 60 === 0) console.log(path.basename(outf), 'frame', i, '/', f1, ((Date.now() - st) / 1000 / Math.max(1, i - f0 + 1)).toFixed(2), 's/f');
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
