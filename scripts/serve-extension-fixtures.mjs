import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const types = {
  '.html': 'text/html;charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/strict') {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data: blob:; script-src 'none'; frame-src 'self'",
      );
    }
    try {
      let filename;
      if (url.pathname.startsWith('/review/')) {
        const reviewRoot = path.resolve('extension-artifacts/review');
        filename = path.resolve(
          reviewRoot,
          '.' + decodeURIComponent(url.pathname.slice('/review'.length)),
        );
        if (!filename.startsWith(reviewRoot + path.sep)) throw Error();
      } else if (url.pathname === '/positioned') filename = path.resolve('extension-tests/positioned.html');
      else if (['/fixture', '/strict'].includes(url.pathname))
        filename = path.resolve('extension-tests/fixture.html');
      else {
        filename = path.resolve(
          'build',
          url.pathname === '/'
            ? 'index.html'
            : '.' + decodeURIComponent(url.pathname),
        );
        if (!filename.startsWith(path.resolve('build') + path.sep))
          throw Error();
        try {
          await fs.access(filename);
        } catch {
          filename = path.resolve('build/index.html');
        }
      }
      const data = await fs.readFile(filename);
      res.setHeader(
        'Content-Type',
        types[path.extname(filename)] || 'application/octet-stream',
      );
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  })
  .listen(4176, '127.0.0.1', () =>
    console.log('Extension fixtures: http://127.0.0.1:4176'),
  );
