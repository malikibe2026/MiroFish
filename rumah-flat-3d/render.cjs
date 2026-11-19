// Renders public/index.html frame by frame and pipes JPEGs into ffmpeg.
// Usage: node render.cjs [out.mp4] [frames...]  (with frames listed, saves PNG previews instead)
const http = require('http'), fs = require('fs'), path = require('path'), {spawn} = require('child_process');
const {chromium} = require('playwright');
const ROOT = path.join(__dirname, 'public');
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png'};
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForFunction('window.ready === true', null, {timeout: 60000});
  await page.evaluate('document.fonts.ready');
  const out = process.argv[2] || 'out/rumah-flat-3d.mp4';
  const previews = process.argv.slice(3).map(Number);
  if (previews.length) {
    for (const f of previews) { await page.evaluate(`setFrame(${f})`); await page.screenshot({path: `out/preview-${f}.png`}); }
  } else {
    const N = 26 * 30;
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-i', 'public/music.wav',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-shortest', out], {stdio: ['pipe', 'inherit', 'inherit']});
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      await page.evaluate(`setFrame(${i})`);
      const buf = await page.screenshot({type: 'jpeg', quality: 92});
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log(`frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    console.log('done', out);
  }
  await browser.close(); server.close();
})();
