import { useLayoutEffect, useMemo, useRef, useState } from 'react';

// The sketch look: the mockup drawn as a working drawing, like the landing page (site/src/components/Sketch.tsx).
// It is the mockup's only look. The class `sketch` is set on <html> in demo.html and index.html, and src/sketch.css
// draws over styles.css under it.
//
// SketchDefs is a hidden SVG with the wobble filters the CSS points at (filter: url(#sk-a)). Each one pushes whatever
// it is applied to around with a low-frequency noise field, so a straight CSS border comes out like a line drawn by
// hand. sk-a and sk-b are the same wobble with different noise, so a frame can carry two strokes that do not coincide.
// sk-line and sk-vline are for thin rules: they only move a line across its own direction (moving pixels along a 1px
// line breaks it into dashes), and their region reaches far past the line's box or the wobble would be clipped.
// sk-c is for small rings and sk-i for icons, where the landing's box wobble would only shift the whole thing.
export function SketchDefs() {
  const wobble = (id, seed, freq, scale, region, axis) => (
    <filter id={id} x={region[0]} y={region[1]} width={region[2]} height={region[3]} colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={1} seed={seed} result="n" />
      <feColorMatrix
        in="n"
        type="matrix"
        values={axis === 'y' ? '0 0 0 0 .5 0 1 0 0 0 0 0 0 0 0 0 0 0 0 1' : axis === 'x' ? '1 0 0 0 0 0 0 0 0 .5 0 0 0 0 0 0 0 0 0 1' : '1 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 1'}
        result="m"
      />
      <feDisplacementMap in="SourceGraphic" in2="m" scale={scale} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
  const box = ['-8%', '-8%', '116%', '116%'];
  return (
    <svg className="sketch-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        {wobble('sk-a', 3, '0.014', 5, box)}
        {wobble('sk-b', 17, '0.018', 5, box)}
        {wobble('sk-line', 8, '0.006', 5, ['-1%', '-700%', '102%', '1500%'], 'y')}
        {wobble('sk-vline', 12, '0.02', 4, ['-700%', '-4%', '1500%', '108%'], 'x')}
        {wobble('sk-c', 5, '0.06', 3, ['-30%', '-30%', '160%', '160%'])}
        {wobble('sk-i', 9, '0.11', 1.6, ['-20%', '-20%', '140%', '140%'])}
      </defs>
    </svg>
  );
}

// A device drawn in pencil: two strokes round its edge (a and b), blue construction guides that run past its corners,
// a centre line that pokes out above and below, and the figure label over its top-left corner: a number, the
// device's name, and a handwritten note on what it is. `screen` adds a third stroke for a phone's screen edge
// ({ inset, radius } in px). It sits inside the element it frames, which must be positioned.
// The strokes are SVG paths with the hand wobble worked into their points (pencilRect), drawn once for each size the
// frame takes. No filter runs, so a frame costs nothing to repaint.
export function SketchFrame({ fig, name, note, radius = 12, screen, axis }) {
  const ref = useRef(null);
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => { const w = el.offsetWidth, h = el.offsetHeight; setSize(s => (s && s[0] === w && s[1] === h ? s : [w, h])); };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [w, h] = size || [0, 0];
  const pad = 6;
  // The frame re-renders with its device on every change in the mockup; the strokes only change with its size.
  const si = screen ? screen.inset : 0, sr = screen ? screen.radius : 0;
  const paths = useMemo(() => (w > 0 ? [
    pencilRect(0, 0, w, h, radius, 3),
    pencilRect(1.5, 1.5, w - 2.5, h - 2.5, radius, 17),
    screen ? pencilRect(si, si, w - si * 2, h - si * 2, sr, 29) : null,
  ] : null), [w, h, radius, !!screen, si, sr]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className="skf" ref={ref} style={{ '--skf-r': radius + 'px' }} aria-hidden="true">
      <i className="skf-g" />
      {axis && <i className="skf-x" />}
      {paths && (
        <svg className="skf-svg" width={w + pad * 2} height={h + pad * 2} viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`}>
          <path className="skf-a" d={paths[0]} />
          <path className="skf-b" d={paths[1]} />
          {paths[2] && <path className="skf-s" d={paths[2]} />}
        </svg>
      )}
      {fig && <span className="skf-cap"><b>Fig. {fig}</b><span>{name}</span>{note && <em>{note}</em>}</span>}
    </span>
  );
}

// A rounded rectangle traced by hand: points every few pixels along its edge, each pushed in or out along the edge's
// normal by a slow wave (two sines with seeded phases), starting at a seeded point and running a little past it, as a
// pencil going round once does.
export function pencilRect(x, y, w, h, r, seed) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const sw = w - 2 * r, sh = h - 2 * r, arc = (Math.PI / 2) * r;
  const L = 2 * sw + 2 * sh + 4 * arc;
  if (!(L > 0)) return '';
  // walk the perimeter clockwise from the top-left corner's end: top, top-right arc, right, bottom-right arc, ...
  const segs = [
    { len: sw, at: t => [x + r + t, y, 0, -1] },
    { len: arc, at: t => { const a = -Math.PI / 2 + t / r; return [x + w - r + r * Math.cos(a), y + r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; } },
    { len: sh, at: t => [x + w, y + r + t, 1, 0] },
    { len: arc, at: t => { const a = t / r; return [x + w - r + r * Math.cos(a), y + h - r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; } },
    { len: sw, at: t => [x + w - r - t, y + h, 0, 1] },
    { len: arc, at: t => { const a = Math.PI / 2 + t / r; return [x + r + r * Math.cos(a), y + h - r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; } },
    { len: sh, at: t => [x, y + h - r - t, -1, 0] },
    { len: arc, at: t => { const a = Math.PI + t / r; return [x + r + r * Math.cos(a), y + r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; } },
  ];
  const point = (d) => {
    d = ((d % L) + L) % L;
    for (const sg of segs) { if (d <= sg.len || sg === segs[segs.length - 1]) return sg.at(Math.min(d, sg.len)); d -= sg.len; }
    return segs[0].at(0);
  };
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const p1 = rnd() * 6.28, p2 = rnd() * 6.28, start = rnd() * L;
  const wave = d => 0.9 * Math.sin((d / 170) * 6.28 + p1) + 0.5 * Math.sin((d / 53) * 6.28 + p2);
  const step = 5, end = L * 1.025;
  let out = '';
  for (let d = 0; d <= end; d += step) {
    const [px, py, nx, ny] = point(start + d);
    const o = wave(d) + (d > L ? (d - L) * 0.08 : 0);   // the overrun drifts outward
    out += (d ? 'L' : 'M') + (px + nx * o).toFixed(1) + ' ' + (py + ny * o).toFixed(1);
  }
  return out;
}

// A pencil line round a box that changes size (the tutorial's cards): two strokes traced by hand, drawn again only
// when the box's size changes. It sits inside the box, which must be positioned. No filter runs.
export function PencilEdge({ radius = 6, seed = 7 }) {
  const ref = useRef(null);
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => { const w = el.offsetWidth, h = el.offsetHeight; setSize(s => (s && s[0] === w && s[1] === h ? s : [w, h])); };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [w, h] = size || [0, 0];
  const paths = useMemo(() => (w > 0 ? [pencilRect(0, 0, w, h, radius, seed), pencilRect(1.4, 1.4, w - 2.4, h - 2.4, radius, seed + 13)] : null), [w, h, radius, seed]);
  return (
    <span className="pedge" ref={ref} aria-hidden="true">
      {paths && (
        <svg width={w + 12} height={h + 12} viewBox={`-6 -6 ${w + 12} ${h + 12}`}>
          <path d={paths[0]} />
          <path className="b" d={paths[1]} />
        </svg>
      )}
    </span>
  );
}

// A pencil rule across the top of a band (the tutorial's strip, a slide's foot): two strokes with a slow hand wave,
// stretched to the band's width at one line weight. A wobble filter on a line this long breaks it into steps.
export function PencilRule() {
  return (
    <svg className="prule" viewBox="0 0 1000 7" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 3.4C140 2.6 290 4.1 430 3.2S720 2.5 860 3.5 975 3.7 1000 3" />
      <path d="M6 4.6C210 5.1 380 3.9 560 4.5S890 5 996 4.2" />
    </svg>
  );
}
