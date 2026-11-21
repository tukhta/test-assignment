const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const startedAt = process.hrtime.bigint();
    let bytes = 0;

    const request = client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        resolve(download(new URL(response.headers.location, url).href));
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Сервер ответил кодом ${response.statusCode}`));
        return;
      }

      response.on('data', (chunk) => { bytes += chunk.length; });
      response.on('end', () => {
        const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
        resolve({ bytes, seconds });
      });
      response.on('error', reject);
    });

    request.setTimeout(30000, () => request.destroy(new Error('Истекло время ожидания')));
    request.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/measure') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const { url } = JSON.parse(body);
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Нужна ссылка http или https');

        const results = [];
        const totalStartedAt = process.hrtime.bigint();
        for (let i = 0; i < 10; i += 1) {
          results.push(await download(parsedUrl.href));
        }
        const totalBytes = results.reduce((sum, result) => sum + result.bytes, 0);
        const totalSeconds = Number(process.hrtime.bigint() - totalStartedAt) / 1e9;
        const averageSeconds = results.reduce((sum, result) => sum + result.seconds, 0) / results.length;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ totalBytes, averageSeconds, speedMbps: totalBytes * 8 / totalSeconds / 1e6 }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  const requestedFile = req.url === '/' ? 'index.html' : req.url.slice(1);
  const filePath = path.join(PUBLIC_DIR, requestedFile);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404).end('Not found');
      return;
    }
    const contentType = filePath.endsWith('.css') ? 'text/css' :
      filePath.endsWith('.js') ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` });
    res.end(content);
  });
});

server.listen(PORT, () => console.log(`Открой http://localhost:${PORT}`));
