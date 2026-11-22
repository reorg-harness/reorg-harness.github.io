/* ReOrg project page. All numbers come from the paper (arXiv v1 manuscript) and its source data. */
(function () {
  'use strict';

  // ---- Links: set paper to the arXiv URL once it is live. ----
  const LINKS = {
    paper: null, // e.g. 'https://arxiv.org/abs/XXXX.XXXXX'
    code: 'https://github.com/google-research/reorg',
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null) continue;
      if (k === 'text') e.textContent = v;
      else if ((k === 'fill' || k === 'stroke') && String(v).includes('var(')) e.style[k] = v;
      else e.setAttribute(k, v);
    }
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgRoot(w, h) { return el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h }); }
  function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // Re-render a chart whenever its container width changes (keeps text legible on phones).
  function mount(container, draw) {
    if (!container) return;
    let last = -1;
    const run = () => {
      const w = Math.round(container.clientWidth);
      if (!w || w === last) return;
      last = w;
      container.replaceChildren(draw(w));
    };
    run();
    new ResizeObserver(run).observe(container);
    return () => { last = -1; run(); };
  }

  // ---------------- links, theme, nav ----------------
  $$('[data-link]').forEach(a => {
    const url = LINKS[a.dataset.link];
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
    else {
      a.removeAttribute('href'); a.classList.add('is-disabled'); a.setAttribute('aria-disabled', 'true');
      a.title = 'arXiv link coming soon';
      const span = a.querySelector('span'); if (span) span.textContent = 'Paper (soon)';
    }
  });

  const themeBtn = $('#themeBtn');
  themeBtn.addEventListener('click', () => {
    const root = document.documentElement;
    const cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('reorg-theme', next); } catch (e) { /* storage unavailable */ }
  });

  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const navLinks = $$('.nav-links a');
  const secObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => secObs.observe(s));

  // ---------------- shared vocab ----------------
  const ROLES = {
    same_job_teammate: { name: 'Same-job teammate', code: 'TM', desc: 'A peer who does the same job and could co-own the deliverable tomorrow.' },
    direct_manager: { name: 'Direct manager', code: 'DM', desc: 'Accountable for whether the work satisfies the assignment and is ready for its recipient.' },
    upstream_requester: { name: 'Upstream requester', code: 'UR', desc: 'The colleague who framed the work; checks it answers the actual request.' },
    xfn_partner: { name: 'Cross-functional partner', code: 'XF', desc: 'An adjacent team; looks at interfaces, terminology, dependencies and handoffs.' },
    customer_technical: { name: 'Technical customer', code: 'TC', desc: 'A client-side counterpart who checks correctness, reproducibility and integration.' },
    implementation_partner: { name: 'Implementation partner', code: 'IP', desc: 'Puts the artifact into use; checks the work can move from artifact to action.' },
    procurement_evaluator: { name: 'Procurement evaluator', code: 'PE', desc: 'Decides acceptance under explicit criteria: coverage, evidence, risk, friction.' },
    legal_risk_reviewer: { name: 'Legal & risk reviewer', code: 'LR', desc: 'Flags issues that could arise when the artifact is used, shared or relied on.' },
    internal_auditor: { name: 'Internal auditor', code: 'IA', desc: 'Checks evidence, traceability and whether the work can be defended from the record.' },
    experienced_mentor: { name: 'Experienced mentor', code: 'EM', desc: 'A trusted senior peer who has seen similar work succeed and fail.' },
  };
  const ROLE_ORDER = ['direct_manager', 'upstream_requester', 'experienced_mentor', 'same_job_teammate', 'legal_risk_reviewer', 'xfn_partner', 'implementation_partner', 'internal_auditor', 'procurement_evaluator', 'customer_technical'];
  const ACTS = {
    feedback: { name: 'Feedback', letter: 'F', color: 'var(--yellow)', cls: 'act-f' },
    propose: { name: 'Propose', letter: 'P', color: 'var(--blue-light)', cls: 'act-p' },
    loop_in: { name: 'Loop-In', letter: 'L', color: 'var(--coral)', cls: 'act-l' },
  };
  const chip = a => `<span class="chip ${ACTS[a].cls}">${ACTS[a].name}</span>`;

  // ---------------- generic bar helpers ----------------
  function axisBreak(svg, x, y) {
    el('path', { d: `M${x - 5} ${y - 3} l4 -4 l4 8 l4 -4`, fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.2 }, svg);
  }

  // Hero: grouped vertical bars.
  function heroBars(w) {
    const H = w < 520 ? 250 : 286;
    const m = { l: 34, r: 6, t: 26, b: 50 };
    const svg = svgRoot(w, H);
    const iw = w - m.l - m.r, ih = H - m.t - m.b;
    const y0 = 45, y1 = 75;
    const Y = v => m.t + ih - (v - y0) / (y1 - y0) * ih;
    for (let v = y0; v <= y1; v += 5) {
      el('line', { x1: m.l, x2: w - m.r, y1: Y(v), y2: Y(v), stroke: 'var(--line)', 'stroke-dasharray': v === y0 ? null : '3 4' }, svg);
      el('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--ink-3)', text: v }, svg);
    }
    axisBreak(svg, m.l, Y(y0) + 1);
    const groups = [
      { name: 'Gemini 3.1 Pro', vals: [51.4, 53.5, 60.5] },
      { name: 'Qwen 3.6 27B', vals: [57.3, 64.3, 70.3] },
    ];
    const colors = ['var(--yellow)', 'var(--blue-light)', 'var(--coral)'];
    const gw = iw / groups.length;
    const bw = Math.min(58, gw * 0.24), gap = Math.max(4, bw * 0.12);
    groups.forEach((g, gi) => {
      const cx = m.l + gw * gi + gw / 2;
      const x0 = cx - (3 * bw + 2 * gap) / 2;
      g.vals.forEach((v, i) => {
        const x = x0 + i * (bw + gap);
        const r = el('rect', { x, y: Y(v), width: bw, height: Y(y0) - Y(v), rx: 3, fill: colors[i] }, svg);
        if (!heroAnimated && !reduceMotion) { r.classList.add('grow'); r.style.animationDelay = (150 + 110 * i + 220 * gi) + 'ms'; }
        el('title', { text: `${g.name}: ${['Single worker', 'Self-reflection', 'ReOrg'][i]} ${v.toFixed(1)}` }, r);
        el('text', { x: x + bw / 2, y: Y(v) - 7, 'text-anchor': 'middle', 'font-size': w < 420 ? 11.5 : 13, 'font-weight': i === 2 ? 700 : 600, fill: i === 2 ? 'var(--coral-ink)' : 'var(--ink)', text: v.toFixed(1) }, svg);
      });
      el('text', { x: cx, y: H - m.b + 20, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, fill: 'var(--ink)', text: g.name }, svg);
      el('text', { x: cx, y: H - m.b + 38, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: 'var(--coral-ink)', text: `+${(g.vals[2] - g.vals[0]).toFixed(1)} pts` + (w < 560 ? '' : ' over single worker') }, svg);
    });
    heroAnimated = true;
    return svg;
  }
  let heroAnimated = false;

  // Horizontal bars with a zoomed axis.
  function hBars(rows, opt) {
    return function (w) {
      const labelW = Math.min(opt.labelW || 190, w * 0.42);
      const rowH = 34, m = { l: labelW, r: 42, t: 6, b: 26 };
      const H = m.t + rows.length * rowH + m.b;
      const svg = svgRoot(w, H);
      const iw = w - m.l - m.r;
      const X = v => m.l + (v - opt.min) / (opt.max - opt.min) * iw;
      for (let v = opt.min; v <= opt.max + 1e-9; v += opt.step) {
        el('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, stroke: 'var(--line)', 'stroke-dasharray': v === opt.min ? null : '3 4' }, svg);
        el('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)', text: v }, svg);
      }
      el('path', { d: `M${X(opt.min) - 4} ${H - m.b - 2} l4 -4 l4 8`, fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.1 }, svg);
      rows.forEach((r, i) => {
        const y = m.t + i * rowH + 6, bh = rowH - 12;
        el('text', { x: m.l - 10, y: y + bh / 2 + 4.5, 'text-anchor': 'end', 'font-size': w < 420 ? 12 : 13, 'font-weight': r.bold ? 650 : 450, fill: 'var(--ink)', text: (w < 520 && r.short) ? r.short : r.label }, svg);
        const rect = el('rect', { x: X(opt.min), y, width: Math.max(1, X(r.v) - X(opt.min)), height: bh, rx: 3, fill: r.color }, svg);
        el('title', { text: `${r.label}: ${r.v.toFixed(1)}` }, rect);
        el('text', { x: X(r.v) + 6, y: y + bh / 2 + 4.5, 'font-size': 12.5, 'font-weight': r.bold ? 700 : 550, fill: r.bold ? 'var(--coral-ink)' : 'var(--ink)', text: r.v.toFixed(1) }, svg);
      });
      return svg;
    };
  }

  mount($('#heroBars'), heroBars);
  mount($('#pilotBars'), hBars([
    { label: 'Single worker', v: 43.0, color: 'var(--yellow)' },
    { label: 'Self-reflection', v: 48.7, color: 'var(--blue-light)' },
    { label: 'Manager feedback, 1 round', short: 'Manager, 1 round', v: 53.2, color: 'var(--green)' },
    { label: 'Three roles, 3 rounds', short: '3 roles, 3 rounds', v: 55.7, color: 'var(--blue-deep)' },
  ], { min: 40, max: 60, step: 5, labelW: 190 }));

  // ---------------- reflection round stepper ----------------
  (function roundStepper() {
    const root = $('#round'); if (!root) return;
    const STEPS = [
      { k: 'Draft', t: 'Worker drafts' },
      { k: 'Plan', t: 'Planner picks a skill' },
      { k: 'Feedback', t: 'Teammate' },
      { k: 'Propose', t: 'Legal & risk' },
      { k: 'Loop-In', t: 'Manager + partner' },
      { k: 'Handoff', t: 'Combined guidance' },
      { k: 'Revise', t: 'Worker revises' },
    ];
    const CAPTIONS = [
      'The agent completes the task with its ordinary tools and produces a first draft.',
      'The planner reads the task and the work state, decides reflection is needed, and retrieves a skill from the frozen library.',
      'A same-job teammate inspects the memo and the source files in a read-only context, and flags a defect.',
      'The legal and risk reviewer sees the teammate’s contribution and proposes a concrete change.',
      'The manager loops in an environmental partner and returns one combined view.',
      'The perspectives are combined into compact guidance for the agent.',
      'Only the agent edits the deliverable. The planner then stops, or retrieves another skill for the next round (up to three).',
    ];
    const MSGS = [
      { cls: 'system', html: '<p><b>Task.</b> Prepare a site acquisition memo covering environmental risk and closing readiness.</p>' },
      { cls: 'system', html: '<p><b>Planner.</b> The closing recommendation rests on an insurance assumption. Reflection needed, so it retrieves an organizational skill from the library.</p>' },
      { role: 'same_job_teammate', act: 'feedback', text: 'I found that the policy excludes pollution risk. The memo cannot describe that risk as insured.' },
      { role: 'legal_risk_reviewer', act: 'propose', text: 'I propose adding a one-year seller reserve. Keep the closing recommendation conditional.' },
      { role: 'direct_manager', act: 'loop_in', sub: 'with Environmental partner (domain expert)', text: 'I consulted our environmental partner: monitoring lasts three years. Extend the reserve.' },
      { cls: 'handoff', head: 'Combined guidance', text: 'Flag the uninsured risk. Seek a three-year reserve. Keep closing conditional on agreement and funding.' },
      { cls: 'worker', head: 'Agent', text: 'I revised the memo to flag the uninsured pollution risk and propose a three-year seller reserve. Closing remains conditional on agreement and funding.' },
    ];
    const AV = { same_job_teammate: 'var(--yellow)', legal_risk_reviewer: 'var(--blue-light)', direct_manager: 'var(--coral)' };

    const stepsEl = $('#rSteps');
    STEPS.forEach((s, i) => {
      const li = h('li', null, `<b>${i + 1}</b>${s.k}`);
      li.title = s.t;
      li.addEventListener('click', () => { stop(); go(i); });
      stepsEl.appendChild(li);
    });

    // Graph: A0 -> TM(F) -> LR(P) -> DM(L) -> Handoff ; partner bubble under DM.
    function drawGraph(w, step) {
      const small = w < 440;
      const H = small ? 132 : 158;
      const svg = svgRoot(w, H);
      const cy = small ? 46 : 56;
      const bw2 = small ? 23 : 30; // half box width
      const nodes = [
        { id: 'in', x: small ? 0.09 : 0.07, label: small ? 'A₀' : 'Memo A₀', kind: 'doc' },
        { id: 'tm', x: 0.295, role: 'same_job_teammate', act: 'feedback', on: 2 },
        { id: 'lr', x: 0.50, role: 'legal_risk_reviewer', act: 'propose', on: 3 },
        { id: 'dm', x: 0.705, role: 'direct_manager', act: 'loop_in', on: 4 },
        { id: 'out', x: small ? 0.91 : 0.93, label: 'Handoff', kind: 'doc', on: 5 },
      ];
      const X = f => Math.round(f * w);
      const visible = step >= 1;
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1];
        const g = el('g', { class: 'gedge' + (visible ? '' : ' dim') }, svg);
        const x1 = X(a.x) + bw2, x2 = X(b.x) - bw2;
        const active = step >= (b.on || 0) && visible;
        el('line', { x1, y1: cy, x2: x2 - 4, y2: cy, stroke: active ? 'var(--ink-2)' : 'var(--line-2)', 'stroke-width': 1.6 }, g);
        el('path', { d: `M${x2} ${cy} l-6 -4 v8 z`, fill: active ? 'var(--ink-2)' : 'var(--line-2)' }, g);
      }
      nodes.forEach(n => {
        const g = el('g', { class: 'gnode' + (!visible && n.id !== 'in' ? ' dim' : '') + (n.on === step ? ' pulse' : '') }, svg);
        const x = X(n.x);
        if (n.kind === 'doc') {
          const lit = n.id === 'in' ? step >= 0 : step >= n.on;
          el('rect', { class: 'box', x: x - bw2, y: cy - 20, width: bw2 * 2, height: 40, rx: 8, fill: lit ? 'var(--surface)' : 'var(--surface-2)', stroke: 'var(--line-2)' }, g);
          el('text', { x, y: cy + 4, 'text-anchor': 'middle', 'font-size': small ? 10 : 11.5, 'font-weight': 600, fill: 'var(--ink)', text: n.label }, g);
        } else {
          const lit = step >= n.on;
          el('rect', { class: 'box', x: x - bw2, y: cy - 22, width: bw2 * 2, height: 44, rx: 10, fill: lit ? ACTS[n.act].color : 'var(--surface)', stroke: lit ? 'transparent' : 'var(--line-2)' }, g);
          el('text', { x, y: cy - 3, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: lit ? '#1b2a33' : 'var(--ink)', text: ROLES[n.role].code }, g);
          el('text', { x, y: cy + 12, 'text-anchor': 'middle', 'font-size': small ? 8.5 : 10, 'font-family': 'JetBrains Mono, monospace', fill: lit ? '#1b2a33' : 'var(--ink-3)', text: ACTS[n.act].name }, g);
        }
      });
      // Loop-In partner
      const dm = X(0.705), py = small ? cy + 26 : cy + 46, pw = small ? 98 : 124;
      const g = el('g', { class: 'gnode' + (step >= 4 ? '' : ' dim') }, svg);
      el('path', { d: `M${dm} ${py} v${small ? 26 : 18}`, stroke: 'var(--coral)', 'stroke-dasharray': '3 3', 'stroke-width': 1.5, fill: 'none' }, g);
      const by = py + (small ? 28 : 20);
      el('rect', { x: Math.min(w - pw - 2, dm - pw / 2), y: by, width: pw, height: 26, rx: 13, fill: step >= 4 ? 'var(--coral-soft)' : 'var(--surface)', stroke: 'var(--coral)' }, g);
      el('text', { x: Math.min(w - pw - 2, dm - pw / 2) + pw / 2, y: by + 17, 'text-anchor': 'middle', 'font-size': small ? 10 : 11, fill: 'var(--ink)', text: small ? 'Env. partner' : 'Environmental partner' }, g);
      return svg;
    }

    const MEMO = [
      { k: 'Environmental', a: 'Pollution risk is covered by the existing insurance policy.', b: '<del>Pollution risk is covered by the existing insurance policy.</del> <ins>The policy excludes pollution, so the risk is uninsured. Monitoring is expected to last three years.</ins>' },
      { k: 'Protection', a: 'None required.', b: '<del>None required.</del> <ins>Seek a three-year seller reserve.</ins>' },
      { k: 'Recommendation', a: 'Proceed to closing.', b: '<del>Proceed to closing.</del> <ins>Close only once the reserve is agreed and funded.</ins>' },
    ];

    let step = 0, timer = null, playing = !reduceMotion, started = false;
    const graphBox = $('#rGraph');
    let redrawGraph = mount(graphBox, w => drawGraph(w, step));

    function renderThread(prevStep) {
      const th = $('#rThread');
      th.replaceChildren();
      MSGS.slice(0, step + 1).forEach((m, i) => {
        const d = h('div', 'msg ' + (m.cls || ''));
        if (m.role) {
          d.innerHTML = `<div class="msg-head"><span class="avatar" style="background:${AV[m.role]}">${ROLES[m.role].code}</span>${ROLES[m.role].name} ${chip(m.act)}</div>` +
            (m.sub ? `<div class="msg-sub">${m.sub}</div>` : '') + `<p>${m.text}</p>`;
        } else if (m.head) {
          d.innerHTML = `<div class="msg-head">${m.head}</div><p>${m.text}</p>`;
        } else d.innerHTML = m.html;
        if (i < prevStep + 1 || i < step) d.style.animation = 'none';
        th.appendChild(d);
      });
      th.scrollTop = th.scrollHeight;
    }
    function renderMemo() {
      const revised = step >= 6;
      $('#rMemoTitle').textContent = revised ? 'Agent’s memo, revised' : 'Agent’s memo, first draft';
      $('#rMemoBody').innerHTML = MEMO.map(l => `<div class="memo-line${revised ? ' added' : ''}"><span class="k">${l.k}</span><span>${revised ? l.b : l.a}</span></div>`).join('');
    }
    function go(i) {
      const prev = step;
      step = Math.max(0, Math.min(STEPS.length - 1, i));
      $$('li', stepsEl).forEach((li, j) => { li.classList.toggle('on', j === step); li.classList.toggle('done', j < step); });
      redrawGraph();
      renderThread(prev === step ? step - 1 : Math.min(prev, step - 1));
      renderMemo();
      $('#rCaption').textContent = CAPTIONS[step];
    }
    const playBtn = $('#rPlay');
    function setPlayUI() { playBtn.classList.toggle('paused', !playing); playBtn.querySelector('.ctl-text').textContent = playing ? 'Pause' : 'Play'; playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
    function tick() {
      clearTimeout(timer);
      if (!playing) return;
      timer = setTimeout(() => {
        if (step < STEPS.length - 1) { go(step + 1); tick(); }
        else { playing = false; setPlayUI(); }
      }, step === STEPS.length - 2 ? 3200 : 3000);
    }
    function stop() { playing = false; clearTimeout(timer); setPlayUI(); }
    playBtn.addEventListener('click', () => {
      if (playing) stop();
      else { playing = true; if (step === STEPS.length - 1) go(0); setPlayUI(); tick(); }
    });
    $('#rNext').addEventListener('click', () => { stop(); go(step + 1); });
    $('#rPrev').addEventListener('click', () => { stop(); go(step - 1); });
    $('#rReset').addEventListener('click', () => { go(0); playing = !reduceMotion; setPlayUI(); tick(); });
    go(0); setPlayUI();
    // Start auto-play the first time the widget scrolls into view.
    new IntersectionObserver((ents, obs) => {
      if (ents.some(e => e.isIntersecting) && !started) { started = true; obs.disconnect(); if (playing) tick(); }
    }, { threshold: 0.35 }).observe(root);
  })();

  // ---------------- skill graph layout ----------------
  function layout(s) {
    const keys = ['in', ...s.n.map((_, i) => i), 'out'];
    const par = {}, ch = {};
    keys.forEach(k => { par[k] = []; ch[k] = []; });
    s.e.forEach(([a, b]) => { ch[a].push(b); par[b].push(a); });
    const indeg = {}; keys.forEach(k => { indeg[k] = par[k].length; });
    const q = keys.filter(k => indeg[k] === 0), order = [];
    while (q.length) { const k = q.shift(); order.push(k); ch[k].forEach(c => { if (--indeg[c] === 0) q.push(c); }); }
    const depth = {};
    order.forEach(k => { depth[k] = par[k].length ? Math.max(...par[k].map(p => depth[p])) + 1 : (k === 'in' ? 0 : 1); });
    const maxD = s.n.length ? Math.max(...s.n.map((_, i) => depth[i])) : 0;
    depth.in = 0; depth.out = maxD + 1;
    const cols = Array.from({ length: maxD + 2 }, () => []);
    keys.forEach(k => cols[depth[k]].push(k));
    return { par, ch, depth, cols, order, maxD };
  }
  function place(L, W, H, padX, padY, maxGap) {
    const pos = {};
    const nc = L.cols.length;
    L.cols.forEach((col, d) => {
      const x = nc === 1 ? W / 2 : padX + d * (W - 2 * padX) / (nc - 1);
      if (d > 0) {
        col.sort((a, b) => {
          const ya = L.par[a].length ? L.par[a].reduce((t, p) => t + (pos[p] ? pos[p].y : H / 2), 0) / L.par[a].length : H / 2;
          const yb = L.par[b].length ? L.par[b].reduce((t, p) => t + (pos[p] ? pos[p].y : H / 2), 0) / L.par[b].length : H / 2;
          return ya - yb;
        });
      }
      const m = col.length;
      const gap = m > 1 ? Math.min(maxGap, (H - 2 * padY) / (m - 1)) : 0;
      col.forEach((k, j) => { pos[k] = { x, y: H / 2 + (j - (m - 1) / 2) * gap }; });
    });
    return pos;
  }
  function edgePath(a, b, ra, rb) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const sx = a.x + dx / len * ra, sy = a.y + dy / len * ra;
    const tx = b.x - dx / len * rb, ty = b.y - dy / len * rb;
    return { d: `M${sx.toFixed(1)} ${sy.toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)}`, tx, ty, ang: Math.atan2(dy, dx) };
  }

  function miniGraph(s) {
    const W = 160, H = 66;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
    const L = layout(s);
    const maxCol = Math.max(...L.cols.map(c => c.length));
    const pos = place(L, W, H, 12, 9, 20);
    const r = Math.max(3.4, Math.min(7.5, maxCol > 1 ? ((H - 18) / (maxCol - 1)) / 2 - 0.6 : 7.5));
    s.e.forEach(([a, b]) => {
      const direct = a === 'in' && b === 'out';
      const p = edgePath(pos[a], pos[b], a === 'in' ? 6 : r, b === 'out' ? 6 : r);
      el('path', { d: p.d, stroke: direct ? 'var(--line-2)' : 'var(--ink-3)', 'stroke-width': 1, 'stroke-dasharray': direct ? '2 3' : null, fill: 'none', opacity: direct ? 0.8 : 0.7 }, svg);
    });
    el('rect', { x: pos.in.x - 5.5, y: pos.in.y - 5.5, width: 11, height: 11, rx: 2.5, fill: 'var(--surface-3)', stroke: 'var(--ink-3)', 'stroke-width': 0.8 }, svg);
    el('rect', { x: pos.out.x - 5.5, y: pos.out.y - 5.5, width: 11, height: 11, rx: 5.5, fill: 'var(--ink)' }, svg);
    s.n.forEach(([role, act], i) => {
      el('circle', { cx: pos[i].x, cy: pos[i].y, r, fill: ACTS[act].color, stroke: 'var(--surface)', 'stroke-width': 1 }, svg);
      if (r >= 6) el('text', { x: pos[i].x, y: pos[i].y + 3, 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 700, fill: '#1b2a33', text: ACTS[act].letter }, svg);
    });
    if (!s.n.length) el('text', { x: W / 2, y: H / 2 - 9, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--ink-3)', text: 'no stakeholders' }, svg);
    return svg;
  }

  function detailGraph(s) {
    const L = layout(s);
    const maxCol = Math.max(...L.cols.map(c => c.length));
    const W = 300, H = Math.max(110, maxCol * 40 + 24);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Skill graph' });
    const pos = place(L, W, H, 22, 22, 40);
    const R = 14;
    s.e.forEach(([a, b]) => {
      const direct = a === 'in' && b === 'out';
      const p = edgePath(pos[a], pos[b], a === 'in' ? 15 : R, (b === 'out' ? 15 : R) + 2);
      el('path', { d: p.d, stroke: direct ? 'var(--line-2)' : 'var(--ink-3)', 'stroke-width': 1.3, 'stroke-dasharray': direct ? '3 4' : null, fill: 'none' }, svg);
      if (!direct) {
        const a1 = p.ang + 2.65, a2 = p.ang - 2.65, L2 = 6;
        el('path', { d: `M${p.tx + 2 * Math.cos(p.ang)} ${p.ty + 2 * Math.sin(p.ang)} L${p.tx + L2 * Math.cos(a1)} ${p.ty + L2 * Math.sin(a1)} L${p.tx + L2 * Math.cos(a2)} ${p.ty + L2 * Math.sin(a2)} Z`, fill: 'var(--ink-3)' }, svg);
      }
    });
    el('rect', { x: pos.in.x - 15, y: pos.in.y - 13, width: 30, height: 26, rx: 5, fill: 'var(--surface)', stroke: 'var(--ink-3)' }, svg);
    el('text', { x: pos.in.x, y: pos.in.y + 4, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 600, fill: 'var(--ink)', text: 'A' }, svg);
    el('text', { x: pos.in.x, y: pos.in.y + 26, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--ink-3)', text: 'artifact' }, svg);
    el('circle', { cx: pos.out.x, cy: pos.out.y, r: 15, fill: 'var(--ink)' }, svg);
    el('text', { x: pos.out.x, y: pos.out.y + 4, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--bg)', text: 'W' }, svg);
    el('text', { x: pos.out.x, y: pos.out.y + 28, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--ink-3)', text: 'worker' }, svg);
    s.n.forEach(([role, act], i) => {
      const g = el('g', {}, svg);
      el('circle', { cx: pos[i].x, cy: pos[i].y, r: R, fill: ACTS[act].color }, g);
      el('text', { x: pos[i].x, y: pos[i].y + 3.8, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#1b2a33', text: ROLES[role].code }, g);
      el('title', { text: `${ROLES[role].name} · ${ACTS[act].name}` }, g);
    });
    return svg;
  }

  // ---------------- skill library explorer (animated) ----------------
  (function explorer() {
    const LIB = window.REORG_LIB; if (!LIB || !$('#explorer')) return;
    const TASKS = ['Five seed skills',
      'Inventory location report', 'Musician payroll workbook', 'Duplex market analysis', 'Partnership pitch deck',
      'OpenStreetMap freight query', 'Audit sample selection', 'AI-in-government literature review', 'In-ear monitor system design',
      'Work-time activity analysis', '30-second green-energy spot', 'American option pricing framework', 'Rugged flashlight concept design',
      'Sourcing workflow redesign', 'Sarasota restaurant guide', 'Retail channel strategy slide', 'Surgical case-log benchmarks',
      'Daily task list', 'Bridal sales objection training', 'Hormone therapy prescribing guidelines', 'Weekly sales performance report'];
    const SEED_NAMES = ['Worker alone (no stakeholders)', 'Manager Feedback', 'Manager Propose', 'Manager Loop-In', 'Manager Feedback → Propose'];
    const LAST = 20, STEP_MS = 850;
    const st = { model: 'gemini', t: reduceMotion ? LAST : 0, act: 'all', sort: 'newest', sel: null, playing: false };
    const grid = $('#exGrid'), slider = $('#exSlider'), playBtn = $('#exPlay');
    let timer = null, started = false;
    slider.value = st.t;

    const lib = () => LIB.libraries[st.model];
    const visible = () => lib().filter(s => s.t <= st.t);
    const maxUse = () => Math.max(...lib().map(s => s.use));
    const seedName = s => SEED_NAMES[lib().filter(x => x.seed).indexOf(s)] || 'Seed';

    function renderSpark() {
      const dyn = LIB.dynamics[st.model];
      const W = 600, H = 46, bw = W / dyn.length;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });
      dyn.forEach((d, i) => {
        const bh = Math.max(2, d[0] / 42 * (H - 4));
        const r = el('rect', { x: i * bw + 1.5, y: H - bh, width: bw - 3, height: bh, rx: 1.5, fill: i === st.t ? 'var(--coral)' : i < st.t ? 'var(--blue-light)' : 'var(--surface-3)', 'fill-opacity': i < st.t ? 0.55 : 1 }, svg);
        el('title', { text: `After task ${i}: ${d[0]} skills` }, r);
        r.addEventListener('click', () => { stop(); setT(i, true); });
      });
      $('#exSpark').replaceChildren(svg);
    }

    function renderGrid(animateNew) {
      let list = visible();
      if (st.act !== 'all') list = list.filter(s => s.n.some(n => n[1] === st.act));
      if (st.sort === 'newest') list = [...list].sort((a, b) => b.t - a.t || b.use - a.use);
      else if (st.sort === 'use') list = [...list].sort((a, b) => b.use - a.use || a.t - b.t);
      else list = [...list].sort((a, b) => b.n.length - a.n.length || b.e.length - a.e.length);
      const mu = maxUse();
      grid.replaceChildren();
      list.forEach(s => {
        const isNew = animateNew && st.t > 0 && s.t === st.t;
        const b = h('button', 'sk' + (s.id === st.sel ? ' sel' : '') + (isNew ? ' new' : ''));
        b.type = 'button';
        b.setAttribute('aria-label', `${s.seed ? 'Seed skill' : 'Skill learned on task ' + s.t}, ${s.n.length} stakeholders, used on ${s.use} held-out tasks`);
        b.appendChild(miniGraph(s));
        b.appendChild(h('div', 'sk-meta', `<span>${s.seed ? 'Seed' : 'Task ' + s.t}</span><span>${s.use ? 'used ' + s.use : ''}</span>`));
        b.appendChild(h('div', 'sk-bar', `<i style="width:${(s.use / mu * 100).toFixed(1)}%"></i>`));
        b.addEventListener('click', () => { stop(); st.sel = s.id; renderGrid(false); renderDetail(); });
        grid.appendChild(b);
      });
      if (!list.length) grid.appendChild(h('p', 'ex-empty', 'No skills with this action yet.'));
      grid.scrollTop = 0;
    }

    function renderDetail() {
      const v = visible();
      let s = v.find(x => x.id === st.sel);
      if (!s) { s = [...v].sort((a, b) => b.use - a.use)[0]; st.sel = s && s.id; }
      const box = $('#exDetail');
      if (!s) { box.replaceChildren(); return; }
      const L = layout(s);
      const nodes = L.order.filter(k => k !== 'in' && k !== 'out').map(k => s.n[k]);
      box.innerHTML = `<h4>${s.seed ? 'Seed skill' : 'Learned on task ' + s.t}</h4><p class="d-sub">${s.seed ? seedName(s) : TASKS[s.t]}</p>`;
      box.appendChild(detailGraph(s));
      const ul = h('ul');
      nodes.forEach(([role, act]) => {
        const li = h('li', null, `<span class="avatar" style="background:${ACTS[act].color}">${ROLES[role].code}</span>${ROLES[role].name} ${chip(act)}`);
        li.title = ROLES[role].desc;
        ul.appendChild(li);
      });
      if (!nodes.length) ul.appendChild(h('li', null, 'The worker revises with no stakeholder input.'));
      box.appendChild(ul);
      box.appendChild(h('div', 'd-stats', `<span>Picked for <b>${s.use}</b> of 165 held-out tasks</span>${s.re ? `<span>Rediscovered <b>${s.re}×</b></span>` : ''}`));
    }

    // Composition panel: built once, then widths update so they animate.
    const actKeys = Object.keys(ACTS);
    $('#exActions').innerHTML = `<div class="stack">${actKeys.map(k => `<i data-k="${k}" style="width:33%;background:${ACTS[k].color}"></i>`).join('')}</div>` +
      `<div class="stack-legend">${actKeys.map(k => `<span data-k="${k}"></span>`).join('')}</div>`;
    $('#exRoles').innerHTML = ROLE_ORDER.map(r => `<div class="rolebar" data-r="${r}" title="${ROLES[r].desc}"><span>${ROLES[r].name}</span><span class="track"><i style="width:0%"></i></span><span></span></div>`).join('');
    function renderComp() {
      const v = visible();
      const counts = { feedback: 0, propose: 0, loop_in: 0 };
      v.forEach(s => s.n.forEach(n => counts[n[1]]++));
      const tot = counts.feedback + counts.propose + counts.loop_in || 1;
      actKeys.forEach(k => {
        const p = counts[k] / tot * 100;
        $(`#exActions .stack i[data-k="${k}"]`).style.width = p + '%';
        $(`#exActions .stack-legend span[data-k="${k}"]`).textContent = `${ACTS[k].name} ${Math.round(p)}%`;
      });
      ROLE_ORDER.forEach(r => {
        const share = v.filter(s => s.n.some(n => n[0] === r)).length / v.length;
        const row = $(`#exRoles .rolebar[data-r="${r}"]`);
        row.querySelector('.track i').style.width = (share * 100).toFixed(1) + '%';
        row.lastElementChild.textContent = Math.round(share * 100) + '%';
      });
    }

    function update(animateNew) {
      const d = LIB.dynamics[st.model][st.t];
      $('#exTaskNum').textContent = st.t === 0 ? 'Before learning' : `Task ${st.t} of ${LAST}`;
      $('#exTaskName').textContent = st.t === 0 ? TASKS[0] : `${TASKS[st.t]} · ${d[1] ? `+${d[1]} new` : 'no new skills'}`;
      $('#exCount').textContent = d[0];
      renderSpark(); renderGrid(animateNew); renderDetail(); renderComp();
      setPlayUI();
    }
    function setT(t, animateNew) {
      st.t = t; slider.value = t;
      // While playing, follow the most-used skill learned on this task.
      if (st.playing) {
        const fresh = lib().filter(s => s.t === t).sort((a, b) => b.use - a.use)[0];
        if (fresh) st.sel = fresh.id;
      }
      update(animateNew);
    }

    function setPlayUI() {
      const atEnd = st.t >= LAST;
      playBtn.querySelector('.ctl-icon').textContent = st.playing ? '❚❚' : atEnd ? '↺' : '▶';
      playBtn.querySelector('.ctl-text').textContent = st.playing ? 'Pause' : atEnd ? 'Replay' : 'Play';
      playBtn.setAttribute('aria-label', st.playing ? 'Pause' : atEnd ? 'Replay' : 'Play');
    }
    function tick() {
      timer = setTimeout(() => {
        if (st.t >= LAST) { stop(); return; }
        setT(st.t + 1, true);
        if (st.t >= LAST) stop(); else tick();
      }, STEP_MS);
    }
    function play() {
      clearTimeout(timer);
      if (st.t >= LAST) { st.sel = null; st.playing = true; setT(0, false); }
      st.playing = true; setPlayUI(); tick();
    }
    function stop() { st.playing = false; clearTimeout(timer); setPlayUI(); }

    playBtn.addEventListener('click', () => (st.playing ? stop() : play()));
    slider.addEventListener('input', () => { stop(); setT(+slider.value, true); });
    $$('#explorer .seg-btn').forEach(b => b.addEventListener('click', () => {
      $$('#explorer .seg-btn').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-selected', x === b); });
      const wasPlaying = st.playing;
      stop(); st.model = b.dataset.model; st.sel = null;
      if (wasPlaying || st.t === LAST) { st.t = LAST; play(); } else update(false);
    }));
    $$('#exFilters .fchip').forEach(b => b.addEventListener('click', () => {
      $$('#exFilters .fchip').forEach(x => x.classList.toggle('is-on', x === b));
      st.act = b.dataset.act; renderGrid(false);
    }));
    $('#exSort').addEventListener('change', e => { st.sort = e.target.value; renderGrid(false); });
    update(false);
    // Play once, the first time the explorer scrolls into view.
    if (!reduceMotion) {
      new IntersectionObserver((ents, obs) => {
        if (!started && ents.some(e => e.isIntersecting)) { started = true; obs.disconnect(); play(); }
      }, { threshold: 0.3 }).observe($('#explorer'));
    }
  })();

  // ---------------- results ----------------
  const MAIN = [
    { fam: 'single', name: 'Single worker', v: [51.4, 28.7, 50.9, 57.3, 45.5, 68.7] },
    { fam: 'proc', name: 'ReasoningBank', v: [47.0, 28.6, 56.7, 57.3, 43.3, 72.7] },
    { fam: 'proc', name: 'ReasoningBank + MaTTS', v: [50.3, 30.5, 58.6, 60.0, 46.2, 73.0] },
    { fam: 'proc', name: 'AWM', v: [48.1, 30.6, 57.2, 60.5, 43.7, 72.1] },
    { fam: 'proc', name: 'MemP', v: [47.6, 31.2, 57.5, 59.5, 43.6, 76.0] },
    { fam: 'self', name: 'Self-reflection (1 round)', v: [53.5, 29.8, 59.3, 64.3, 45.5, 74.9] },
    { fam: 'org', name: 'Fixed role reflection', v: [52.4, 30.0, 59.6, 61.6, 46.5, 76.0] },
    { fam: 'org', name: 'Random organization', v: [53.5, 30.0, 62.0, 64.3, 45.7, 75.2] },
    { fam: 'ours', name: 'ReOrg (1 round)', v: [60.0, 30.6, 61.9, 68.7, 46.2, 76.6] },
    { fam: 'ours', name: 'ReOrg (2 rounds)', v: [60.5, 30.8, 62.0, 69.2, 47.7, 76.9] },
    { fam: 'ours', name: 'ReOrg (3 rounds)', v: [60.5, 31.0, 62.0, 70.3, 47.7, 76.9] },
  ];
  const FAM = {
    single: { name: 'No reflection', color: 'var(--yellow)' },
    proc: { name: 'Procedural knowledge', color: 'var(--blue-deep)' },
    self: { name: 'Self-reflection', color: 'var(--blue-light)' },
    org: { name: 'Organizational reflection', color: 'var(--green)' },
    ours: { name: 'ReOrg (ours)', color: 'var(--coral)' },
  };
  (function mainTable() {
    const t = $('#mainTable'); if (!t) return;
    const best = [0, 1, 2, 3, 4, 5].map(c => Math.max(...MAIN.map(r => r.v[c])));
    let html = '<thead><tr><th></th><th colspan="3">Gemini 3.1 Pro</th><th class="gap"></th><th colspan="3">Qwen 3.6 27B</th></tr>' +
      '<tr><th>Method</th><th>GDPval</th><th>JobBench</th><th>LAB</th><th class="gap"></th><th>GDPval</th><th>JobBench</th><th>LAB</th></tr></thead><tbody>';
    let lastFam = null;
    MAIN.forEach(r => {
      if (r.fam !== lastFam) { html += `<tr class="fam-head"><td colspan="8"><span class="fam" style="background:${FAM[r.fam].color}"></span>${FAM[r.fam].name}</td></tr>`; lastFam = r.fam; }
      const cell = c => { const v = r.v[c]; const s = v.toFixed(1); return `<td>${Math.abs(v - best[c]) < 1e-9 ? `<b>${s}</b>` : s}</td>`; };
      html += `<tr class="${r.fam === 'ours' ? 'ours' : ''}"><td>${r.name}</td>${cell(0)}${cell(1)}${cell(2)}<td class="gap"></td>${cell(3)}${cell(4)}${cell(5)}</tr>`;
    });
    t.innerHTML = html + '</tbody>';
  })();

  // Procedural vs organizational knowledge: gain over the single worker, derived from MAIN.
  function procData(model) {
    const off = model === 'gemini' ? 0 : 3;
    const single = MAIN.find(r => r.fam === 'single');
    const ours = MAIN.filter(r => r.fam === 'ours').pop();
    const procs = MAIN.filter(r => r.fam === 'proc');
    return ['GDPval', 'JobBench', 'LAB'].map((bench, j) => {
      const c = off + j;
      const best = procs.reduce((a, b) => (b.v[c] > a.v[c] ? b : a));
      return { bench, s: single.v[c], pm: best.name, pa: best.v[c], p: best.v[c] - single.v[c], ra: ours.v[c], r: ours.v[c] - single.v[c] };
    });
  }
  function procChart(w, model) {
    const data = procData(model);
    const H = w < 420 ? 250 : 270;
    const m = { l: 34, r: 8, t: 22, b: 30 };
    const svg = svgRoot(w, H);
    const iw = w - m.l - m.r, ih = H - m.t - m.b;
    const y0 = -2, y1 = 14;
    const Y = v => m.t + ih - (v - y0) / (y1 - y0) * ih;
    for (let v = y0; v <= y1; v += 2) {
      el('line', { x1: m.l, x2: w - m.r, y1: Y(v), y2: Y(v), stroke: v === 0 ? 'var(--ink-3)' : 'var(--line)', 'stroke-dasharray': v === 0 ? null : '3 4' }, svg);
      el('text', { x: m.l - 7, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--ink-3)', text: v > 0 ? '+' + v : v }, svg);
    }
    const gw = iw / data.length, bw = Math.min(44, gw * 0.3), gap = 6;
    data.forEach((d, i) => {
      const cx = m.l + gw * i + gw / 2;
      [[d.p, 'var(--blue-deep)', `Best procedural method (${d.pm}): ${d.pa.toFixed(1)} vs. ${d.s.toFixed(1)} for the single worker`],
       [d.r, 'var(--coral)', `ReOrg: ${d.ra.toFixed(1)} vs. ${d.s.toFixed(1)} for the single worker`]].forEach(([v, color, tip], k) => {
        const x = cx + (k === 0 ? -bw - gap / 2 : gap / 2);
        const top = Math.min(Y(v), Y(0)), hgt = Math.abs(Y(v) - Y(0));
        const r = el('rect', { x, y: top, width: bw, height: Math.max(1, hgt), rx: 3, fill: color }, svg);
        el('title', { text: tip }, r);
        const label = (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);
        el('text', { x: x + bw / 2, y: v >= 0 ? Y(v) - 6 : Y(v) + 14, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': k === 1 ? 700 : 600, fill: k === 1 ? 'var(--coral-ink)' : 'var(--ink-2)', text: label }, svg);
      });
      el('text', { x: cx, y: H - m.b + 20, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, fill: 'var(--ink)', text: d.bench }, svg);
    });
    el('text', { x: m.l, y: 11, 'font-size': 12.5, fill: 'var(--ink-2)', text: 'Gain over single worker (points)' }, svg);
    return svg;
  }
  mount($('#procGemini'), w => procChart(w, 'gemini'));
  mount($('#procQwen'), w => procChart(w, 'qwen'));

  function heatmap(vals) {
    return function (w) {
      const labels = ['GDPval', 'JobBench', 'LAB'];
      const lw = 108, top = 46;
      const cell = Math.min(92, (w - lw - 4) / 3);
      const W = lw + cell * 3, H = top + cell * 3 + 4;
      const svg = svgRoot(W, H);
      el('text', { x: lw + cell * 1.5, y: 13, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink-2)', text: 'Tested on →' }, svg);
      labels.forEach((l, j) => el('text', { x: lw + cell * j + cell / 2, y: top - 8, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: 'var(--ink)', text: l }, svg));
      labels.forEach((l, i) => {
        el('text', { x: lw - 10, y: top + cell * i + cell / 2 + 4, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 600, fill: 'var(--ink)', text: l }, svg);
        labels.forEach((_, j) => {
          const v = vals[i][j], f = Math.min(1, v / 14);
          const x = lw + cell * j, y = top + cell * i;
          el('rect', { x: x + 2, y: y + 2, width: cell - 4, height: cell - 4, rx: 7, fill: 'var(--surface-2)' }, svg);
          el('rect', { x: x + 2, y: y + 2, width: cell - 4, height: cell - 4, rx: 7, fill: '#2171B5', 'fill-opacity': (0.1 + 0.85 * f).toFixed(3), stroke: i === j ? 'var(--ink-3)' : 'none', 'stroke-dasharray': i === j ? '3 3' : null }, svg);
          el('text', { x: x + cell / 2, y: y + cell / 2 + 6, 'text-anchor': 'middle', 'font-size': cell > 70 ? 17 : 14, 'font-weight': 650, fill: f > 0.5 ? '#fff' : 'var(--ink)', text: '+' + v.toFixed(1) }, svg);
        });
      });
      el('text', { x: lw - 10, y: top - 8, 'text-anchor': 'end', 'font-size': 12.5, fill: 'var(--ink-2)', text: 'Learned on ↓' }, svg);
      svg.setAttribute('width', '100%'); svg.style.maxWidth = W + 'px';
      return svg;
    };
  }
  const refreshHeatS = mount($('#heatSingle'), heatmap([[13.0, 2.3, 8.2], [12.4, 3.6, 9.7], [9.2, 3.8, 10.7]]));
  const refreshHeatR = mount($('#heatRandom'), heatmap([[6.0, 2.0, 1.7], [5.4, 3.3, 3.2], [2.2, 3.5, 4.2]]));

  mount($('#lunaBars'), hBars([
    { label: 'Single worker', v: 72.4, color: 'var(--yellow)' },
    { label: 'ReasoningBank + MaTTS', short: 'RB + MaTTS', v: 74.1, color: 'var(--blue-deep)' },
    { label: 'Self-reflection (1 round)', short: 'Self-reflection', v: 74.6, color: 'var(--blue-light)' },
    { label: 'Random organization', short: 'Random org.', v: 75.2, color: 'var(--green)' },
    { label: 'ReOrg · Gemini-learned skills', short: 'ReOrg (Gemini)', v: 75.1, color: 'var(--coral)', bold: true },
    { label: 'ReOrg · Qwen-learned skills', short: 'ReOrg (Qwen)', v: 76.2, color: 'var(--coral)', bold: true },
  ], { min: 70, max: 77, step: 1, labelW: 210 }));

  // Accuracy vs cost (tokens in millions, win+tie %).
  const COST = {
    gemini: {
      y: [48, 62],
      series: [
        { fam: 'single', name: 'Single worker', pts: [[0.195, 51.4, 'initial solve']] },
        { fam: 'proc', name: 'ReasoningBank + MaTTS', pts: [[0.203, 50.3, '']] },
        { fam: 'self', name: 'Self-reflection', pts: [[0.567, 53.5, '1 round'], [0.975, 52.4, '2 rounds'], [1.275, 52.4, '3 rounds']] },
        { fam: 'org', name: 'Random organization', pts: [[0.800, 52.4, '3 nodes'], [1.018, 53.5, '5 nodes'], [1.400, 57.3, '7 nodes']] },
        { fam: 'ours', name: 'ReOrg', pts: [[1.478, 60.0, '1 round'], [1.580, 60.5, '2 rounds'], [1.581, 60.5, '3 rounds']] },
      ],
    },
    qwen: {
      y: [54, 72],
      series: [
        { fam: 'single', name: 'Single worker', pts: [[0.333, 57.3, 'initial solve']] },
        { fam: 'proc', name: 'ReasoningBank + MaTTS', pts: [[0.497, 60.0, '']] },
        { fam: 'self', name: 'Self-reflection', pts: [[1.131, 64.3, '1 round'], [1.805, 66.5, '2 rounds'], [2.252, 60.0, '3 rounds']] },
        { fam: 'org', name: 'Random organization', pts: [[0.950, 60.3, '2 nodes'], [1.441, 64.3, '4 nodes'], [1.781, 66.5, '7 nodes']] },
        { fam: 'ours', name: 'ReOrg', pts: [[2.566, 68.7, '1 round'], [3.236, 69.2, '2 rounds'], [3.536, 70.3, '3 rounds']] },
      ],
    },
  };
  $('#costLegend').innerHTML = COST.gemini.series.map(s => `<span><i style="background:${FAM[s.fam].color};border-radius:50%"></i>${s.name}</span>`).join('');
  function costChart(w, costModel) {
    const d = COST[costModel];
    const H = w < 420 ? 250 : 280;
    const m = { l: 54, r: 14, t: 14, b: 42 };
    const svg = svgRoot(w, H);
    const iw = w - m.l - m.r, ih = H - m.t - m.b;
    const xmax = costModel === 'gemini' ? 1.8 : 4.0;
    const X = v => m.l + v / xmax * iw;
    const Y = v => m.t + ih - (v - d.y[0]) / (d.y[1] - d.y[0]) * ih;
    const ystep = 2;
    for (let v = d.y[0]; v <= d.y[1]; v += ystep) {
      el('line', { x1: m.l, x2: w - m.r, y1: Y(v), y2: Y(v), stroke: 'var(--line)', 'stroke-dasharray': v === d.y[0] ? null : '3 4' }, svg);
      el('text', { x: m.l - 7, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--ink-3)', text: v }, svg);
    }
    const xstep = costModel === 'gemini' ? 0.3 : 0.5;
    for (let v = 0; v <= xmax + 1e-9; v += xstep) {
      el('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)', text: v < 1e-9 ? '0' : (Math.round(v * 10) / 10) + 'M' }, svg);
    }
    el('text', { x: m.l + iw / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink-2)', text: 'Tokens per task' }, svg);
    el('text', { x: 12, y: m.t + ih / 2, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink-2)', transform: `rotate(-90 12 ${m.t + ih / 2})`, text: 'Win + tie (%)' }, svg);
    d.series.forEach(s => {
      const c = FAM[s.fam].color;
      if (s.pts.length > 1) el('path', { d: s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' '), fill: 'none', stroke: c, 'stroke-width': s.fam === 'ours' ? 2.4 : 1.6, 'stroke-dasharray': s.fam === 'self' ? '5 4' : null }, svg);
      s.pts.forEach(p => {
        const g = el('g', {}, svg);
        el('circle', { cx: X(p[0]), cy: Y(p[1]), r: s.fam === 'ours' ? 6 : 4.8, fill: c, stroke: 'var(--surface)', 'stroke-width': 1.5 }, g);
        el('title', { text: `${s.name}${p[2] ? ' · ' + p[2] : ''}: ${p[1].toFixed(1)}% at ${(p[0]).toFixed(2)}M tokens` }, g);
      });
    });
    const ours = d.series.find(s => s.fam === 'ours').pts;
    const last = ours[ours.length - 1];
    el('text', { x: X(last[0]) - 8, y: Y(last[1]) - 12, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 700, fill: 'var(--coral-ink)', text: `ReOrg ${last[1].toFixed(1)}` }, svg);
    return svg;
  }
  mount($('#costGemini'), w => costChart(w, 'gemini'));
  mount($('#costQwen'), w => costChart(w, 'qwen'));

  // ---------------- case timeline ----------------
  (function timeline() {
    const box = $('#timeline'); if (!box) return;
    const seq = arr => arr.map(([r, a]) => `<span class="avatar" style="background:${ACTS[a].color}" title="${ROLES[r].name} · ${ACTS[a].name}">${ROLES[r].code}</span>`).join('<span>→</span>');
    const ITEMS = [
      { step: 'Initial', w: 0, title: 'Worker solve', skill: '<span>no reflection</span>',
        raised: '33 wells and seven candidates across two worksheets.', changed: 'The email to the manager is missing.' },
      { step: 'Round 1', w: 1, title: 'Completeness and decision risks',
        skill: seq([['same_job_teammate', 'propose'], ['direct_manager', 'feedback'], ['upstream_requester', 'loop_in'], ['legal_risk_reviewer', 'feedback'], ['xfn_partner', 'feedback']]),
        raised: 'The teammate and manager flag the missing email, and the manager notes that the claimed conditional formatting is absent. Others separate five producing wells from two with zero pumpage, and raise ownership, provenance, units and a concentration of candidates in one town.',
        changed: 'Freeze panes, formatting, verification notes and two candidate tiers. Still no email.' },
      { step: 'Round 2', w: 2, title: 'Spreadsheet usability',
        skill: seq([['same_job_teammate', 'propose'], ['xfn_partner', 'feedback'], ['direct_manager', 'feedback'], ['upstream_requester', 'loop_in'], ['legal_risk_reviewer', 'feedback']]),
        raised: 'With cross-functional feedback moved up, attention turns to plain-text URLs, ambiguous "None" values and inconsistent formatting. The requester keeps zero-pumpage wells in Tier 2.',
        changed: 'Source hyperlinks, N/A instead of None, shortlist formatting, unit and ownership caveats on both sheets. The email is still missing, but the workbook now wins.' },
      { step: 'Round 3', w: 3, title: 'Completing the handoff', final: true,
        skill: seq([['direct_manager', 'feedback'], ['direct_manager', 'propose']]),
        raised: 'The manager targets the missing email, and an active-well check that could admit inactive wells.',
        changed: 'An "Email to Manager" sheet with all seven candidates, depths, pumpage, tiers, outreach steps and caveats. Screening now requires official status A.' },
    ];
    box.innerHTML = ITEMS.map(it => {
      const pips = [0, 1, 2].map(i => `<i class="${i < it.w ? 'w' : 'l'}"></i>`).join('');
      const win = it.w >= 2;
      return `<article class="card tl${it.final ? ' final' : ''}">
        <div class="tl-head"><span class="tl-step">${it.step}</span><span class="votes" title="${it.w} of 3 judges prefer this artifact over the expert's">${pips}<span class="${win ? 'win' : 'loss'}">${win ? 'Win' : 'Loss'} ${it.w}:${3 - it.w}</span></span></div>
        <h3>${it.title}</h3>
        <div class="tl-skill">${it.skill}</div>
        <p>${it.raised}</p>
        <p class="changed"><b>${it.step === 'Initial' ? 'Gap' : 'Worker changed'}</b>${it.changed}</p>
      </article>`;
    }).join('');
  })();

  // ---------------- bibtex copy ----------------
  $('#copyBib').addEventListener('click', async () => {
    const txt = $('#bibtex').innerText;
    try { await navigator.clipboard.writeText(txt); $('#copyBib').textContent = 'Copied'; }
    catch (e) {
      const r = document.createRange(); r.selectNodeContents($('#bibtex')); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      $('#copyBib').textContent = 'Press ⌘C';
    }
    setTimeout(() => { $('#copyBib').textContent = 'Copy'; }, 1600);
  });
})();
