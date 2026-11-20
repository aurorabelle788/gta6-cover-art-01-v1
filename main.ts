// Entry builder for gta6-cover-art-01: copies app/ and screenshots/ beside
// this file into the output directory and writes dossier.json for them.
// Node 22, standard library only. Deterministic: the same inputs write
// the same dossier.json bytes on every run.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const here = fileURLToPath(new URL('.', import.meta.url));

mkdirSync(out, { recursive: true });
cpSync(`${here}app`, `${out}/app`, { recursive: true });
cpSync(`${here}screenshots`, `${out}/screenshots`, { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(`${out}/dossier.json`, dossier);
