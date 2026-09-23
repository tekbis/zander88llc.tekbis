const fs = require('fs');
const path = require('path');

const TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function assetRoots() {
  const starts = [process.cwd(), __dirname];
  const roots = [];
  starts.forEach(function (start) {
    let dir = start;
    for (let i = 0; i < 6; i += 1) {
      roots.push(path.resolve(dir, 'assets'));
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  });
  return roots;
}

function requestedPath(req) {
  if (req.query && req.query.path != null) {
    const parts = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
    return parts.map(function (part) { return decodeURIComponent(String(part)); }).join('/');
  }
  const raw = req.url || '/';
  const pathname = raw.split('?')[0];
  return decodeURIComponent(pathname)
    .replace(/^\/api\/static-asset\//, '')
    .replace(/^\/assets\//, '');
}

function resolveAsset(rel) {
  const clean = String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean || clean.indexOf('\0') !== -1) return null;
  const roots = assetRoots();
  for (let i = 0; i < roots.length; i += 1) {
    const root = roots[i];
    const file = path.resolve(root, clean);
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

module.exports = function (req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method not allowed');
    return;
  }

  const file = resolveAsset(requestedPath(req));
  if (!file) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not found');
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const data = fs.readFileSync(file);
  res.statusCode = 200;
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Content-Length', String(data.length));
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(data);
};

module.exports.resolveAsset = resolveAsset;
