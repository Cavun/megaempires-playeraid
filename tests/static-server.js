/*
 * Minimal static file server for the Playwright suite.
 *
 * The player aid is a plain set of static pages, so the tests only need
 * something that serves the repository root over http:// — file:// URLs
 * are not usable here because Chromium treats every file:// document as
 * an opaque origin, which breaks the localStorage persistence tests.
 */
var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var PORT = parseInt(process.env.PORT, 10) || 4173;

var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml'
};

var server = http.createServer(function(req, res) {
  var urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  var filePath = path.join(ROOT, path.normalize(urlPath));
  if (filePath.indexOf(ROOT) !== 0) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, function(err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

server.listen(PORT, function() {
  console.log('Serving ' + ROOT + ' on http://127.0.0.1:' + PORT);
});
