// Tiny dependency-free HTML reader for MediaWiki `action=parse` output.
// parseHTML(html) -> tree; tokens(tree) -> flat, in-order list of heading / text / image blocks.
// It is deliberately small: MediaWiki emits clean, well-formed HTML, so no browser-grade error recovery is needed.

const VOID = new Set(['img', 'br', 'hr', 'meta', 'link', 'input', 'wbr', 'source', 'col']);
const BLOCK = new Set(['div', 'p', 'li', 'ul', 'ol', 'dl', 'dt', 'dd', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'caption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'figure', 'figcaption', 'blockquote', 'center', 'pre', 'hr']);
const CLOSES = { li: ['li'], tr: ['td', 'th', 'tr'], td: ['td', 'th'], th: ['td', 'th'], p: ['p'], dt: ['dt', 'dd'], dd: ['dt', 'dd'] };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', times: '×', rarr: '→', larr: '←' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1); return Number.isFinite(n) ? String.fromCodePoint(n) : m }
  return ENT[e.toLowerCase()] ?? m;
});

export function parseHTML(html) {
  html = String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const root = { tag: '#root', attrs: {}, children: [], parent: null }, stack = [root];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)|</g;
  let m;
  while ((m = re.exec(html))) {
    if (m[5] !== undefined) { stack[stack.length - 1].children.push({ text: decode(m[5]) }); continue }
    if (!m[2]) { stack[stack.length - 1].children.push({ text: '<' }); continue }
    const tag = m[2].toLowerCase();
    if (m[1]) { // closing tag: pop to the nearest matching open element (ignore stray closers)
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break }
      continue;
    }
    const attrs = {}; String(m[3] || '').replace(/([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g, (_, k, a, b, c) => { attrs[k.toLowerCase()] = decode(a ?? b ?? c ?? '') });
    const closers = CLOSES[tag];
    if (closers) while (stack.length > 1 && closers.includes(stack[stack.length - 1].tag)) stack.pop();
    const node = { tag, attrs, children: [], parent: stack[stack.length - 1] };
    node.parent.children.push(node);
    if (!VOID.has(tag) && !m[4]) stack.push(node);
  }
  return root;
}

export const hasClass = (n, c) => !!n.attrs && (' ' + (n.attrs.class || '') + ' ').includes(' ' + c + ' ');
export function walk(n, fn) { if (fn(n) === false) return; for (const c of n.children || []) walk(c, fn) }
export const findAll = (n, pred) => { const out = []; walk(n, x => { if (x.tag && pred(x)) out.push(x) }); return out };
export const find = (n, pred) => findAll(n, pred)[0] || null;
export const textOf = n => n.text !== undefined ? n.text : (n.children || []).map(textOf).join('');
export const clean = s => String(s).replace(/[\s\u00a0]+/g, ' ').trim();

// Flat token stream in document order. Each token is one of:
//   { k:'h', id, level, text }                         a heading (h2-h4)
//   { k:'t', t, imgs:[{alt,src}], links:[{title,href,text}], tbl }   one visual line of text (block boundary or <br> ends a line)
//   { k:'i', imgs:[{alt,src}], tbl }                   a line that holds only images (an icon on its own)
// `tbl` is true when the token sits inside a table. Edit-section links, references, TOC and styles are dropped.
export function tokens(root) {
  const out = []; let cur = null, tbl = 0;
  const fresh = () => ({ t: '', imgs: [], links: [] });
  const flush = () => {
    if (!cur) return;
    const t = clean(cur.t);
    if (t) out.push({ k: 't', t, imgs: cur.imgs, links: cur.links, tbl: tbl > 0 });
    else if (cur.imgs.length) out.push({ k: 'i', imgs: cur.imgs, tbl: tbl > 0 });
    cur = null;
  };
  const skip = n => hasClass(n, 'mw-editsection') || hasClass(n, 'reference') || hasClass(n, 'toc') || n.attrs.id === 'toc' || n.attrs.id === 'catlinks'
    || (n.attrs.style && /display:\s*none/i.test(n.attrs.style));
  const go = n => {
    if (n.text !== undefined) { (cur ||= fresh()).t += n.text; return }
    if (skip(n)) return;
    const tag = n.tag;
    if (/^h[2-4]$/.test(tag)) {
      flush();
      const id = n.attrs.id || (find(n, x => x.attrs.id) || { attrs: {} }).attrs.id || '';
      out.push({ k: 'h', id, level: +tag[1], text: clean(textOf(n)) }); return;
    }
    if (tag === 'br') { flush(); return }
    if (tag === 'img') { (cur ||= fresh()).imgs.push({ alt: n.attrs.alt || '', src: n.attrs.src || '' }); return }
    const blk = BLOCK.has(tag), isTbl = tag === 'table';
    if (blk) flush();
    if (isTbl) tbl++;
    if (tag === 'a') { const l = { title: n.attrs.title || '', href: n.attrs.href || '', text: clean(textOf(n)) }; (cur ||= fresh()).links.push(l) }
    for (const c of n.children) go(c);
    if (blk) flush();
    if (isTbl) tbl--;
  };
  go(root); flush();
  return out;
}

// the tokens that sit under heading `id` (up to the next heading whose id is in `stopIds`, or any heading at the same or a higher level when stopIds is omitted)
export function section(toks, id, stopIds) {
  const a = toks.findIndex(t => t.k === 'h' && t.id === id); if (a < 0) return [];
  const lvl = toks[a].level; let b = toks.length;
  for (let i = a + 1; i < toks.length; i++) {
    const t = toks[i]; if (t.k !== 'h') continue;
    if (stopIds ? stopIds.includes(t.id) : t.level <= lvl) { b = i; break }
  }
  return toks.slice(a + 1, b);
}
