// Copies the demo (the no-build entry, index.html, the demo.html that forwards to it, and their sources) into
// public/demo so the site can link to it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const out = path.resolve(here, '../public/demo');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'demo.html']) fs.copyFileSync(path.join(root, f), path.join(out, f));
fs.cpSync(path.join(root, 'src'), path.join(out, 'src'), { recursive: true });
console.log('demo copied to', out);
