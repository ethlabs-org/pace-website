// Rehype plugin: glossary tooltips and standard links.
//
// - Every "EIP-1234" / "ERC-1234" in prose becomes a link to its official page (STANDARD_URLS overrides the
//   default eips.ethereum.org URL) and carries the glossary definition as a tooltip when one exists.
// - The first mention of a glossary term on the page becomes <abbr class="t" data-tip="...">, and at most
//   MAX_PER_BLOCK terms are marked in any one paragraph or list item. Both limits matter: a page that marks
//   every first mention per section ends up with ten dotted underlines in one paragraph of definitions.
// Text inside links, code, headings, badges, existing abbr tags and anything with data-noterms is skipped.
import { visit, SKIP as SKIP_TREE } from 'unist-util-visit';
import { GLOSSARY, STANDARD_URLS } from '../src/glossary.mjs';

const SKIP = new Set(['a', 'code', 'pre', 'abbr', 'h1', 'h2', 'h3', 'h4', 'script', 'style', 'kbd', 'figcaption', 'summary']);
const SKIP_COMPONENTS = new Set(['Badge', 'Card', 'Cards', 'Link', 'Hero', 'Timeline', 'Bars', 'Players']);
// `:badge[Live]{success}` reaches this plugin as a directive node, not as an element or an MDX component, so it
// needs its own skip. Without it a badge gets a dotted term inside it.
const SKIP_DIRECTIVES = new Set(['badge']);
const BLOCKS = new Set(['p', 'li', 'td', 'th', 'blockquote', 'dd', 'dt']);
const MAX_PER_BLOCK = 3;

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Glossary index: alias -> entry. Longest aliases first so "policy manager" wins over "policy".
const ENTRIES = Object.entries(GLOSSARY).map(([key, e]) => ({ key, ...e }));
const ALIASES = [];
for (const e of ENTRIES) for (const a of [e.term, ...(e.aliases || [])]) ALIASES.push({ alias: a, entry: e });
ALIASES.sort((x, y) => y.alias.length - x.alias.length);
const termRe = new RegExp('(' + ALIASES.map(a => '(?<![\\w-])' + escapeRe(a.alias) + '(?![\\w-])').join('|') + ')', 'g');
const stdRe = /\b(EIP|ERC)-(\d{4})\b/g;
const byAlias = new Map(ALIASES.map(a => [a.alias, a.entry]));

const text = (value) => ({ type: 'text', value });
const abbr = (value, tip, extra = {}) => ({ type: 'element', tagName: 'abbr', properties: { className: ['t'], tabIndex: 0, 'data-tip': tip, ...extra }, children: [text(value)] });
const link = (value, href, tip) => ({ type: 'element', tagName: 'a', properties: { href, className: ['std'], target: '_blank', rel: 'noreferrer', ...(tip ? { 'data-tip': tip, tabIndex: 0 } : {}) }, children: [text(value)] });

function stdUrl(kind, num) { return STANDARD_URLS[`${kind}-${num}`] || `https://eips.ethereum.org/EIPS/eip-${num}`; }

function hasNoterms(node) {
  if (node.type === 'element') return !!node.properties && 'dataNoterms' in node.properties;
  if (node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') {
    return (node.attributes || []).some(a => a.type === 'mdxJsxAttribute' && a.name === 'data-noterms');
  }
  return false;
}

function isSkipped(parent) {
  if (!parent) return true;
  if (parent.type === 'element') {
    if (SKIP.has(parent.tagName)) return true;
    const p = parent.properties;
    if (p && ('dataVBadge' in p || 'data-v-badge' in p)) return true;
    return hasNoterms(parent);
  }
  // MDX components: leave badges, cards and tab titles alone, so a link is never nested inside a link.
  if (parent.type === 'mdxJsxTextElement' || parent.type === 'mdxJsxFlowElement') {
    if (SKIP_COMPONENTS.has(parent.name)) return true;
    return hasNoterms(parent);
  }
  if (parent.type === 'textDirective' || parent.type === 'leafDirective' || parent.type === 'containerDirective') {
    return SKIP_DIRECTIVES.has(parent.name);
  }
  return false;
}

export default function rehypeTerms() {
  return (tree) => {
    const seen = new Set();  // one set per page, so a term is marked once and not once per section
    let inBlock = 0;         // terms already marked in the paragraph or list item being walked
    // data-noterms mutes everything under the element that carries it. isSkipped only sees a text node's direct
    // parent, and in MDX the text under a marked <div> sits in a paragraph, so the marked element is further up.
    const muted = new Set();
    visit(tree, (node) => {
      if (!hasNoterms(node)) return;
      visit(node, (n) => { muted.add(n); });
      return SKIP_TREE;
    });
    visit(tree, (node, index, parent) => {
      if (node.type === 'element' && BLOCKS.has(node.tagName)) { inBlock = 0; return; }
      if (node.type !== 'text' || !parent || index == null) return;
      if (muted.has(parent) || isSkipped(parent)) return;
      const out = [];
      let last = 0;
      const src = node.value;
      // Pass 1: standards. Pass 2 (inside the gaps): glossary terms.
      const pushProse = (chunk) => {
        let l = 0; let m;
        termRe.lastIndex = 0;
        while ((m = termRe.exec(chunk))) {
          if (inBlock >= MAX_PER_BLOCK) break;
          const entry = byAlias.get(m[0]);
          if (!entry || seen.has(entry.key)) continue;
          seen.add(entry.key);
          inBlock++;
          if (m.index > l) out.push(text(chunk.slice(l, m.index)));
          out.push(abbr(m[0], entry.def));
          l = m.index + m[0].length;
        }
        if (l < chunk.length) out.push(text(chunk.slice(l)));
      };
      let m;
      stdRe.lastIndex = 0;
      while ((m = stdRe.exec(src))) {
        if (m.index > last) pushProse(src.slice(last, m.index));
        const id = `${m[1]}-${m[2]}`;
        const entry = GLOSSARY[id];
        out.push(link(m[0], stdUrl(m[1], m[2]), entry ? entry.def : undefined));
        last = m.index + m[0].length;
      }
      if (last === 0 && out.length === 0) { pushProse(src); }
      else if (last < src.length) pushProse(src.slice(last));
      if (out.length === 1 && out[0].type === 'text') return;
      parent.children.splice(index, 1, ...out);
      return index + out.length;
    });
  };
}
