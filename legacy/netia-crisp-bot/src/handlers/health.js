import { readFileSync } from 'fs';
import { join } from 'path';

const pkg = (() => {
  try {
    const p = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    return JSON.parse(p);
  } catch {
    return { version: '0.0.0' };
  }
})();

export function healthHandler(req, res) {
  res.json({ ok: true, uptime: process.uptime(), version: pkg.version });
}


