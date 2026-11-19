import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { readSiteOrigin } from '../server/config/site.ts';
// Vercel and the local production adapter return this document with HTTP 404.
await copyFile(
  new URL('../dist/wow-forever-addons/browser/404/index.html', import.meta.url),
  new URL('../dist/wow-forever-addons/browser/404.html', import.meta.url),
);
const origin = readSiteOrigin(process.env.PUBLIC_SITE_URL);
if (origin) {
  const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8');
  await writeFile(
    new URL('../dist/wow-forever-addons/browser/robots.txt', import.meta.url),
    `${robots}\nSitemap: ${origin}/sitemap.xml\n`,
  );
}
