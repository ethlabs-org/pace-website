// Compiles docs pages the way vocs parses them (MDX with frontmatter, GFM and ::: directives) and lists every heading's
// anchor, so a page can be checked without a full build. Usage: node scripts/check-mdx.mjs src/pages/docs/<page>.mdx ...
import fs from 'node:fs';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import GithubSlugger from 'github-slugger';

let failed = false;
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  try {
    await compile(src, { remarkPlugins: [remarkFrontmatter, remarkGfm, remarkDirective] });
  } catch (e) {
    failed = true;
    console.log(`✗ ${file}: ${e.message}${e.line ? ` (line ${e.line})` : ''}`);
    continue;
  }
  // Anchors as vocs makes them: github-slugger over each heading's text, the h1 without its [lead], outside code fences.
  const slugger = new GithubSlugger();
  const body = src.replace(/^---[\s\S]*?\n---\n/, '').replace(/^```[\s\S]*?^```/gm, '');
  const ids = [];
  for (const m of body.matchAll(/^(#{1,6}) (.+)$/gm)) {
    const text = m[2].replace(/ \[[^\]]*\]$/, '').replace(/`/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');
    ids.push(`${m[1].length} #${slugger.slug(text)}`);
  }
  console.log(`✓ ${file}\n  ${ids.join('\n  ')}`);
}
process.exit(failed ? 1 : 0);
