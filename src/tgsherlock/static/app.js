/* TGSherlock web panel — vanilla JS, no build step. All Telegram content is rendered as text (never HTML). */
(() => {
'use strict';

// ===========================================================================
// DOM helpers
// ===========================================================================
const SVGNS = 'http://www.w3.org/2000/svg';
const ICONS = {
  dashboard: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
  live: 'M22 12h-4l-3 9L9 3l-3 9H2',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.9 1.9 0 0 0 3.4 0',
  profile: 'M6 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M2 21v-1a7 7 0 0 1 10-6.3 M15 18a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M21.5 21.5l-1.8-1.8',
  search: 'M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M21 21l-4.3-4.3',
  history: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 8h8 M8 12h5',
  sweep: 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 12h10',
  tracker: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0 M22 12h-4 M6 12H2 M12 6V2 M12 22v-4',
  hash: 'M4 9h16 M4 15h16 M10 3L8 21 M16 3l-2 18',
  db: 'M3 5a9 3 0 1 0 18 0a9 3 0 1 0-18 0 M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5 M3 12c0 1.7 4 3 9 3s9-1.3 9-3',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  panel: 'M3 5h18v14H3z M9 5v14',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  x: 'M6 6l12 12 M18 6L6 18',
  plus: 'M12 5v14 M5 12h14',
  check: 'M20 6L9 17l-5-5',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  userplus: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M19 8v6 M22 11h-6',
  swap: 'M16 3l4 4-4 4 M20 7H4 M8 21l-4-4 4-4 M4 17h16',
  chevrons: 'M7 15l5 5 5-5 M7 9l5-5 5 5',
  play: 'M7 4l13 8-13 8z',
  stop: 'M6 6h12v12H6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6',
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  copy: 'M9 9h11v11H9z M5 15H4V4h11v1',
  alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
  info: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0 M12 16v-4 M12 8h.01',
  clock: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0 M12 7v5l3 2',
  clip: 'M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
  monitor: 'M2 5h20v12H2z M8 21h8 M12 17v4',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  qr: 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M8 8h3v3H8z M13 13h3v3h-3z',
  mail: 'M3 5h18v14H3z M3 6l9 7 9-7',
  power: 'M18.4 6.6a9 9 0 1 1-12.8 0 M12 2v10',
  ext: 'M15 3h6v6 M10 14L21 3 M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5',
};

function icon(name, size = 18, sw = 1.8) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', sw);
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', ICONS[name] || ICONS.info);
  s.appendChild(p);
  return s;
}

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let value;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') value = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  append(el, kids);
  if (value !== undefined) el.value = value;
  return el;
}

const $ = (sel, root = document) => root.querySelector(sel);
function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

// ===========================================================================
// formatting
// ===========================================================================
const pad = (n) => String(n).padStart(2, '0');
function toDate(iso) { const d = new Date(iso); return isNaN(d) ? null : d; }
function fmtDate(iso, sec) {
  const d = toDate(iso); if (!d) return iso ? String(iso) : '—';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}${sec ? ':' + pad(d.getSeconds()) : ''}`;
}
function fmtDay(iso) { const d = toDate(iso); return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '—'; }
function fmtTime(iso, sec) { const d = toDate(iso); return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}${sec ? ':' + pad(d.getSeconds()) : ''}` : '—'; }
function rel(iso) {
  const d = toDate(iso); if (!d) return 'never';
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
  return fmtDay(iso);
}
const num = (n) => Number(n || 0).toLocaleString('en-US');
function bytes(n) { if (!n) return '0 B'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < 3) { n /= 1024; i++; } return `${n.toFixed(i ? 1 : 0)} ${u[i]}`; }
const RISK_LABEL = { high: 'High risk', watch: 'Watch', clean: 'Clean' };
const SEV_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
const SOURCE_LABEL = { live: 'Live monitor', alert: 'Alert rule', history: 'Group history', sweep: 'Keyword sweep', tracker: 'User tracker', profile: 'Profile scan' };
const ENTITY_TYPES = ['Email', 'Phone', 'URL', 'IP', 'Crypto wallet', 'Invite link', 'Username', 'Hashtag'];

// ===========================================================================
// API
// ===========================================================================
async function api(path, opts = {}) {
  const init = { method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'), headers: { 'X-TGS': '1' } };
  if (opts.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
  let r;
  try { r = await fetch('/api' + path, init); } catch (e) { throw new Error('The TGSherlock server is not reachable.'); }
  let data = {};
  try { data = await r.json(); } catch (e) { /* empty */ }
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status}).`);
  return data;
}
const qs = (o) => Object.entries(o).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
function download(params) { window.open('/api/export?' + qs(params), '_blank'); }

// ===========================================================================
// UI building blocks
// ===========================================================================
const AV_BG = ['#1E3F5A', '#3A2430', '#1F3A33', '#3A3320', '#2A2A40', '#173438', '#3A2A1E', '#24304A'];
function initials(name) {
  const words = String(name || '?').replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return ((words[0][0] || '') + (words[1] ? words[1][0] : '')).toUpperCase();
}
function avatar(id, name, size = 36, photo = true, big = false) {
  const seed = Math.abs(parseInt(String(id || '0').slice(-4), 10) || 0);
  const el = h('span', { class: 'avatar', 'aria-hidden': 'true',
    style: `width:${size}px;height:${size}px;background:${AV_BG[seed % AV_BG.length]};font-size:${Math.round(size * 0.36)}px` }, initials(name));
  if (photo && id != null && id !== '' && S.status && S.status.authorized) {
    const img = h('img', { alt: '', loading: 'lazy', decoding: 'async', src: `/api/avatar/${id}${big ? '?big=1' : ''}` });
    img.addEventListener('error', () => img.remove());
    el.appendChild(img);
  }
  return el;
}
function wordmark(xl) {
  return h('div', { class: 'wordmark' + (xl ? ' xl' : ''), role: 'img', 'aria-label': 'TGSherlock' },
    h('div', { class: 'wm-main', 'aria-hidden': 'true' }, h('span', { class: 'wm-tg' }, 'TG'), h('span', { class: 'wm-sh' }, 'SHERLOCK')),
    h('div', { class: 'wm-sub', 'aria-hidden': 'true' }, 'Telegram OSINT'));
}
function toast(msg, kind = 'info', title) {
  const ic = { ok: 'check', err: 'alert', warn: 'clock', info: 'info' }[kind] || 'info';
  const el = h('div', { class: `toast ${kind}`, role: kind === 'err' ? 'alert' : 'status' },
    h('span', { class: 'ic' }, icon(ic, 16, 2.2)), h('div', null, title ? h('b', null, title) : null, msg));
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'err' ? 7000 : 4500);
}
function confirmBox({ title, text, ok = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const close = (v) => { bg.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    const okBtn = h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, type: 'button', onclick: () => close(true) }, ok);
    const bg = h('div', { class: 'modal-bg', onclick: (e) => { if (e.target === bg) close(false); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-t' },
        h('h2', { id: 'modal-t' }, title), text ? h('p', null, text) : null,
        h('div', { class: 'acts' }, h('button', { class: 'btn', type: 'button', onclick: () => close(false) }, 'Cancel'), okBtn)));
    document.body.appendChild(bg);
    document.addEventListener('keydown', onKey);
    okBtn.focus();
  });
}
async function busy(btn, fn) {
  if (!btn || btn.disabled) return undefined;
  const old = [...btn.childNodes];
  btn.disabled = true;
  btn.prepend(h('span', { class: 'spinner' }));
  try { return await fn(); }
  catch (e) { toast(e.message, 'err'); return undefined; }
  finally { btn.disabled = false; clear(btn); old.forEach((n) => btn.appendChild(n)); }
}
function copyText(text) {
  const done = () => toast('Copied to clipboard.', 'ok');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(String(text)).then(done, () => toast('Copy failed.', 'err'));
  else { const t = h('textarea', { style: 'position:fixed;opacity:0' }); t.value = String(text); document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed.', 'err'); } t.remove(); }
}
const copyBtn = (text, label = 'Copy') => h('button', { class: 'copy', type: 'button', 'aria-label': label, title: label, onclick: () => copyText(text) }, icon('copy', 14));
const card = (...kids) => h('section', { class: 'card' }, ...kids);
function cardHead(title, ...right) { return h('div', { class: 'card-head' }, h('h2', null, title), right.length ? h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;align-items:center' }, ...right) : null); }
function tile(k, v, n, color) { return h('div', { class: 'tile' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, v), n ? h('span', { class: 'n', style: color ? `color:${color}` : null }, n) : null); }
const smallTile = (k, v) => h('div', { class: 'tile sm' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, v == null || v === '' ? '—' : v));
const badge = (cls, text) => h('span', { class: `badge ${cls}` }, text);
const riskBadge = (r) => badge(r || 'clean', RISK_LABEL[r] || 'Clean');
function empty(text, iconName = 'info', action) { return h('div', { class: 'empty' }, icon(iconName, 26), h('div', null, text), action || null); }
const loading = (text = 'Loading…') => h('div', { class: 'empty', style: 'border-style:solid' }, h('span', { class: 'spinner' }), text);
function errorBox(text, retry) { return h('div', { class: 'banner err' }, icon('alert', 16), h('span', { style: 'flex:1' }, text), retry ? h('button', { class: 'btn sm', type: 'button', onclick: retry }, 'Retry') : null); }
function exportBtns(params) {
  return ['csv', 'json', 'html'].map((f) => h('button', { class: 'btn sm', type: 'button', onclick: () => download(Object.assign({}, params, { format: f })) }, icon('download', 14), f === 'html' ? 'Report' : f.toUpperCase()));
}
function seg(options, current, onPick, label) {
  return h('div', { class: 'seg', role: 'group', 'aria-label': label },
    options.map(([k, text]) => h('button', { type: 'button', 'aria-pressed': String(k === current), onclick: () => onPick(k) }, text)));
}
function pills(options, current, onPick, label) {
  return h('div', { class: 'pills', role: 'group', 'aria-label': label },
    options.map(([k, text, count]) => h('button', { class: 'pill', type: 'button', 'aria-pressed': String(k === current), onclick: () => onPick(k) }, text, count != null ? h('span', { class: 'c' }, num(count)) : null)));
}
function field(label, input, cls) {
  const id = input.id || ('f-' + Math.random().toString(36).slice(2, 9));
  input.id = id;
  return h('div', { class: 'field' + (cls ? ' ' + cls : '') }, h('label', { for: id }, label), input);
}
const input = (attrs) => h('input', Object.assign({ class: 'input', type: 'text', autocomplete: 'off', spellcheck: 'false' }, attrs));
function switchBtn(checked, label, onChange) {
  const b = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(!!checked), 'aria-label': label });
  b.addEventListener('click', () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); onChange(v, b); });
  return b;
}
function settingRow(label, hint, control) { return h('div', { class: 'setting' }, h('div', { class: 't' }, h('span', null, label), hint ? h('span', null, hint) : null), control); }
function who(id, name, username, size = 30) {
  return h('div', { class: 'who' }, avatar(id, name, size),
    h('div', { class: 'nm' }, h('b', { title: name || '' }, name || String(id || '—')), h('span', null, username ? '@' + username : String(id || ''))));
}
function highlight(text, terms) {
  const frag = document.createDocumentFragment();
  const t = String(text || '');
  const list = (terms || []).filter(Boolean).map((x) => x.toLowerCase());
  if (!list.length) { frag.appendChild(document.createTextNode(t)); return frag; }
  const lower = t.toLowerCase();
  let i = 0;
  while (i < t.length) {
    let best = -1, len = 0;
    for (const term of list) { const j = lower.indexOf(term, i); if (j !== -1 && (best === -1 || j < best)) { best = j; len = term.length; } }
    if (best === -1) { frag.appendChild(document.createTextNode(t.slice(i))); break; }
    if (best > i) frag.appendChild(document.createTextNode(t.slice(i, best)));
    frag.appendChild(h('mark', null, t.slice(best, best + len)));
    i = best + len;
  }
  return frag;
}
function chipEditor(values, { placeholder, cls = '', onChange, label }) {
  const box = h('div', { class: 'chips' });
  const inp = h('input', { type: 'text', placeholder, 'aria-label': label || placeholder, autocomplete: 'off' });
  function paint() {
    clear(box);
    values.forEach((v, i) => box.appendChild(h('span', { class: 'chip ' + cls }, v,
      h('button', { class: 'x', type: 'button', 'aria-label': `Remove ${v}`, onclick: () => { values.splice(i, 1); paint(); onChange && onChange(values); } }, icon('x', 12, 2.4)))));
    box.appendChild(inp);
  }
  function add() {
    const parts = inp.value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    let changed = false;
    for (const p of parts) if (!values.some((v) => v.toLowerCase() === p.toLowerCase())) { values.push(p); changed = true; }
    inp.value = '';
    paint(); inp.focus();
    if (changed && onChange) onChange(values);
  }
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
    else if (e.key === 'Backspace' && !inp.value && values.length) { values.pop(); paint(); inp.focus(); onChange && onChange(values); }
  });
  inp.addEventListener('blur', () => { if (inp.value.trim()) add(); });
  box.addEventListener('click', (e) => { if (e.target === box) inp.focus(); });
  paint();
  box.input = inp;
  return box;
}
function localHours(utc) {
  const off = Math.round(-new Date().getTimezoneOffset() / 60);
  return Array.from({ length: 24 }, (_, hh) => utc[((hh - off) % 24 + 24) % 24] || 0);
}
function heatStrip(utcHours) {
  const hours = localHours(utcHours);
  const mx = Math.max(1, ...hours);
  return [
    h('div', { class: 'heat', role: 'img', 'aria-label': 'Messages by hour of day (local time)' },
      hours.map((v, i) => h('div', { title: `${pad(i)}:00 — ${v} messages`, style: v ? `background:rgba(54,194,204,${(0.18 + 0.82 * v / mx).toFixed(2)})` : null }))),
    h('div', { class: 'axis' }, ['00', '06', '12', '18', '23'].map((x) => h('span', null, x))),
  ];
}
function mediaBlock(m) {
  if (!m.media) return null;
  if (m.media_url && m.media === 'photo') return h('a', { href: m.media_url, target: '_blank', rel: 'noopener' }, h('img', { class: 'media-thumb', src: m.media_url, alt: 'Attached photo', loading: 'lazy' }));
  const label = m.media_path || m.media;
  return m.media_url
    ? h('a', { class: 'badge', href: m.media_url, target: '_blank', rel: 'noopener' }, icon('clip', 12, 2), label)
    : h('span', { class: 'badge' }, icon('clip', 12, 2), label);
}

// ===========================================================================
// message detail drawer + conversation
// ===========================================================================
const URL_RX = /https?:\/\/[^\s<>"'()\[\]]+/g;
function tgLink(m) {
  if (!m || !m.msg_id) return null;
  const cid = String(m.chat_id || '');
  if (m.chat_username) return `https://t.me/${m.chat_username}/${m.msg_id}`;
  if (cid.startsWith('-100')) return `https://t.me/c/${cid.slice(4)}/${m.msg_id}`;
  return null;
}
function linkChips(text, preview) {
  const urls = [...new Set(String(text || '').match(URL_RX) || [])].slice(0, 8);
  const out = urls.map((u) => h('a', { class: 'link-chip', href: u, target: '_blank', rel: 'noopener noreferrer', title: u }, icon('ext', 12), u.replace(/^https?:\/\//, '')));
  if (preview && preview.url && !urls.includes(preview.url)) {
    out.unshift(h('a', { class: 'link-chip', href: preview.url, target: '_blank', rel: 'noopener noreferrer', title: preview.url }, icon('clip', 12), [preview.site, preview.title].filter(Boolean).join(' · ') || preview.url));
  }
  return out;
}
let drawerEl = null;
function drawerKey(e) { if (e.key === 'Escape') closeDrawer(); }
function closeDrawer() { if (drawerEl) { drawerEl.remove(); drawerEl = null; document.removeEventListener('keydown', drawerKey); } }
function openMessage(m, terms) {
  closeDrawer();
  const x = m.extra || {};
  const link = tgLink(m);
  const meta = [
    ['Time', fmtDate(m.date, true)],
    ['Time (UTC)', m.date],
    ['Chat', m.chat_title || '—'],
    ['Chat type', m.chat_type || '—'],
    ['Chat ID', m.chat_id, true],
    m.chat_username ? ['Chat username', '@' + m.chat_username] : null,
    ['Sender', m.sender_name || '—'],
    ['Username', m.sender_username ? '@' + m.sender_username : '—'],
    ['Sender ID', m.sender_id, true],
    ['Message ID', m.msg_id, true],
    x.views != null ? ['Views', num(x.views)] : null,
    x.forwards ? ['Forwards', num(x.forwards)] : null,
    x.replies ? ['Replies', num(x.replies)] : null,
    x.reply_to ? ['Reply to message', '#' + x.reply_to] : null,
    x.topic_id ? ['Forum topic', '#' + x.topic_id] : null,
    x.fwd_from ? ['Forwarded from', x.fwd_from + (x.fwd_date ? ` · ${fmtDate(x.fwd_date)}` : '')] : null,
    x.post_author ? ['Signed by', x.post_author] : null,
    x.via_bot ? ['Sent via bot', x.via_bot] : null,
    x.edited ? ['Edited', fmtDate(x.edited, true)] : null,
    (x.file_name || x.mime) ? ['File', [x.file_name, x.mime, x.file_size ? bytes(x.file_size) : null].filter(Boolean).join(' · ')] : (m.media ? ['Media', m.media] : null),
    x.album ? ['Album', String(x.album)] : null,
    x.pinned ? ['Pinned', 'Yes'] : null,
    x.protected ? ['Protected content', 'Yes'] : null,
    m.risk ? ['Risk', riskBadge(m.risk)] : null,
    m.source ? ['Collected by', SOURCE_LABEL[m.source] || m.source] : null,
    m.captured_at ? ['Captured', fmtDate(m.captured_at, true)] : null,
  ].filter(Boolean);
  const metaList = h('dl', { class: 'meta-list' }, meta.map(([k, v, copy]) => [h('dt', null, k),
    h('dd', null, v instanceof Node ? v : String(v == null || v === '' ? '—' : v), copy && v != null && v !== '' ? copyBtn(v) : null)]));
  const convo = h('div');
  const acts = h('div', { class: 'drawer-acts' },
    link ? h('a', { class: 'btn sm primary', href: link, target: '_blank', rel: 'noopener noreferrer' }, icon('ext', 14), 'Open in Telegram') : null,
    m.text ? h('button', { class: 'btn sm', type: 'button', onclick: () => copyText(m.text) }, icon('copy', 14), 'Copy text') : null,
    link ? h('button', { class: 'btn sm', type: 'button', onclick: () => copyText(link) }, icon('copy', 14), 'Copy link') : null,
    m.sender_id > 0 ? h('button', { class: 'btn sm', type: 'button', onclick: () => { closeDrawer(); go('profile', { q: m.sender_username ? '@' + m.sender_username : String(m.sender_id) }); } }, icon('profile', 14), 'Sender profile') : null,
    m.chat_id && String(m.chat_id).startsWith('-') ? h('button', { class: 'btn sm', type: 'button', onclick: () => { closeDrawer(); go('history', { target: m.chat_username ? '@' + m.chat_username : String(m.chat_id) }); } }, icon('history', 14), 'Chat history') : null);
  drawerEl = h('div', { class: 'drawer-bg', onclick: (e) => { if (e.target === drawerEl) closeDrawer(); } },
    h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Message details' },
      h('div', { class: 'drawer-head' },
        h('div', { style: 'display:flex;gap:12px;align-items:center;min-width:0' }, avatar(m.sender_id, m.sender_name, 40),
          h('div', { style: 'min-width:0' }, h('h2', null, m.sender_name || 'Message'), h('p', null, `${m.chat_title || 'Private chat'} · ${fmtDate(m.date, true)}`))),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: closeDrawer }, icon('x', 16, 2.2))),
      acts,
      h('div', { class: 'drawer-body' },
        h('section', null, h('div', { class: 'sec-t' }, 'Content'),
          h('div', { class: 'content-box' }, m.text ? highlight(m.text, terms) : h('span', { class: 'muted' }, `[${m.media || 'no text'}]`)),
          h('div', { class: 'chip-row' }, linkChips(m.text, x.link_preview), (m.entities || []).filter((v) => !/^https?:/.test(v)).map((v) => h('span', { class: 'ent', title: v }, v))),
          m.media_url ? h('div', { style: 'margin-top:10px' }, mediaBlock(m)) : null),
        h('section', null, h('div', { class: 'sec-t' }, 'Metadata'), metaList),
        h('section', null, h('div', { class: 'sec-t' }, 'Conversation', h('span', { style: 'text-transform:none;letter-spacing:0;font-weight:400' }, 'Message context and thread')), convo))));
  document.body.appendChild(drawerEl);
  document.addEventListener('keydown', drawerKey);
  drawerEl.querySelector('.icon-btn').focus();
  loadConversation(m, convo, terms);
}
async function loadConversation(m, box, terms) {
  if (!m.chat_id || !m.msg_id) { box.appendChild(h('p', { class: 'hint' }, 'No conversation available for this item.')); return; }
  box.appendChild(loading('Loading conversation from Telegram…'));
  const list = h('div', { class: 'convo-list' });
  let firstId = null, lastDay = null;
  const moreBtn = h('button', { class: 'btn ghost sm', type: 'button', style: 'align-self:center' }, '↑ Load earlier messages');
  function bubble(c) {
    return h('div', { class: 'bubble' + (c.focus ? ' focus' : '') }, avatar(c.sender_id, c.sender_name, 32),
      h('button', { class: 'b-body', type: 'button', onclick: () => { if (!c.focus) openMessage(c, terms); } },
        h('div', { class: 'b-head' }, h('b', null, c.sender_name || 'Unknown'), h('span', { class: 'mono muted small' }, fmtTime(c.date, true)),
          c.focus ? badge('accent', 'This message') : null, c.extra && c.extra.fwd_from ? h('span', { class: 'muted small' }, `↪ ${c.extra.fwd_from}`) : null),
        h('div', { class: 'b-text' }, c.text ? highlight(c.text, terms) : h('span', { class: 'muted' }, `[${c.media || 'media'}]`)),
        h('div', { class: 'chip-row' }, c.media ? h('span', { class: 'badge' }, icon('clip', 12, 2), (c.extra && c.extra.file_name) || c.media) : null, linkChips(c.text, c.extra && c.extra.link_preview))));
  }
  function render(msgs, prepend) {
    const frag = document.createDocumentFragment();
    let day = prepend ? null : lastDay;
    msgs.forEach((c) => { const d = fmtDay(c.date); if (d !== day) { day = d; frag.appendChild(h('div', { class: 'convo-day' }, d)); } frag.appendChild(bubble(c)); });
    if (prepend) { const firstDay = list.querySelector('.convo-day'); if (firstDay && firstDay.textContent === day) firstDay.remove(); list.prepend(frag); }
    else { list.appendChild(frag); lastDay = day; }
    if (msgs.length) firstId = Math.min(firstId || Infinity, ...msgs.map((c) => c.msg_id));
  }
  try {
    const d = await api('/context?' + qs({ chat_id: m.chat_id, msg_id: m.msg_id, before: 15, after: 5 }));
    clear(box);
    if (!d.messages.length) { box.appendChild(h('p', { class: 'hint' }, 'Telegram returned no messages around this one.')); return; }
    render(d.messages);
    moreBtn.hidden = !d.has_more;
    moreBtn.addEventListener('click', () => busy(moreBtn, async () => {
      const e = await api('/context?' + qs({ chat_id: m.chat_id, msg_id: firstId, before: 20, after: -1 }));
      render(e.messages, true);
      moreBtn.hidden = !e.has_more;
    }));
    const scroller = h('div', { class: 'scroll-box', style: 'position:relative;max-height:560px' }, h('div', { class: 'stack' }, moreBtn, list));
    box.append(scroller);
    const f = list.querySelector('.bubble.focus');
    if (f) requestAnimationFrame(() => { scroller.scrollTop = Math.max(0, f.offsetTop - scroller.clientHeight / 2 + f.offsetHeight / 2); });
  } catch (e) {
    clear(box).appendChild(h('p', { class: 'hint' }, `Conversation unavailable: ${e.message}`));
  }
}
function tabbed(kind, tabs) {
  S.resTab = S.resTab || {};
  const avail = tabs.filter(Boolean);
  let cur = avail.some((t) => t[0] === S.resTab[kind]) ? S.resTab[kind] : avail[0][0];
  const head = h('div', { class: 'tabs', role: 'tablist' });
  const slot = h('div', { class: 'stack', style: 'gap:12px' });
  function paint() {
    clear(head);
    avail.forEach(([k, label]) => head.appendChild(h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === cur), onclick: () => { cur = k; S.resTab[kind] = k; paint(); } }, label)));
    clear(slot).appendChild(avail.find((t) => t[0] === cur)[2]());
  }
  paint();
  return h('section', { class: 'card' }, head, slot);
}
function sendersPane(j) {
  if (!j.senders || !j.senders.length) return empty('No senders yet.', 'users');
  const total = j.senders.reduce((a, s) => a + s.n, 0) || 1;
  return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, ['#', 'Sender', 'Messages', 'Share', 'First message', 'Last message', ''].map((c) => h('th', null, c)))),
    h('tbody', null, j.senders.map((s, i) => h('tr', null,
      h('td', { class: 'mono muted' }, String(i + 1)),
      h('td', null, who(s.sender_id, s.sender_name, s.sender_username, 28)),
      h('td', { class: 'mono' }, num(s.n)),
      h('td', null, h('div', { class: 'share', title: `${Math.round((s.n / total) * 100)}%` }, h('i', { style: `width:${(s.n / j.senders[0].n) * 100}%` }))),
      h('td', { class: 'date' }, fmtDate(s.first)), h('td', { class: 'date' }, fmtDate(s.last)),
      h('td', null, s.sender_id > 0 ? h('button', { class: 'btn sm', type: 'button', onclick: () => go('profile', { q: s.sender_username ? '@' + s.sender_username : String(s.sender_id) }) }, 'Profile') : null))))));
}
function activityPane(j) {
  const days = j.per_day || [];
  if (!days.length) return empty('No activity yet.', 'clock');
  const mx = Math.max(1, ...days.map((d) => d.n));
  const bars = h('div', { class: 'bars', role: 'img', 'aria-label': 'Messages per day' }, days.map((d) => {
    const b = h('div', { class: 'bar', style: `height:${Math.max(3, (d.n / mx) * 100)}%`, title: `${d.day} · ${d.n} messages, ${d.high || 0} high risk` });
    if (d.high) b.appendChild(h('i', { style: `height:${(d.high / d.n) * 100}%` }));
    return b;
  }));
  const mid = days[Math.floor(days.length / 2)];
  return h('div', { class: 'stack', style: 'gap:14px' },
    h('div', { class: 'card-head' }, h('b', null, `Messages per day · ${days.length} days`), h('div', { class: 'legend' }, h('span', null, h('i', { style: 'background:#2C6E78' }), 'All'), h('span', null, h('i', { style: 'background:var(--red)' }), 'High risk'))),
    bars, h('div', { class: 'axis' }, h('span', null, days[0].day), h('span', null, mid.day), h('span', null, days[days.length - 1].day)),
    (j.media_stats || []).length ? h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;align-items:center' }, h('span', { class: 'muted small' }, 'Media:'), j.media_stats.map((s) => badge('', `${s.media} · ${num(s.n)}`))) : null);
}
function membersPane(j) {
  const all = j.members || [];
  const note = j.info && j.info.members_note ? h('div', { class: 'banner info' }, icon('info', 16), j.info.members_note) : null;
  if (!all.length) return h('div', { class: 'stack' }, note, empty('No members could be listed.', 'users'));
  const f = input({ placeholder: 'Filter by name, @username, ID or role…', 'aria-label': 'Filter members' });
  const slot = h('div');
  function paint() {
    const q = f.value.trim().toLowerCase();
    const list = q ? all.filter((m) => [m.name, m.username, String(m.user_id), m.role, m.phone].join(' ').toLowerCase().includes(q)) : all;
    clear(slot).appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ['Member', 'User ID', 'Role', 'Joined', 'Last seen', 'Flags', ''].map((c) => h('th', null, c)))),
      h('tbody', null, list.slice(0, 1500).map((m) => h('tr', null,
        h('td', null, h('div', { class: 'who' }, avatar(m.user_id, m.name, 30, m.photo), h('div', { class: 'nm' }, h('b', { title: m.name }, m.name), h('span', null, [m.username ? '@' + m.username : null, m.phone ? '+' + m.phone : null].filter(Boolean).join(' · ') || '—')))),
        h('td', { class: 'mono' }, String(m.user_id), copyBtn(m.user_id)),
        h('td', null, /Creator|Admin/.test(m.role) ? badge('accent', m.role) : h('span', { class: 'muted' }, m.role)),
        h('td', { class: 'date' }, m.joined ? fmtDate(m.joined) : '—'),
        h('td', { class: 'small muted nowrap' }, m.seen_at ? `${rel(m.seen_at)}` : m.status.replace('Last seen ', '')),
        h('td', null, h('div', { style: 'display:flex;gap:4px;flex-wrap:wrap' }, m.flags.map((x) => badge(['Scam', 'Fake', 'Deleted'].includes(x) ? 'high' : 'accent', x)))),
        h('td', null, h('button', { class: 'btn sm', type: 'button', onclick: () => go('profile', { q: m.username ? '@' + m.username : String(m.user_id) }) }, 'Profile'))))))));
    if (list.length > 1500) slot.appendChild(h('p', { class: 'hint' }, `Showing 1,500 of ${num(list.length)} — export for all.`));
  }
  f.addEventListener('input', paint);
  paint();
  return h('div', { class: 'stack', style: 'gap:12px' }, note,
    h('div', { class: 'card-head' }, h('div', { style: 'flex:1 1 280px;max-width:420px' }, f), h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, exportBtns({ scope: 'members', id: j.id }))), slot);
}

// ===========================================================================
// state / routing
// ===========================================================================
const S = {
  status: null, mode: null, shell: null, view: null, cleanup: null, token: null,
  collapsed: lsGet('tgs.collapsed') === '1', addingAccount: false,
  liveFilter: 'all', liveHideBefore: 0, alertTab: 'inbox', alertFilter: 'all', editRule: null,
  jobs: { history: null, sweep: null, tracker: null }, prefill: {}, settings: null,
  onJob: null, onLive: null, refreshAlerts: null, es: null, online: true,
};

const NAV = [
  { title: 'Overview', items: [['dashboard', 'Dashboard', 'dashboard'], ['live', 'Live Monitor', 'live'], ['alerts', 'Alerts', 'bell']] },
  { title: 'Investigate', items: [['profile', 'User Profile', 'profile'], ['search', 'Search', 'search'], ['history', 'Group History', 'history'], ['sweep', 'Keyword Sweep', 'sweep'], ['tracker', 'User Tracker', 'tracker']] },
  { title: 'Intelligence', items: [['entities', 'Entities', 'hash'], ['archive', 'Archive', 'db']] },
  { title: 'System', items: [['settings', 'Settings', 'sliders']] },
];
const TITLES = {
  dashboard: ['Dashboard', 'Overview of everything captured by this account.'],
  live: ['Live Monitor', 'Real-time capture of messages from selected users and groups.'],
  alerts: ['Alerts', 'Rules that watch users, groups or keywords and notify you.'],
  profile: ['User Profile', 'Look up an account: bio, shared groups, activity and timeline.'],
  search: ['Search', 'Find users, channels and groups by name or keyword.'],
  history: ['Group History', 'Pull message history from a group, channel or invite link.'],
  sweep: ['Keyword Sweep', 'Search every chat you are in for keywords or patterns.'],
  tracker: ['User Tracker', 'Every message a user posted across your groups, with dates.'],
  entities: ['Entities', 'Indicators extracted from collected messages.'],
  archive: ['Archive', 'Everything stored in the local database.'],
  settings: ['Settings', 'Accounts, email alerts, keywords and preferences.'],
};
const VIEWS = {};

function currentView() { const k = location.hash.replace(/^#\/?/, '').split('?')[0]; return VIEWS[k] ? k : 'dashboard'; }
function go(view, prefill) {
  if (prefill) S.prefill[view] = prefill;
  if (currentView() !== view || location.hash !== '#/' + view) location.hash = '#/' + view;
  else renderView();
}
window.addEventListener('hashchange', () => { if (S.mode === 'shell') renderView(); });

// ===========================================================================
// app modes
// ===========================================================================
function decideMode() {
  const st = S.status;
  if (!st) return 'boot';
  if (S.addingAccount) return 'setup';
  if (st.authorized) return 'shell';
  if (st.connecting) return 'connecting';
  return 'setup';
}
function renderApp() {
  S.mode = decideMode();
  closePop();
  if (S.cleanup) { try { S.cleanup(); } catch (e) { /* ignore */ } S.cleanup = null; }
  S.shell = null;
  stopSetupPoll();
  const root = clear($('#app'));
  if (S.mode === 'shell') buildShell(root);
  else if (S.mode === 'setup') buildSetup(root);
  else root.appendChild(h('div', { class: 'boot' }, h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:18px;color:var(--muted)' },
    h('img', { src: '/static/logo-sm.png', alt: '', width: 72, height: 72 }), S.mode === 'connecting' ? 'Connecting to Telegram…' : '')));
}
function onStatus(st) {
  const prev = S.status;
  S.status = st;
  const mode = decideMode();
  const switched = prev && prev.account && st.account && prev.account.id !== st.account.id;
  if (mode !== S.mode || (mode === 'shell' && switched)) {
    if (switched) { S.jobs = { history: null, sweep: null, tracker: null }; S.editRule = null; S.settings = null; }
    renderApp();
    return;
  }
  if (mode === 'shell') updateChrome();
}

// ===========================================================================
// shell
// ===========================================================================
function buildShell(root) {
  const navBtns = {};
  const side = h('aside', { class: 'side' + (S.collapsed ? ' collapsed' : ''), 'aria-label': 'Sidebar' });
  const head = h('div', { class: 'side-head' },
    h('a', { class: 'brand', href: '#/dashboard', title: 'TGSherlock' }, h('img', { src: '/static/logo-sm.png', alt: '' }), wordmark()));
  const nav = h('nav', { class: 'nav', 'aria-label': 'Main' }, NAV.map((g) => h('div', { class: 'nav-group' },
    h('div', { class: 'nav-title' }, g.title),
    g.items.map(([key, label, ic]) => {
      const extra = h('span', { style: 'display:inline-flex' });
      const b = h('button', { class: 'nav-btn', type: 'button', title: label, onclick: () => { go(key); closeNav(); } }, icon(ic), h('span', { class: 'lbl' }, label), extra);
      b.extra = extra;
      navBtns[key] = b;
      return b;
    }))));
  const acct = h('div', { class: 'acct' });
  append(side, [head, nav, acct]);

  const title = h('h1'); const desc = h('p');
  const conn = h('span', { class: 'conn', title: 'Connection to the local server' }, h('i'), h('span', null, 'Online'));
  const quickInput = h('input', { type: 'search', placeholder: '@username, user ID or t.me link', 'aria-label': 'Quick lookup', autocomplete: 'off' });
  const quick = h('form', { class: 'quick', role: 'search', onsubmit: (e) => {
    e.preventDefault(); const q = quickInput.value.trim(); if (!q) return;
    quickInput.value = '';
    if (/t\.me\/(\+|joinchat\/)/i.test(q)) go('history', { target: q, auto: true }); else go('profile', { q });
  } }, icon('search', 16), quickInput, h('span', { class: 'kbd', 'aria-hidden': 'true' }, '/'));
  const pip = h('span', { class: 'pip', hidden: true });
  const bell = h('button', { class: 'icon-btn bell', type: 'button', 'aria-label': 'Alerts', title: 'Alerts', style: 'width:40px;height:40px', onclick: () => go('alerts') }, icon('bell'), pip);
  const topbar = h('header', { class: 'topbar' },
    h('div', { class: 'top-left' },
      h('button', { class: 'icon-btn side-toggle', type: 'button', 'aria-label': 'Toggle sidebar', title: 'Toggle sidebar', onclick: (e) => {
        e.stopPropagation();
        if (window.matchMedia('(max-width: 900px)').matches) { shellEl.classList.toggle('nav-open'); return; }
        S.collapsed = !S.collapsed; lsSet('tgs.collapsed', S.collapsed ? '1' : '0'); side.classList.toggle('collapsed', S.collapsed);
      } }, icon('panel')),
      h('div', null, title, desc)),
    h('div', { class: 'top-right' }, quick, conn, bell));
  const view = h('div', { class: 'view', id: 'view' });
  const main = h('main', { class: 'main' }, topbar, view);
  const shellEl = h('div', { class: 'shell' }, side, main);
  root.appendChild(shellEl);
  S.shell = { shellEl, side, navBtns, title, desc, view, acct, pip, conn, quickInput };
  updateChrome();
  renderView();
}
function closeNav() { if (S.shell) S.shell.shellEl.classList.remove('nav-open'); }

function updateChrome() {
  const sh = S.shell; const st = S.status;
  if (!sh || !st) return;
  clear(sh.navBtns.live.extra);
  if (st.live.running) sh.navBtns.live.extra.appendChild(h('span', { class: 'dot-live', title: 'Live monitor running' }));
  clear(sh.navBtns.alerts.extra);
  if (st.unread) sh.navBtns.alerts.extra.appendChild(h('span', { class: 'count' }, st.unread > 99 ? '99+' : String(st.unread)));
  sh.pip.hidden = !st.unread;
  setConn(S.online);
  const a = st.account || {};
  clear(sh.acct).appendChild(h('button', { class: 'acct-btn', type: 'button', 'aria-haspopup': 'menu', title: 'Account', onclick: (e) => { e.stopPropagation(); togglePop(); } },
    avatar(a.id, a.name, 34),
    h('span', { class: 'acct-meta' }, h('span', { class: 'acct-name' }, a.name || 'Account'),
      h('span', { class: 'acct-sub' }, h('i', { style: 'width:7px;height:7px;border-radius:50%;background:var(--green);display:inline-block;flex:0 0 auto' }), a.username ? '@' + a.username : 'Connected')),
    icon('chevrons', 16)));
}
function setConn(online) {
  S.online = online;
  if (!S.shell) return;
  S.shell.conn.classList.toggle('off', !online);
  S.shell.conn.lastChild.textContent = online ? 'Online' : 'Reconnecting…';
}

let popEl = null;
function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
function togglePop() {
  if (popEl) { closePop(); return; }
  const st = S.status;
  popEl = h('div', { class: 'popover', role: 'menu', onclick: (e) => e.stopPropagation() },
    h('div', { class: 'pop-label' }, 'Accounts'),
    st.accounts.map((a) => h('button', { class: 'pop-item', type: 'button', role: 'menuitem', onclick: () => { closePop(); if (!a.active) switchAccount(a); } },
      avatar(a.id, a.name, 26, a.active), h('span', { style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, a.name, a.username ? h('span', { class: 'muted small' }, '  @' + a.username) : null),
      a.active ? icon('check', 16, 2.2) : (a.expired ? badge('high', 'Expired') : null))),
    h('div', { class: 'pop-sep' }),
    h('button', { class: 'pop-item', type: 'button', role: 'menuitem', onclick: () => { closePop(); startAddAccount(); } }, icon('userplus', 16), 'Add another account'),
    h('button', { class: 'pop-item', type: 'button', role: 'menuitem', onclick: () => { closePop(); go('settings'); } }, icon('sliders', 16), 'Settings'),
    h('button', { class: 'pop-item danger', type: 'button', role: 'menuitem', onclick: () => { closePop(); signOut(st.account); } }, icon('logout', 16), 'Sign out'));
  S.shell.acct.appendChild(popEl);
}
document.addEventListener('click', closePop);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closePop(); closeNav(); }
  const t = e.target;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if (e.key === '/' && !typing && S.shell) { e.preventDefault(); S.shell.quickInput.focus(); }
});

async function switchAccount(a) {
  toast(`Switching to ${a.name}…`, 'info');
  try { const st = await api('/accounts/switch', { body: { id: a.id } }); onStatus(st); toast(`Signed in as ${a.name}.`, 'ok'); }
  catch (e) { toast(e.message, 'err'); }
}
async function signOut(a) {
  if (!a) return;
  const ok = await confirmBox({ title: `Sign out of ${a.name}?`, text: 'This ends the Telegram session on this computer. Messages already stored locally are kept.', ok: 'Sign out', danger: true });
  if (!ok) return;
  try { const st = await api('/accounts/logout', { body: { id: a.id } }); toast(`Signed out of ${a.name}.`, 'ok'); onStatus(st); if (!st.authorized) renderApp(); }
  catch (e) { toast(e.message, 'err'); }
}
function startAddAccount() { S.addingAccount = true; api('/auth/cancel', { body: {} }).catch(() => {}).finally(renderApp); }

async function renderView() {
  if (!S.shell) return;
  const key = currentView();
  S.view = key;
  for (const [k, b] of Object.entries(S.shell.navBtns)) { if (k === key) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  S.shell.title.textContent = TITLES[key][0];
  S.shell.desc.textContent = TITLES[key][1];
  document.title = `${TITLES[key][0]} · TGSherlock`;
  if (S.cleanup) { try { S.cleanup(); } catch (e) { /* ignore */ } S.cleanup = null; }
  const el = clear(S.shell.view);
  const token = {}; S.token = token;
  const alive = () => S.token === token && S.shell && S.shell.view === el;
  try {
    const c = await VIEWS[key](el, alive);
    if (typeof c === 'function') { if (alive()) S.cleanup = c; else c(); }
  } catch (e) {
    if (alive()) { clear(el); el.appendChild(errorBox(e.message, () => renderView())); }
  }
}

// ===========================================================================
// server events
// ===========================================================================
function connectEvents() {
  if (S.es) S.es.close();
  const es = new EventSource('/api/events');
  S.es = es;
  es.onopen = () => setConn(true);
  es.onerror = () => setConn(false);
  es.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    const d = m.data;
    switch (m.type) {
      case 'status': onStatus(d); break;
      case 'message': if (S.onLive) S.onLive(d); break;
      case 'alert': onAlert(d); break;
      case 'alert_update': if (S.refreshAlerts && S.view === 'alerts') S.refreshAlerts(true); break;
      case 'job': if (S.onJob) S.onJob(d); else if (d.status !== 'running') toast(`${TITLES[d.kind] ? TITLES[d.kind][0] : 'Job'} #${d.id} ${d.status} · ${num(d.count)} messages`, d.status === 'done' ? 'ok' : 'warn'); break;
      case 'flood': toast(`Telegram asked to slow down. Resuming automatically in ${d.seconds} s.`, 'warn', 'Rate limit'); break;
      default: break;
    }
  };
}
function askNotify() { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); }
function onAlert(a) {
  toast(a.text ? a.text.slice(0, 140) : '', a.severity === 'high' ? 'err' : 'warn', a.title);
  if (a.desktop && S.status && S.status.prefs.notify && 'Notification' in window && Notification.permission === 'granted') {
    try { const n = new Notification(`TGSherlock · ${SEV_LABEL[a.severity] || ''} alert`, { body: `${a.title}\n${(a.text || '').slice(0, 180)}`, icon: '/static/logo-sm.png' }); n.onclick = () => { window.focus(); go('alerts'); }; } catch (e) { /* ignore */ }
  }
  if (S.refreshAlerts && S.view === 'alerts') S.refreshAlerts(true);
}

// ===========================================================================
// view: dashboard
// ===========================================================================
function barChart(series) {
  const mx = Math.max(1, ...series.map((s) => s.n));
  const bars = h('div', { class: 'bars', role: 'img', 'aria-label': 'Messages captured per hour over the last 24 hours' },
    series.map((s) => {
      const b = h('div', { class: 'bar' + (s.n ? '' : ' zero'), style: `height:${s.n ? Math.max(3, (s.n / mx) * 100) : 2}%`, title: `${fmtDate(s.t)} · ${s.n} messages, ${s.high} high risk` });
      if (s.n && s.high) b.appendChild(h('i', { style: `height:${(s.high / s.n) * 100}%` }));
      return b;
    }));
  return [bars, h('div', { class: 'axis' }, [0, 6, 12, 18].map((i) => h('span', null, fmtTime(series[i].t))), h('span', null, 'Now'))];
}
VIEWS.dashboard = async (el, alive) => {
  el.appendChild(loading());
  const d = await api('/dashboard');
  if (!alive()) return;
  clear(el);
  el.appendChild(h('div', { class: 'tiles' },
    tile('Messages stored', num(d.total), `+${num(d.last24)} in the last 24 h`),
    tile('Live targets', num(d.targets), d.live ? 'Live monitor running' : 'Live monitor stopped', d.live ? 'var(--green-text)' : null),
    tile('High risk · 24 h', num(d.high24), `${num(d.unread)} unread alerts`, d.unread ? 'var(--red-text)' : null),
    tile('Alert rules', num(d.rules), 'active rules'),
    tile('Entities', num(d.entities), 'emails, wallets, IPs, links…')));

  const watch = d.watch.length
    ? d.watch.map((t) => h('div', { class: 'list-item' }, avatar(t.id, t.name, 34),
      h('div', { class: 'grow' }, h('b', null, t.label), h('span', null, `${t.kind} · ${t.id}`)),
      h('span', { class: 'muted small nowrap', title: t.last ? fmtDate(t.last, true) : '' }, t.last ? rel(t.last) : 'no messages')))
    : [empty('No live targets yet.', 'live', h('button', { class: 'btn sm', type: 'button', onclick: () => go('live') }, 'Add targets'))];
  el.appendChild(h('div', { class: 'row' },
    h('section', { class: 'card grow-2' }, cardHead('Captured messages · last 24 hours', h('div', { class: 'legend' }, h('span', null, h('i', { style: 'background:#2C6E78' }), 'All'), h('span', null, h('i', { style: 'background:var(--red)' }), 'High risk'))), barChart(d.series)),
    h('section', { class: 'card grow-1' }, cardHead('Watchlist', h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('live') }, 'Manage')), h('div', null, watch))));

  const alerts = d.alerts.length
    ? d.alerts.map((a) => h('div', { class: 'list-item' }, badge(a.severity, SEV_LABEL[a.severity]),
      h('div', { class: 'grow' }, h('b', null, a.title), h('span', null, a.text)),
      h('span', { class: 'muted small nowrap', title: fmtDate(a.date, true) }, rel(a.date))))
    : [empty('No alerts yet. Create a rule to get notified.', 'bell', h('button', { class: 'btn sm', type: 'button', onclick: () => { S.alertTab = 'rules'; S.editRule = {}; go('alerts'); } }, 'New alert rule'))];
  const types = d.entity_types.length
    ? d.entity_types.map((t) => h('div', { class: 'list-item' }, h('div', { class: 'grow' }, h('b', null, t.type)), h('span', { class: 'mono', style: 'color:var(--accent-text)' }, num(t.n))))
    : [h('p', { class: 'hint' }, 'Indicators appear here as messages are collected.')];
  el.appendChild(h('div', { class: 'row' },
    h('section', { class: 'card grow-2' }, cardHead('Latest alerts', h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('alerts') }, 'Open inbox')), h('div', null, alerts)),
    h('section', { class: 'card grow-1' }, cardHead('Entities by type', h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('entities') }, 'View all')), h('div', null, types))));

  if (d.hits.length) {
    el.appendChild(card(cardHead('Recent high-risk messages'), h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ['Date', 'Chat', 'Sender', 'Keyword', 'Message'].map((c) => h('th', null, c)))),
      h('tbody', null, d.hits.map((m) => h('tr', { class: 'click', title: 'Click for details', onclick: () => openMessage(m, m.keyword ? [m.keyword] : []) },
        h('td', { class: 'date' }, fmtDate(m.date)), h('td', null, m.chat_title),
        h('td', null, who(m.sender_id, m.sender_name, m.sender_username, 26)),
        h('td', null, m.keyword ? h('span', { class: 'chip red' }, m.keyword) : '—'),
        h('td', { class: 'msg' }, h('div', { class: 'clamp' }, m.text)))))))));
  }
};

// ===========================================================================
// view: live monitor
// ===========================================================================
VIEWS.live = async (el, alive) => {
  el.appendChild(loading());
  const L = await api('/live');
  if (!alive()) return;
  clear(el);
  let messages = L.messages.filter((m) => !S.liveHideBefore || new Date(m.date).getTime() >= S.liveHideBefore);

  const chipsBox = h('div', { class: 'chips' });
  const tInput = h('input', { type: 'text', placeholder: '@username, user ID, group link…', 'aria-label': 'Add target', autocomplete: 'off' });
  async function addTarget() {
    const q = tInput.value.trim(); if (!q) return;
    tInput.disabled = true;
    try {
      const r = await api('/live/targets', { body: { query: q } });
      L.targets = r.targets; tInput.value = ''; paintChips();
      toast(`${r.target.label} added (${r.target.kind}).`, 'ok');
      if (r.target.warning) toast(r.target.warning, 'warn');
    } catch (e) { toast(e.message, 'err'); }
    finally { tInput.disabled = false; tInput.focus(); }
  }
  tInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTarget(); } });
  function paintChips() {
    clear(chipsBox);
    L.targets.forEach((t) => chipsBox.appendChild(h('span', { class: 'chip', title: `${t.kind} · ${t.id}` },
      t.warning ? h('span', { class: 'warn', title: t.warning }, icon('alert', 13, 2)) : null,
      t.label,
      h('button', { class: 'x', type: 'button', 'aria-label': `Remove ${t.label}`, onclick: async () => {
        try { const r = await api('/live/targets/' + encodeURIComponent(t.id), { method: 'DELETE' }); L.targets = r.targets; paintChips(); } catch (e) { toast(e.message, 'err'); }
      } }, icon('x', 12, 2.4)))));
    chipsBox.appendChild(tInput);
    statusTxt.textContent = L.running ? `Listening on ${L.targets.length} target${L.targets.length === 1 ? '' : 's'}` : 'Monitoring stopped';
  }
  chipsBox.addEventListener('click', (e) => { if (e.target === chipsBox) tInput.focus(); });

  const toggleBtn = h('button', { class: 'btn lg', type: 'button' });
  const statusDot = h('span', { style: 'width:8px;height:8px;border-radius:50%;display:inline-block' });
  const statusTxt = h('span');
  function paintToggle() {
    clear(toggleBtn);
    toggleBtn.className = 'btn lg ' + (L.running ? 'danger' : 'primary');
    append(toggleBtn, L.running ? [icon('stop', 16), 'Stop monitoring'] : [icon('play', 16), 'Start monitoring']);
    statusDot.style.background = L.running ? 'var(--green)' : 'var(--dim)';
    statusTxt.textContent = L.running ? `Listening on ${L.targets.length} target${L.targets.length === 1 ? '' : 's'}` : 'Monitoring stopped';
  }
  toggleBtn.addEventListener('click', () => busy(toggleBtn, async () => {
    const r = await api('/live/toggle', { body: { running: !L.running } });
    L.running = r.running; if (L.running) askNotify();
  }).then(paintToggle));

  const filterBox = h('div');
  function paintFilters() { clear(filterBox).appendChild(pills([['all', 'All'], ['high', 'High risk'], ['watch', 'Watch'], ['media', 'With media']], S.liveFilter, (k) => { S.liveFilter = k; paintFilters(); paintFeed(); }, 'Filter feed')); }

  el.appendChild(card(
    h('div', { class: 'form' }, h('div', { class: 'field wide' }, h('span', { class: 'lab' }, 'Targets — users, groups or channels'), chipsBox),
      h('button', { class: 'btn lg', type: 'button', onclick: addTarget }, icon('plus', 16), 'Add'), toggleBtn),
    h('div', { class: 'card-head' }, filterBox, h('span', { class: 'conn' }, statusDot, statusTxt)),
    h('p', { class: 'hint' }, 'Telegram only delivers messages from chats this account has joined. For a user, you see what they post in groups you share.')));

  const feed = h('div', { class: 'feed' });
  const stats = { msgs: h('span', { class: 'v' }), high: h('span', { class: 'v', style: 'color:var(--red-text)' }), media: h('span', { class: 'v' }) };
  function passes(m) {
    if (S.liveFilter === 'high') return m.risk === 'high';
    if (S.liveFilter === 'watch') return m.risk === 'watch';
    if (S.liveFilter === 'media') return !!m.media;
    return true;
  }
  function msgCard(m) {
    return h('article', { class: 'msg-card' }, avatar(m.sender_id, m.sender_name, 38),
      h('div', { class: 'body' },
        h('div', { class: 'meta' }, h('b', null, m.sender_name || 'Unknown'),
          h('span', { class: 'mono muted small' }, (m.sender_username ? '@' + m.sender_username + ' · ' : '') + (m.sender_id || '')),
          h('span', { class: 'muted' }, 'in'), h('span', { style: 'color:var(--accent-text)' }, m.chat_title || 'Private chat'),
          h('span', { class: 't', title: fmtDate(m.date, true) }, fmtTime(m.date, true))),
        m.text ? h('p', null, m.text) : null,
        h('div', { class: 'foot' }, riskBadge(m.risk), mediaBlock(m), (m.entities || []).map((x) => h('span', { class: 'ent', title: x }, x)),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: () => openMessage(m) }, 'Details'),
          m.sender_id ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('profile', { q: String(m.sender_id) }) }, 'Profile') : null)));
  }
  function paintStats() {
    stats.msgs.textContent = num(messages.length);
    stats.high.textContent = num(messages.filter((m) => m.risk === 'high').length);
    stats.media.textContent = num(messages.filter((m) => m.media).length);
  }
  function paintFeed() {
    clear(feed);
    const list = messages.filter(passes);
    if (!list.length) feed.appendChild(empty(L.targets.length ? (L.running ? 'Waiting for new messages from your targets…' : 'Press “Start monitoring” to begin.') : 'Add a user ID, @username or group above to start.', 'live'));
    list.slice(0, 200).forEach((m) => feed.appendChild(msgCard(m)));
    paintStats();
  }
  S.onLive = (m) => {
    messages.unshift(m);
    if (messages.length > 400) messages.length = 400;
    if (passes(m)) { const e = $('.empty', feed); if (e) e.remove(); feed.prepend(msgCard(m)); }
    paintStats();
  };

  const side = h('section', { class: 'card grow-1' }, cardHead('This view'),
    h('div', { class: 'kv', style: 'grid-template-columns:repeat(3,minmax(0,1fr))' },
      h('div', null, h('span', null, 'Messages'), stats.msgs), h('div', null, h('span', null, 'High risk'), stats.high), h('div', null, h('span', null, 'Media'), stats.media)),
    h('div', null,
      settingRow('Download media', 'Photos and files from targets (≤ 50 MB)', switchBtn(S.status.prefs.media, 'Download media', (v) => savePref('media', v))),
      settingRow('Desktop notifications', 'For alert rules with “Desktop” enabled', switchBtn(S.status.prefs.notify, 'Desktop notifications', (v) => { savePref('notify', v); if (v) askNotify(); })),
      settingRow('Resume on launch', 'Restart monitoring when TGSherlock starts', switchBtn(S.status.prefs.autostart, 'Resume on launch', (v) => savePref('autostart', v)))),
    h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, exportBtns({ scope: 'live' }),
      h('button', { class: 'btn sm', type: 'button', onclick: () => { S.liveHideBefore = Date.now(); messages = []; paintFeed(); } }, 'Clear view')));
  el.appendChild(h('div', { class: 'row' }, h('div', { class: 'grow-2' }, feed), side));
  paintChips(); paintToggle(); paintFilters(); paintFeed();
  return () => { S.onLive = null; };
};
async function savePref(key, value) {
  try { await api('/settings', { body: { prefs: { [key]: value } } }); S.status.prefs[key] = value; }
  catch (e) { toast(e.message, 'err'); }
}

// ===========================================================================
// view: alerts
// ===========================================================================
const TRIGGERS = [['any', 'Any message'], ['keywords', 'Keywords'], ['regex', 'Regex'], ['media', 'Has media'], ['entity', 'Entity found']];
const WATCH = [['user', 'User'], ['chat', 'Group / channel'], ['anywhere', 'Anywhere']];
function ruleEditor(base, onSaved, onCancel) {
  const R = Object.assign({ name: '', severity: 'medium', watch: 'user', target: '', target_id: null, target_label: '', trigger: 'any', pattern: '',
    notify: { desktop: true, email: false, webhook: false }, recipients: '', webhook: '', throttle_min: 5, enabled: true }, JSON.parse(JSON.stringify(base || {})));
  R.notify = Object.assign({ desktop: true, email: false, webhook: false }, R.notify);
  const box = h('section', { class: 'card editor', 'aria-label': 'Alert rule editor' });
  const smtpReady = S.settings && S.settings.smtp && S.settings.smtp.host;
  function paint() {
    clear(box);
    const nameIn = input({ value: R.name, placeholder: 'e.g. Brand mentions', oninput: (e) => { R.name = e.target.value; } });
    append(box, [
      h('div', { class: 'card-head' }, h('h2', null, R.id ? 'Edit alert rule' : 'New alert rule'),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close editor', onclick: onCancel }, icon('x', 14, 2.2))),
      h('div', { class: 'form' }, field('Rule name', nameIn, 'wide'),
        h('div', { class: 'field', style: 'flex:0 0 auto' }, h('span', { class: 'lab' }, 'Severity'), seg([['high', 'High'], ['medium', 'Medium'], ['low', 'Low']], R.severity, (k) => { R.severity = k; paint(); }, 'Severity'))),
      h('div', { class: 'field' }, h('span', { class: 'lab' }, 'Watch'), h('div', null, seg(WATCH, R.watch, (k) => { if (k !== R.watch) { R.watch = k; R.target_id = null; R.target_label = ''; R.target = ''; } paint(); }, 'Watch'))),
    ]);
    if (R.watch !== 'anywhere') {
      box.appendChild(h('div', { style: 'max-width:560px' }, field(R.watch === 'user' ? 'User — @username or numeric ID' : 'Group or channel — @name, t.me link or ID',
        input({ class: 'input mono', value: R.target, placeholder: R.target_label ? `Current: ${R.target_label} (leave empty to keep)` : (R.watch === 'user' ? '@username' : 't.me/channel_name'), oninput: (e) => { R.target = e.target.value; } }))));
    } else {
      box.appendChild(h('div', { class: 'banner info' }, icon('info', 16), 'Checks every group, channel and chat this account receives messages from.'));
    }
    box.appendChild(h('div', { class: 'field' }, h('span', { class: 'lab' }, 'Trigger when'), pills(TRIGGERS, R.trigger, (k) => { R.trigger = k; if (k === 'entity' && !R.pattern) R.pattern = ''; paint(); }, 'Trigger')));
    if (R.trigger === 'keywords' || R.trigger === 'regex') {
      box.appendChild(h('div', { style: 'max-width:560px' }, field(R.trigger === 'keywords' ? 'Keywords (comma separated, case-insensitive)' : 'Regular expression (case-insensitive)',
        input({ class: 'input mono', value: R.pattern, placeholder: R.trigger === 'keywords' ? 'leak, dump, example.com' : 'example[-_]?bank', oninput: (e) => { R.pattern = e.target.value; } }))));
    } else if (R.trigger === 'entity') {
      const sel = R.pattern.split(',').map((s) => s.trim()).filter(Boolean);
      box.appendChild(h('div', { class: 'field' }, h('span', { class: 'lab' }, 'Entity types (none selected = any)'),
        h('div', { class: 'pills' }, ENTITY_TYPES.map((t) => h('button', { class: 'pill', type: 'button', 'aria-pressed': String(sel.includes(t)), onclick: () => {
          const i = sel.indexOf(t); if (i === -1) sel.push(t); else sel.splice(i, 1); R.pattern = sel.join(', '); paint();
        } }, t)))));
    }
    box.appendChild(h('div', { class: 'field', style: 'max-width:620px' }, h('span', { class: 'lab' }, 'Notify via'),
      h('div', null,
        settingRow('In-app', 'Always on — lands in the Alerts inbox', h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': 'true', 'aria-label': 'In-app', disabled: true })),
        settingRow('Desktop notification', 'Browser notification while the panel is open', switchBtn(R.notify.desktop, 'Desktop notification', (v) => { R.notify.desktop = v; if (v) askNotify(); })),
        settingRow('Email', 'Sent through your SMTP server', switchBtn(R.notify.email, 'Email', (v) => { R.notify.email = v; paint(); })),
        settingRow('Webhook', 'POST JSON to Slack, Discord or any URL', switchBtn(R.notify.webhook, 'Webhook', (v) => { R.notify.webhook = v; paint(); })))));
    if (R.notify.email) {
      if (!smtpReady) box.appendChild(h('div', { class: 'banner warn' }, icon('mail', 16), h('span', { style: 'flex:1' }, 'SMTP is not configured yet — emails cannot be sent.'), h('button', { class: 'btn sm', type: 'button', onclick: () => go('settings') }, 'Set up SMTP')));
      box.appendChild(h('div', { class: 'form', style: 'max-width:760px' },
        field('Recipients', input({ value: R.recipients, placeholder: (S.settings && S.settings.smtp.to) || 'soc@example.com, analyst@example.com', oninput: (e) => { R.recipients = e.target.value; } }), 'wide'),
        field('Max 1 email every (minutes)', input({ type: 'number', min: 0, max: 1440, value: R.throttle_min, oninput: (e) => { R.throttle_min = e.target.value; } }))));
      box.appendChild(h('p', { class: 'hint' }, 'Alerts arriving faster than this are bundled into one digest email. 0 = send every alert immediately. Leave recipients empty to use the default from Settings.'));
    }
    if (R.notify.webhook) {
      box.appendChild(h('div', { style: 'max-width:560px' }, field('Webhook URL', input({ class: 'input mono', value: R.webhook, placeholder: 'https://hooks.slack.com/services/…', oninput: (e) => { R.webhook = e.target.value; } }))));
    }
    const save = h('button', { class: 'btn primary', type: 'button' }, 'Save rule');
    save.addEventListener('click', () => busy(save, async () => {
      await api('/rules', { body: R });
      toast('Alert rule saved. It is active while TGSherlock is running.', 'ok');
      onSaved();
    }));
    box.appendChild(h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, save, h('button', { class: 'btn', type: 'button', onclick: onCancel }, 'Cancel')));
  }
  paint();
  return box;
}
VIEWS.alerts = async (el, alive) => {
  el.appendChild(loading());
  const [settings] = await Promise.all([S.settings ? Promise.resolve(S.settings) : api('/settings')]);
  S.settings = settings;
  if (!alive()) return;
  clear(el);
  const tabsBox = h('div');
  const editorSlot = h('div');
  const listSlot = h('div', { class: 'stack' });
  let unread = 0, rulesCount = 0;
  const newBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => { S.editRule = {}; S.alertTab = 'rules'; paintTabs(); paintEditor(); refresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, icon('plus', 16, 2.2), 'New alert rule');
  el.append(h('div', { class: 'card-head' }, tabsBox, newBtn), editorSlot, listSlot);
  function paintTabs() {
    clear(tabsBox).appendChild(h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Alerts sections' },
      [['inbox', `Inbox · ${unread} new`], ['rules', `Rules · ${rulesCount}`]].map(([k, t]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(S.alertTab === k), onclick: () => { S.alertTab = k; paintTabs(); refresh(); } }, t))));
  }
  function paintEditor() {
    clear(editorSlot);
    if (S.editRule) editorSlot.appendChild(ruleEditor(S.editRule, () => { S.editRule = null; paintEditor(); S.alertTab = 'rules'; refresh(); }, () => { S.editRule = null; paintEditor(); }));
  }
  async function refresh(quiet) {
    let a, r;
    try { [a, r] = await Promise.all([api('/alerts?filter=' + S.alertFilter), api('/rules')]); }
    catch (e) { if (!quiet) { clear(listSlot).appendChild(errorBox(e.message, () => refresh())); } return; }
    if (!alive()) return;
    unread = a.unread; rulesCount = r.rules.length;
    paintTabs();
    clear(listSlot);
    if (S.alertTab === 'inbox') paintInbox(a.alerts); else paintRules(r.rules);
  }
  function paintInbox(list) {
    listSlot.appendChild(h('div', { class: 'card-head' },
      pills([['all', 'All'], ['unread', 'Unread'], ['high', 'High only']], S.alertFilter, (k) => { S.alertFilter = k; refresh(); }, 'Filter alerts'),
      h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' },
        h('button', { class: 'btn sm', type: 'button', onclick: async () => { await api('/alerts/read', { body: { all: true } }).catch((e) => toast(e.message, 'err')); refresh(); } }, icon('check', 14), 'Mark all read'),
        h('button', { class: 'btn sm', type: 'button', onclick: async () => { if (await confirmBox({ title: 'Delete read alerts?', text: 'Unread alerts are kept.', ok: 'Delete', danger: true })) { await api('/alerts/clear', { body: {} }).catch((e) => toast(e.message, 'err')); refresh(); } } }, icon('trash', 14), 'Clear read'),
        exportBtns({ scope: 'alerts' }))));
    if (!list.length) {
      listSlot.appendChild(empty(rulesCount ? 'No alerts here yet. Rules are watching while TGSherlock runs.' : 'Create your first rule to start receiving alerts.', 'bell',
        rulesCount ? null : h('button', { class: 'btn primary sm', type: 'button', onclick: () => newBtn.click() }, 'New alert rule')));
      return;
    }
    list.forEach((a) => {
      const markBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Mark as read', title: 'Mark as read', onclick: async () => { await api('/alerts/read', { body: { id: a.id } }).catch(() => {}); refresh(true); } }, icon('check', 16, 2));
      listSlot.appendChild(h('article', { class: 'alert-card' + (a.read ? ' read' : '') },
        h('span', { class: 'unread-dot' }),
        h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:6px' },
          h('div', { class: 'card-head', style: 'justify-content:flex-start' }, badge(a.severity, SEV_LABEL[a.severity]), h('b', null, a.title),
            h('span', { class: 'mono muted small', style: 'margin-left:auto', title: fmtDate(a.date, true) }, `${fmtDate(a.date)} · ${rel(a.date)}`)),
          h('p', { style: 'margin:0;color:var(--text-2);white-space:pre-wrap;word-break:break-word' }, a.text),
          h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12px' },
            h('span', { class: 'muted' }, 'Rule: ', h('span', { style: 'color:var(--text-2)' }, a.rule_name)),
            a.channels.map((c) => badge(/failed/i.test(c) ? 'high' : 'clean', c)),
            a.msg_id && a.chat_id ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => openMessage({ chat_id: a.chat_id, msg_id: a.msg_id, chat_title: a.chat_title, sender_id: a.sender_id, sender_name: a.sender_name, date: a.date, text: a.text, source: 'alert' }) }, 'Details') : null,
            a.sender_id ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('profile', { q: String(a.sender_id) }) }, 'Sender profile') : null)),
        a.read ? null : markBtn));
    });
  }
  function paintRules(list) {
    if (!list.length) { listSlot.appendChild(empty('No rules yet. Watch a user, a group or keywords anywhere.', 'bell', h('button', { class: 'btn primary sm', type: 'button', onclick: () => newBtn.click() }, 'New alert rule'))); return; }
    list.forEach((r) => {
      const chans = ['In-app'].concat(r.notify.desktop ? ['Desktop'] : [], r.notify.email ? [`Email${r.throttle_min ? ` (max 1 / ${r.throttle_min} min)` : ''}`] : [], r.notify.webhook ? ['Webhook'] : []);
      const trig = (TRIGGERS.find((t) => t[0] === r.trigger) || [, r.trigger])[1] + (r.pattern ? `: ${r.pattern}` : '');
      listSlot.appendChild(h('div', { class: 'rule-card' + (r.enabled ? '' : ' off') },
        h('span', { class: 'tag', style: 'min-width:74px;text-align:center' }, { user: 'User', chat: 'Group', anywhere: 'Anywhere' }[r.watch]),
        h('div', { class: 'col' }, h('span', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, h('b', null, r.name), badge(r.severity, SEV_LABEL[r.severity])),
          h('span', { class: 'mono muted small' }, r.target_label || 'All chats')),
        h('div', { class: 'col' }, h('span', { style: 'color:var(--text-2);word-break:break-word' }, trig), h('span', { class: 'muted small' }, chans.join(' · '))),
        h('span', { class: 'muted small nowrap', title: r.last_fired ? fmtDate(r.last_fired, true) : '' }, `Last fired: ${r.last_fired ? rel(r.last_fired) : 'never'}`),
        switchBtn(r.enabled, `Enable ${r.name}`, async (v) => { try { await api(`/rules/${r.id}/toggle`, { body: { enabled: v } }); refresh(true); } catch (e) { toast(e.message, 'err'); } }),
        h('button', { class: 'btn sm', type: 'button', onclick: () => { S.editRule = r; paintEditor(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, icon('edit', 14), 'Edit'),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Delete ${r.name}`, title: 'Delete', onclick: async () => {
          if (await confirmBox({ title: `Delete “${r.name}”?`, text: 'Alerts it already created are kept.', ok: 'Delete', danger: true })) {
            try { await api('/rules/' + r.id, { method: 'DELETE' }); refresh(); } catch (e) { toast(e.message, 'err'); }
          }
        } }, icon('trash', 16))));
    });
  }
  S.refreshAlerts = refresh;
  paintTabs(); paintEditor();
  await refresh();
  return () => { S.refreshAlerts = null; };
};

// ===========================================================================
// view: user profile
// ===========================================================================
VIEWS.profile = async (el, alive) => {
  const pre = S.prefill.profile; S.prefill.profile = null;
  const q = input({ class: 'input mono', placeholder: '@username or numeric user ID', value: pre ? pre.q : (S.lastProfile || ''), 'aria-label': 'Username or user ID' });
  const btn = h('button', { class: 'btn primary lg', type: 'submit' }, 'Look up');
  const slot = h('div', { class: 'stack', style: 'gap:16px' });
  el.append(h('form', { class: 'card', style: 'flex-direction:row;flex-wrap:wrap;gap:10px', onsubmit: (e) => { e.preventDefault(); run(); } },
    h('div', { style: 'flex:1 1 320px;min-width:0' }, q), btn), slot);
  async function run() {
    const v = q.value.trim(); if (!v) { q.focus(); return; }
    S.lastProfile = v;
    clear(slot).appendChild(loading('Looking up…'));
    let p;
    try { p = await api('/profile?q=' + encodeURIComponent(v)); }
    catch (e) { if (alive()) clear(slot).appendChild(errorBox(e.message)); return; }
    if (!alive()) return;
    if (p.redirect) { toast('That is a group or channel — opening Group History.', 'info'); go('history', { target: v }); return; }
    clear(slot); renderProfile(p, slot);
  }
  if (q.value.trim() && (pre || S.lastProfile)) run(); else q.focus();
};
function renderProfile(p, slot) {
  const X = p.extra || {};
  const flags = Object.entries({ Bot: p.flags.bot, Premium: p.flags.premium, Verified: p.flags.verified, Scam: p.flags.scam, Fake: p.flags.fake, Restricted: p.flags.restricted, 'In my contacts': p.flags.contact, 'Mutual contact': X.mutual_contact, 'Blocked by me': X.blocked }).filter(([, v]) => v);
  const ident = p.usernames[0] || String(p.id);
  const uname = (p.usernames[0] || '').replace(/^@/, '');
  const watchBtn = h('button', { class: 'btn', type: 'button', disabled: p.watched }, icon('live', 16), p.watched ? 'In live monitor' : 'Add to live monitor');
  watchBtn.addEventListener('click', () => busy(watchBtn, async () => { await api('/live/targets', { body: { query: String(p.id) } }); toast(`${p.name} added to the live monitor.`, 'ok'); p.watched = true; }).then(() => { if (p.watched) { watchBtn.disabled = true; watchBtn.lastChild.textContent = 'In live monitor'; } }));
  const kvRow = (k, v, mono) => h('div', null, h('span', null, k), h('span', { class: mono ? 'mono small' : null }, v == null || v === '' ? '—' : v));
  const left = h('section', { class: 'card grow-1', style: 'gap:18px' },
    h('div', { class: 'profile-head' }, avatar(p.id, p.name, 76, p.photo, true),
      h('div', { class: 'names' }, h('b', null, p.name),
        p.usernames.length ? h('span', { class: 'mono', style: 'color:var(--accent-text);word-break:break-all' }, p.usernames.join('  ')) : h('span', { class: 'muted small' }, 'No public username'),
        h('span', { class: 'muted small' }, p.status + (p.seen_at ? ` ${rel(p.seen_at)} (${fmtDate(p.seen_at)})` : '')))),
    p.bio ? h('p', { class: 'bio' }, p.bio) : null,
    (X.restrictions || []).length ? h('div', { class: 'banner err' }, icon('alert', 16), X.restrictions.join(' · ')) : null,
    h('div', { class: 'kv' },
      h('div', null, h('span', null, 'User ID'), h('span', { class: 'mono' }, String(p.id), copyBtn(p.id, 'Copy user ID'))),
      kvRow('Phone', p.phone ? '+' + p.phone : 'Hidden'),
      kvRow('First name', p.first_name), kvRow('Last name', p.last_name),
      kvRow('Shared groups', num(p.common_count)), kvRow('Profile photos', num(p.photos)),
      kvRow('Messages captured', num(p.totals && p.totals.n)), kvRow('Data center', p.dc ? 'DC' + p.dc : null),
      kvRow('First captured', p.totals && p.totals.first ? fmtDate(p.totals.first) : null, true),
      kvRow('Last captured', p.totals && p.totals.last ? fmtDate(p.totals.last) : null, true),
      X.birthday ? kvRow('Birthday', X.birthday) : null,
      X.lang ? kvRow('Language', X.lang) : null,
      X.forward_name ? kvRow('Forwards shown as', X.forward_name) : null,
      X.business_address ? kvRow('Business address', X.business_address) : null,
      X.bot_users ? kvRow('Monthly bot users', num(X.bot_users)) : null,
      X.personal_channel ? h('div', null, h('span', null, 'Personal channel'), h('button', { class: 'btn ghost sm', style: 'padding:0;height:auto;justify-content:flex-start', type: 'button', onclick: () => go('history', { target: X.personal_channel.username ? '@' + X.personal_channel.username : String(X.personal_channel.id) }) }, X.personal_channel.title)) : null),
    h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' }, flags.length ? flags.map(([k]) => badge(['Scam', 'Fake', 'Restricted'].includes(k) ? 'high' : 'accent', k)) : badge('', 'No special flags')),
    h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => go('tracker', { target: String(p.id), auto: true }) }, icon('tracker', 16), 'Track across groups'),
      watchBtn,
      h('button', { class: 'btn', type: 'button', onclick: () => { S.editRule = { name: `${p.name} activity`, watch: 'user', target: ident, severity: 'medium' }; S.alertTab = 'rules'; go('alerts'); } }, icon('bell', 16), 'Create alert')));

  const status = (c) => [c.member ? badge('clean', 'Shared') : null, c.listed ? badge('accent', 'In member list') : null, c.posts ? badge('', 'Posted') : null].filter(Boolean);
  const seen = p.seen_in.length
    ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ['Chat', 'Found via', 'Joined', 'Their messages'].map((c) => h('th', null, c)))),
      h('tbody', null, p.seen_in.map((c) => h('tr', { class: 'click', title: 'Open group history', onclick: () => go('history', { target: c.username ? '@' + c.username : String(c.id) }) },
        h('td', null, h('div', { class: 'who' }, avatar(c.id, c.title, 28), h('div', { class: 'nm' }, h('b', { title: c.title }, c.title), h('span', null, [c.kind, c.username ? '@' + c.username : '', c.members ? `${num(c.members)} members` : '', c.role && c.role !== 'Member' ? c.role : ''].filter(Boolean).join(' · '))))),
        h('td', null, h('div', { style: 'display:flex;flex-direction:column;gap:4px;align-items:flex-start' }, status(c))),
        h('td', { class: 'date' }, c.joined ? fmtDay(c.joined) : '—'),
        h('td', null, c.posts ? h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, h('span', { class: 'mono', style: 'color:var(--text)' }, `${num(c.posts)} msgs`),
          h('span', { class: 'date', title: `First: ${fmtDate(c.first, true)}` }, `first ${fmtDay(c.first)}`), h('span', { class: 'date', title: `Last: ${fmtDate(c.last, true)}` }, `last  ${fmtDay(c.last)}`)) : h('span', { class: 'muted' }, '—')))))))
    : empty('No shared groups, member-list matches or captured messages yet.', 'users');

  const hist = (p.identity_history || []);
  const histCard = card(cardHead('Name & username history', h('span', { class: 'muted small' }, `${hist.length} observed`)),
    hist.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ['Display name', 'Username', 'First seen', 'Last seen', 'Seen via'].map((c) => h('th', null, c)))),
      h('tbody', null, hist.map((r) => h('tr', null,
        h('td', { style: 'color:var(--text)' }, r.name || '—'),
        h('td', { class: 'mono' }, r.username ? '@' + r.username : '—'),
        h('td', { class: 'date' }, fmtDate(r.first_seen)), h('td', { class: 'date' }, fmtDate(r.last_seen)),
        h('td', { class: 'small muted' }, (r.sources || '').split(',').join(', '))))))) : null,
    h('p', { class: 'hint' }, 'Telegram does not publish old usernames. TGSherlock records every name and username it sees (messages, member lists, searches, lookups), so changes show up here from the first time it saw this account.'));

  const photos = p.photo_list || [];
  const gallery = photos.length ? card(cardHead('Profile photo history', h('span', { class: 'muted small' }, `${num(p.photos)} total`)),
    h('div', { class: 'gallery' }, photos.map((ph) => h('figure', null,
      h('a', { href: `/api/photo/${p.id}/${ph.index}`, target: '_blank', rel: 'noopener' }, h('img', { src: `/api/photo/${p.id}/${ph.index}`, alt: `Profile photo set ${fmtDay(ph.date)}`, loading: 'lazy' })),
      h('figcaption', null, (ph.video ? '▶ ' : '') + fmtDay(ph.date)))))) : null;

  const bot = X.bot_description || (X.bot_commands || []).length ? card(cardHead('Bot information'),
    X.bot_description ? h('p', { class: 'bio' }, X.bot_description) : null,
    (X.bot_commands || []).length ? h('div', null, X.bot_commands.map((c) => h('div', { class: 'list-item' }, h('span', { class: 'cmd' }, '/' + c.command), h('span', { class: 'muted' }, c.description)))) : null) : null;

  const right = h('div', { class: 'grow-2 stack', style: 'gap:16px' },
    card(cardHead('Groups & channels', h('span', { class: 'muted small' }, `${p.seen_in.length} found`)), seen,
      h('p', { class: 'hint' }, `Combines groups Telegram reports as shared with you, member lists you collected in Group History, and chats where they posted.${p.scanned ? ` Fetched ${num(p.scanned)} recent messages from shared groups.` : ''}`)),
    card(cardHead('Activity by hour (your local time)'), heatStrip(p.hours_utc)),
    histCard);
  slot.appendChild(h('div', { class: 'row' }, h('div', { class: 'grow-1 stack', style: 'gap:16px' }, left, bot, gallery), right));

  const tl = h('div', { class: 'timeline scroll-box' });
  let day = null;
  p.recent.forEach((m) => {
    const dday = fmtDay(m.date);
    if (dday !== day) { day = dday; tl.appendChild(h('div', { class: 'tl-day' }, dday)); }
    const full = Object.assign({ sender_id: p.id, sender_name: p.name, sender_username: uname }, m);
    tl.appendChild(h('div', { class: 'tl-item click', title: 'Click for details', onclick: () => openMessage(full) }, h('span', { class: 'tm', title: fmtDate(m.date, true) }, fmtTime(m.date)),
      h('div', { class: 'tx' }, h('span', null, m.chat_title), h('p', null, m.text || `[${m.media || 'media'}]`))));
  });
  slot.appendChild(card(cardHead('Message timeline', h('span', { class: 'muted small' }, `${num(p.recent.length)} most recent`)),
    p.recent.length ? tl : empty('No messages from this user are stored yet.', 'clock', h('button', { class: 'btn sm', type: 'button', onclick: () => go('tracker', { target: String(p.id), auto: true }) }, 'Scan their messages'))));
}

// ===========================================================================
// view: search
// ===========================================================================
VIEWS.search = async (el, alive) => {
  const q = input({ placeholder: 'Name, username or keyword', value: S.lastSearch || '', 'aria-label': 'Search query' });
  let kind = 'all', results = S.lastResults || null;
  const filterBox = h('div');
  const slot = h('div');
  const btn = h('button', { class: 'btn primary lg', type: 'submit' }, icon('search', 16), 'Search');
  el.append(h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); run(); } },
    h('div', { style: 'display:flex;flex-wrap:wrap;gap:10px' }, h('div', { style: 'flex:1 1 320px;min-width:0' }, q), btn), filterBox), slot);
  function paintFilter() { clear(filterBox).appendChild(seg([['all', 'All'], ['user', 'Users'], ['group', 'Groups'], ['channel', 'Channels']], kind, (k) => { kind = k; paintFilter(); paint(); }, 'Result type')); }
  function paint() {
    clear(slot);
    if (!results) return;
    const list = results.filter((r) => kind === 'all' || (kind === 'user' ? (r.kind === 'User' || r.kind === 'Bot') : r.kind.toLowerCase() === kind));
    if (!list.length) { slot.appendChild(empty('No matches.', 'search')); return; }
    slot.appendChild(card(cardHead(`Results · ${list.length}`), h('div', null, list.map((r) => {
      const isUser = r.kind === 'User' || r.kind === 'Bot';
      const watch = h('button', { class: 'btn sm', type: 'button' }, icon('live', 14), 'Watch');
      watch.addEventListener('click', () => busy(watch, async () => { await api('/live/targets', { body: { query: String(r.id) } }); toast(`${r.name} added to the live monitor.`, 'ok'); }));
      return h('div', { class: 'result-row' }, avatar(r.id, r.name, 46, r.photo),
        h('div', { class: 'grow' }, h('span', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, h('b', null, r.name), h('span', { class: 'tag' }, r.kind), r.flags.map((f) => badge(['Scam', 'Fake'].includes(f) ? 'high' : 'accent', f))),
          h('span', { class: 'mono muted small' }, [r.username ? '@' + r.username : null, String(r.id), r.members ? `${num(r.members)} members` : null].filter(Boolean).join(' · '))),
        h('div', { class: 'acts' }, copyBtn(r.id, 'Copy ID'),
          isUser ? h('button', { class: 'btn sm', type: 'button', onclick: () => go('profile', { q: r.username ? '@' + r.username : String(r.id) }) }, icon('profile', 14), 'Profile')
            : h('button', { class: 'btn sm', type: 'button', onclick: () => go('history', { target: r.username ? '@' + r.username : String(r.id) }) }, icon('history', 14), 'History'),
          watch));
    }))));
  }
  async function run() {
    const v = q.value.trim(); if (!v) return;
    await busy(btn, async () => {
      const r = await api('/search?q=' + encodeURIComponent(v));
      results = r.results; S.lastSearch = v; S.lastResults = results;
      if (alive()) paint();
    });
  }
  paintFilter(); paint();
  if (!results) q.focus();
};

// ===========================================================================
// background job views (history / sweep / tracker)
// ===========================================================================
function msgTable(rows, cols, terms) {
  const defs = {
    date: ['Date', (m) => h('td', { class: 'date', title: fmtDate(m.date, true) }, fmtDate(m.date))],
    chat: ['Chat', (m) => h('td', { style: 'min-width:140px' }, m.chat_title || '—')],
    sender: ['Sender', (m) => h('td', null, who(m.sender_id, m.sender_name, m.sender_username, 26))],
    text: ['Message', (m) => h('td', { class: 'msg' }, h('div', { class: 'clamp' }, m.text ? highlight(m.text, terms) : h('span', { class: 'muted' }, `[${m.media || 'no text'}]`)))],
    media: ['Media', (m) => h('td', null, m.media ? badge('', m.media) : '—')],
    risk: ['Risk', (m) => h('td', null, riskBadge(m.risk))],
  };
  return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, cols.map((c) => h('th', null, defs[c][0])))),
    h('tbody', null, rows.map((m) => h('tr', { class: 'click', title: 'Click for details', onclick: (e) => { if (!e.target.closest('button,a')) openMessage(m, terms); } }, cols.map((c) => defs[c][1](m)))))));
}
function dateInput(value) { return h('input', { class: 'input', type: 'date', value: value || '' }); }

function jobView(kind, cfg) {
  return async (el, alive) => {
    const pre = S.prefill[kind]; S.prefill[kind] = null;
    const jobSlot = h('div', { class: 'stack', style: 'gap:16px' });
    const runsSlot = h('div');
    let ui = null;
    let refetchTimer = null;
    let lastFetch = 0;

    const form = cfg.form(pre, async (params, btn) => {
      await busy(btn, async () => {
        const r = await api('/jobs', { body: { kind, params } });
        S.jobs[kind] = r.id;
        await openJob(r.id);
        loadRuns();
      });
    });
    el.append(form.el, jobSlot, runsSlot);

    async function openJob(id) {
      S.jobs[kind] = id;
      let job;
      try { job = await api(`/jobs/${id}`); } catch (e) { if (alive()) clear(jobSlot).appendChild(errorBox(e.message)); return; }
      if (!alive()) return;
      lastFetch = Date.now();
      paintJob(job);
    }
    function paintJob(job) {
      clear(jobSlot);
      const running = job.status === 'running';
      const statusBadge = badge({ running: 'accent', done: 'clean', error: 'high', cancelled: 'watch' }[job.status] || '', { running: 'Running', done: 'Finished', error: 'Failed', cancelled: 'Stopped' }[job.status] || job.status);
      const stopBtn = running ? h('button', { class: 'btn danger sm', type: 'button', onclick: () => api(`/jobs/${job.id}/cancel`, { body: {} }).catch((e) => toast(e.message, 'err')) }, icon('stop', 14), 'Stop') : null;
      const bar = h('i', { style: `width:${pct(job.progress)}%` });
      const progressBox = h('div', { class: 'progress' + (running && !job.progress.total ? ' indet' : '') }, bar);
      const label = h('span', { style: 'color:var(--text-2)' }, job.progress.label || '');
      const count = h('span', { class: 'mono muted' }, `${num(job.count)} messages`);
      const waitBox = h('div', { class: 'banner warn', hidden: true }, icon('clock', 16), h('span'));
      const infoSlot = h('div');
      ui = { job, bar, progressBox, label, count, waitBox, infoSlot };
      const head = cardHead(cfg.title(job), statusBadge, stopBtn, job.count ? exportBtns({ scope: 'job', id: job.id }) : null);
      const body = card(head, infoSlot,
        running || job.status !== 'done' ? h('div', { class: 'stack', style: 'gap:8px' }, h('div', { class: 'card-head' }, label, count), running ? progressBox : null, waitBox) : null,
        job.error ? errorBox(job.error) : null);
      paintInfo(job.info);
      jobSlot.appendChild(body);
      updateWait(job.wait_until);
      if ((job.rows && job.rows.length) || (job.members && job.members.length)) jobSlot.appendChild(cfg.results(job));
      else if (!running && job.status === 'done' && !(job.info && job.info.note)) jobSlot.appendChild(empty('No messages matched.', 'search'));
    }
    async function rerun(params) { const r = await api('/jobs', { body: { kind, params } }); S.jobs[kind] = r.id; await openJob(r.id); loadRuns(); }
    function paintInfo(info) { if (ui) clear(ui.infoSlot).appendChild(cfg.info(info || {}, { job: ui.job, rerun }) || h('span')); }
    function pct(p) { return p && p.total ? Math.min(100, Math.round((p.done / p.total) * 100)) : 0; }
    let waitTimer = null;
    function updateWait(until) {
      if (!ui) return;
      clearInterval(waitTimer);
      const tick = () => {
        const left = Math.ceil((until || 0) - Date.now() / 1000);
        if (left > 0) { ui.waitBox.hidden = false; ui.waitBox.lastChild.textContent = `Telegram rate limit (FloodWait) — resuming automatically in ${left} s`; }
        else { ui.waitBox.hidden = true; clearInterval(waitTimer); }
      };
      tick(); waitTimer = setInterval(tick, 1000);
    }
    S.onJob = (d) => {
      if (d.kind !== kind || d.id !== S.jobs[kind] || !ui) { if (d.status !== 'running' && d.kind === kind) loadRuns(); return; }
      if (d.status !== 'running') { openJob(d.id); loadRuns(); if (d.status === 'done') toast(`Finished · ${num(d.count)} messages.`, 'ok'); return; }
      ui.bar.style.width = pct(d.progress) + '%';
      ui.progressBox.classList.toggle('indet', !d.progress.total);
      ui.label.textContent = d.progress.label || '';
      ui.count.textContent = `${num(d.count)} messages`;
      if (d.info && Object.keys(d.info).length && JSON.stringify(d.info) !== JSON.stringify(ui.job.info)) { ui.job.info = d.info; paintInfo(d.info); }
      updateWait(d.wait_until);
      if (d.count !== ui.job.count && Date.now() - lastFetch > 2500 && !refetchTimer) {
        refetchTimer = setTimeout(async () => { refetchTimer = null; if (!alive() || S.jobs[kind] !== d.id) return; try { const j = await api(`/jobs/${d.id}`); lastFetch = Date.now(); if (alive() && j.status === 'running') paintJob(j); } catch (e) { /* ignore */ } }, 300);
      }
    };
    async function loadRuns() {
      let r; try { r = await api('/jobs?kind=' + kind); } catch (e) { return; }
      if (!alive()) return;
      clear(runsSlot);
      if (!r.jobs.length) return;
      runsSlot.appendChild(card(cardHead('Previous runs'), h('div', null, r.jobs.map((j) => h('div', { class: 'list-item' },
        badge({ running: 'accent', done: 'clean', error: 'high', cancelled: 'watch' }[j.status] || '', j.status),
        h('div', { class: 'grow' }, h('b', null, cfg.runLabel(j)), h('span', null, `${fmtDate(j.created)} · ${num(j.count)} messages`)),
        h('button', { class: 'btn sm', type: 'button', onclick: () => { openJob(j.id); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Open'),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Delete run', title: 'Delete run and its messages', onclick: async () => {
          if (!(await confirmBox({ title: 'Delete this run?', text: 'Its stored messages are deleted too.', ok: 'Delete', danger: true }))) return;
          try { await api('/jobs/' + j.id, { method: 'DELETE' }); if (S.jobs[kind] === j.id) { S.jobs[kind] = null; clear(jobSlot); ui = null; } loadRuns(); } catch (e) { toast(e.message, 'err'); }
        } }, icon('trash', 16)))))));
    }
    if (S.jobs[kind]) await openJob(S.jobs[kind]);
    loadRuns();
    if (pre && pre.auto && form.submit) form.submit();
    return () => { S.onJob = null; clearInterval(waitTimer); clearTimeout(refetchTimer); };
  };
}

VIEWS.history = jobView('history', {
  title: (j) => (j.info && j.info.title) || j.params.target,
  runLabel: (j) => (j.info && j.info.title) || j.params.target,
  form(pre, start) {
    const target = input({ class: 'input mono', placeholder: 't.me/channel, @group, invite link or ID', value: pre ? pre.target : '' });
    const from = dateInput(); const to = dateInput();
    const limit = input({ type: 'number', min: 1, max: 50000, value: 500 });
    let withMembers = true;
    const memSwitch = switchBtn(true, 'Include member list', (v) => { withMembers = v; });
    const btn = h('button', { class: 'btn primary lg', type: 'submit' }, 'Fetch history');
    const go_ = () => { if (!target.value.trim()) { target.focus(); return; } start({ target: target.value.trim(), from: from.value, to: to.value, limit: limit.value, members: withMembers }, btn); };
    const el = h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); go_(); } },
      h('div', { class: 'form' }, field('Group or channel', target, 'wide'), field('From', from), field('To', to), field('Max messages', limit, 'narrow'), btn),
      h('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap' }, memSwitch, h('span', { style: 'color:var(--text-2)' }, 'Include member list'), h('span', { class: 'hint' }, '· Reads messages newest → oldest. Private invite links show a preview until you join.')));
    if (!target.value) setTimeout(() => target.focus(), 0);
    return { el, submit: go_ };
  },
  info(i, ctx) {
    if (!i.title) return null;
    const joinBtn = !i.joined && ctx && ctx.job ? h('button', { class: 'btn sm primary', type: 'button' }, icon('userplus', 14), 'Join & fetch again') : null;
    if (joinBtn) joinBtn.addEventListener('click', async () => {
      if (!(await confirmBox({ title: `Join “${i.title}”?`, text: 'Your account joins this chat (its members can see that). Then the history is fetched again.', ok: 'Join' }))) return;
      busy(joinBtn, async () => { await api('/chats/join', { body: { target: ctx.job.params.target } }); toast('Joined. Fetching again…', 'ok'); await ctx.rerun(ctx.job.params); });
    });
    return h('div', { class: 'stack' },
      h('div', { class: 'tiles' }, smallTile('Title', i.title), smallTile('Type', i.kind), smallTile('Members', i.members != null ? num(i.members) : '—'),
        smallTile('Online now', i.online != null ? num(i.online) : '—'), smallTile('Admins', i.admins != null ? num(i.admins) : '—'),
        smallTile('Total messages', i.total_messages != null ? num(i.total_messages) : '—'), smallTile('Username', i.username ? '@' + i.username : '—'),
        smallTile('Created / joined', i.date ? fmtDay(i.date) : '—'), smallTile('Chat ID', String(i.id || '—')),
        i.slowmode ? smallTile('Slow mode', `${i.slowmode} s`) : null, i.banned ? smallTile('Banned users', num(i.banned)) : null,
        i.members_fetched != null ? smallTile('Members listed', num(i.members_fetched)) : null),
      (i.flags && i.flags.length) || i.linked || i.joined === false ? h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;align-items:center' },
        i.joined === false ? badge('watch', 'Not joined') : badge('clean', 'Joined'),
        (i.flags || []).map((f) => badge(['Scam', 'Fake', 'Restricted'].includes(f) ? 'high' : 'accent', f)),
        i.linked ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('history', { target: i.linked.username ? '@' + i.linked.username : String(i.linked.id) }) }, `Linked ${i.linked.kind.toLowerCase()}: ${i.linked.title}`) : null) : null,
      i.about ? h('p', { class: 'bio' }, i.about) : null,
      (i.restrictions || []).length ? h('div', { class: 'banner err' }, icon('alert', 16), i.restrictions.join(' · ')) : null,
      i.note ? h('div', { class: 'banner warn' }, icon('info', 16), h('span', { style: 'flex:1' }, i.note), joinBtn) : (joinBtn ? h('div', { class: 'banner info' }, icon('info', 16), h('span', { style: 'flex:1' }, 'You are not a member of this chat.'), joinBtn) : null));
  },
  results: (j) => tabbed('history', [
    ['messages', `Messages · ${num(j.count)}`, () => j.rows.length ? h('div', { class: 'stack' }, msgTable(j.rows, ['date', 'sender', 'text', 'media', 'risk']), j.count > j.rows.length ? h('p', { class: 'hint' }, `Showing ${num(j.rows.length)} — export for all.`) : null) : empty('No messages were returned.', 'history')],
    ['members', `Members · ${num((j.members || []).length)}`, () => membersPane(j)],
    j.rows.length ? ['senders', 'Top senders', () => sendersPane(j)] : null,
    j.rows.length ? ['activity', 'Activity', () => activityPane(j)] : null,
  ]),
});

VIEWS.sweep = jobView('sweep', {
  title: (j) => `Sweep: ${(j.params.keywords || []).join(', ')}`,
  runLabel: (j) => `${(j.params.keywords || []).join(', ')} · ${j.params.mode || 'any'}`,
  form(pre, start) {
    const words = pre && pre.keywords ? pre.keywords.slice() : [];
    let mode = 'any';
    const chips = chipEditor(words, { placeholder: 'Add keyword and press Enter', label: 'Keywords' });
    const modeBox = h('div');
    const depthWrap = h('div', { class: 'field narrow', hidden: true });
    const depth = input({ type: 'number', min: 10, max: 5000, value: 300 });
    append(depthWrap, [h('label', { for: (depth.id = 'sw-depth') }, 'Per chat'), depth]);
    const paintMode = () => { clear(modeBox).appendChild(seg([['any', 'Any word'], ['all', 'All words'], ['regex', 'Regex']], mode, (k) => { mode = k; paintMode(); }, 'Match mode')); depthWrap.hidden = mode !== 'regex'; };
    const from = dateInput(); const to = dateInput();
    const limit = input({ type: 'number', min: 1, max: 50000, value: 500 });
    const btn = h('button', { class: 'btn primary lg', type: 'submit' }, 'Run sweep');
    const go_ = () => { if (chips.input.value.trim()) chips.input.dispatchEvent(new Event('blur')); if (!words.length) { chips.input.focus(); toast('Add at least one keyword.', 'warn'); return; } start({ keywords: words.slice(), mode, from: from.value, to: to.value, limit: limit.value, depth: depth.value }, btn); };
    paintMode();
    const el = h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); go_(); } },
      h('div', { class: 'field' }, h('span', { class: 'lab' }, 'Keywords'), chips),
      h('div', { class: 'form' }, h('div', { class: 'field', style: 'flex:0 0 auto' }, h('span', { class: 'lab' }, 'Match'), modeBox), field('From', from), field('To', to), field('Max results', limit, 'narrow'), depthWrap, btn),
      h('p', { class: 'hint' }, '“Any / All” use Telegram’s global search across every chat you are in (fast). “Regex” scans the latest messages of each group and channel.'));
    return { el, submit: go_ };
  },
  info(i) { return i.mode ? h('div', { class: 'tiles' }, smallTile('Mode', { any: 'Any word', all: 'All words', regex: 'Regex' }[i.mode]), smallTile('Scope', i.scope || (i.dialogs ? `${num(i.dialogs)} groups & channels` : '—'))) : null; },
  results: (j) => tabbed('sweep', [
    ['results', `Results · ${num(j.count)}`, () => h('div', { class: 'stack' }, msgTable(j.rows, ['chat', 'date', 'sender', 'text', 'risk'], j.params.mode === 'regex' ? [] : j.params.keywords), j.count > j.rows.length ? h('p', { class: 'hint' }, `Showing ${num(j.rows.length)} — export for all.`) : null)],
    ['senders', 'Top senders', () => sendersPane(j)],
    ['activity', 'Activity', () => activityPane(j)],
  ]),
});

VIEWS.tracker = jobView('tracker', {
  title: (j) => `Tracking ${(j.info && (j.info.username || j.info.user)) || j.params.target}`,
  runLabel: (j) => (j.info && (j.info.user ? `${j.info.user} ${j.info.username || ''}` : '')) || j.params.target,
  form(pre, start) {
    const target = input({ class: 'input mono', placeholder: '@username or numeric user ID', value: pre ? pre.target : '' });
    let scope = 'common';
    const scopeBox = h('div');
    const paintScope = () => clear(scopeBox).appendChild(seg([['common', 'Shared groups'], ['all', 'All my groups']], scope, (k) => { scope = k; paintScope(); }, 'Scope'));
    const since = dateInput();
    const limit = input({ type: 'number', min: 1, max: 50000, value: 1000 });
    const btn = h('button', { class: 'btn primary lg', type: 'submit' }, 'Track user');
    const go_ = () => { if (!target.value.trim()) { target.focus(); return; } start({ target: target.value.trim(), scope, from: since.value, limit: limit.value }, btn); };
    paintScope();
    const el = h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); go_(); } },
      h('div', { class: 'form' }, field('User', target, 'wide'), h('div', { class: 'field', style: 'flex:0 0 auto' }, h('span', { class: 'lab' }, 'Scope'), scopeBox), field('Since', since), field('Max messages', limit, 'narrow'), btn),
      h('p', { class: 'hint' }, '“Shared groups” is fast. “All my groups” also finds messages in groups the user has left.'));
    if (!target.value) setTimeout(() => target.focus(), 0);
    return { el, submit: go_ };
  },
  info(i) { return i.user ? h('div', { class: 'tiles' }, smallTile('User', `${i.user}${i.username ? ' · ' + i.username : ''}`), smallTile('User ID', String(i.user_id)), smallTile('Scope', i.scope), smallTile('Groups to scan', num(i.groups))) : null; },
  results: (j) => tabbed('tracker', [
    ['groups', `Groups · ${num((j.groups || []).length)}`, () => (j.groups || []).length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ['Group', 'Messages', 'First message', 'Last message'].map((c) => h('th', null, c)))),
      h('tbody', null, j.groups.map((g) => h('tr', { class: 'click', title: 'Open group history', onclick: () => go('history', { target: String(g.chat_id) }) },
        h('td', null, h('div', { class: 'who' }, avatar(g.chat_id, g.chat_title, 26), h('div', { class: 'nm' }, h('b', null, g.chat_title), h('span', null, String(g.chat_id))))),
        h('td', { class: 'mono' }, num(g.n)), h('td', { class: 'date' }, fmtDate(g.first)), h('td', { class: 'date' }, fmtDate(g.last)))))))
      : empty('No messages found in any group yet.', 'users')],
    ['messages', `Messages · ${num(j.count)}`, () => h('div', { class: 'stack' }, msgTable(j.rows, ['date', 'chat', 'text', 'media', 'risk']), j.count > j.rows.length ? h('p', { class: 'hint' }, `Showing ${num(j.rows.length)} — export for all.`) : null)],
    ['activity', 'Activity', () => activityPane(j)],
  ]),
});

// ===========================================================================
// view: entities
// ===========================================================================
VIEWS.entities = async (el, alive) => {
  let type = 'all';
  const q = input({ placeholder: 'Filter values…', 'aria-label': 'Filter entities' });
  const tabs = h('div'); const slot = h('div');
  let timer = null;
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
  el.append(h('div', { class: 'card-head' }, tabs, h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, exportBtns({ scope: 'entities' }))),
    card(h('div', { style: 'max-width:420px' }, q), slot));
  async function load() {
    let d; try { d = await api('/entities?' + qs({ type, q: q.value.trim() })); } catch (e) { clear(slot).appendChild(errorBox(e.message, load)); return; }
    if (!alive()) return;
    const total = Object.values(d.counts).reduce((a, b) => a + b, 0);
    clear(tabs).appendChild(pills([['all', 'All', total]].concat(d.types.map((t) => [t, t, d.counts[t] || 0])), type, (k) => { type = k; load(); }, 'Entity type'));
    clear(slot);
    if (!d.entities.length) { slot.appendChild(empty('No indicators yet. They are extracted automatically from every captured message.', 'hash')); return; }
    slot.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ['Value', 'Type', 'Seen', 'First seen', 'Last seen', 'Seen in'].map((c) => h('th', null, c)))),
      h('tbody', null, d.entities.map((e) => h('tr', null,
        h('td', { class: 'mono', style: 'color:var(--blue-text);word-break:break-all;min-width:200px' }, e.value, ' ', copyBtn(e.value)),
        h('td', null, h('span', { class: 'tag' }, e.type)), h('td', { class: 'mono' }, `${num(e.count)}×`),
        h('td', { class: 'date' }, fmtDate(e.first_seen)), h('td', { class: 'date' }, fmtDate(e.last_seen)),
        h('td', { style: 'min-width:160px' }, h('div', { class: 'clamp' }, e.sources.join(', ')))))))));
  }
  await load();
};

// ===========================================================================
// view: archive
// ===========================================================================
VIEWS.archive = async (el, alive) => {
  const f = Object.assign({ q: '', risk: '', source: '', days: '' }, S.archiveFilter || {});
  let offset = 0;
  const q = input({ placeholder: 'Text, chat, sender or numeric ID', value: f.q });
  const sel = (opts, val) => h('select', { class: 'input', value: val }, opts.map(([v, t]) => h('option', { value: v }, t)));
  const risk = sel([['', 'All levels'], ['high', 'High risk'], ['watch', 'Watch'], ['clean', 'Clean']], f.risk);
  const source = sel([['', 'All sources'], ['live', 'Live monitor'], ['alert', 'Alert rules'], ['history', 'Group history'], ['sweep', 'Keyword sweep'], ['tracker', 'User tracker'], ['profile', 'Profile scans']], f.source);
  const days = sel([['', 'All time'], ['1', 'Last 24 hours'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']], f.days);
  const statsSlot = h('div'); const tableSlot = h('div'); const exportSlot = h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
  const apply = () => { offset = 0; load(); };
  [risk, source, days].forEach((s) => s.addEventListener('change', apply));
  el.append(h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); apply(); } },
    h('div', { class: 'form' }, field('Search', q, 'wide'), field('Risk', risk), field('Source', source), field('Range', days), h('button', { class: 'btn primary lg', type: 'submit' }, 'Filter'))),
    statsSlot, card(h('div', { class: 'card-head' }, h('h2', null, 'Stored messages'), exportSlot), tableSlot));
  async function load() {
    const params = { q: q.value.trim(), risk: risk.value, source: source.value, days: days.value };
    S.archiveFilter = params;
    let d; try { d = await api('/archive?' + qs(Object.assign({ offset }, params))); } catch (e) { clear(tableSlot).appendChild(errorBox(e.message, load)); return; }
    if (!alive()) return;
    clear(statsSlot).appendChild(h('div', { class: 'tiles' }, tile('Stored messages', num(d.stats.messages)), tile('Media files', num(d.stats.media)), tile('Saved runs', num(d.stats.jobs)), tile('Database size', bytes(d.stats.size))));
    clear(exportSlot); append(exportSlot, [exportBtns(Object.assign({ scope: 'archive' }, params))]);
    clear(tableSlot);
    if (!d.rows.length) { tableSlot.appendChild(empty('Nothing matches these filters.', 'db')); return; }
    tableSlot.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ['Date', 'Chat', 'Sender', 'Message', 'Risk', 'Source'].map((c) => h('th', null, c)))),
      h('tbody', null, d.rows.map((m) => h('tr', { class: 'click', title: 'Click for details', onclick: () => openMessage(m, params.q && !/^-?\d+$/.test(params.q) ? [params.q] : []) },
        h('td', { class: 'date', title: fmtDate(m.date, true) }, fmtDate(m.date)),
        h('td', { style: 'min-width:130px' }, m.chat_title || '—'),
        h('td', null, who(m.sender_id, m.sender_name, m.sender_username, 26)),
        h('td', { class: 'msg' }, h('div', { class: 'clamp' }, m.text ? highlight(m.text, params.q && !/^-?\d+$/.test(params.q) ? [params.q] : []) : h('span', { class: 'muted' }, `[${m.media || 'no text'}]`))),
        h('td', null, riskBadge(m.risk)),
        h('td', null, badge('', SOURCE_LABEL[m.source] || m.source))))))));
    tableSlot.appendChild(h('div', { class: 'pager', style: 'margin-top:12px' },
      h('span', { class: 'muted small' }, `${num(offset + 1)}–${num(offset + d.rows.length)} of ${num(d.total)}`),
      h('div', { style: 'display:flex;gap:6px' },
        h('button', { class: 'btn sm', type: 'button', disabled: offset === 0, onclick: () => { offset = Math.max(0, offset - 100); load(); } }, 'Previous'),
        h('button', { class: 'btn sm', type: 'button', disabled: offset + d.rows.length >= d.total, onclick: () => { offset += 100; load(); } }, 'Next'))));
  }
  await load();
};

// ===========================================================================
// view: settings
// ===========================================================================
VIEWS.settings = async (el, alive) => {
  el.appendChild(loading());
  const s = await api('/settings');
  S.settings = s;
  if (!alive()) return;
  clear(el);
  const st = S.status;

  // accounts
  const accounts = card(cardHead('Telegram accounts', h('button', { class: 'btn sm', type: 'button', onclick: startAddAccount }, icon('userplus', 14), 'Add account')),
    h('div', null, st.accounts.map((a) => h('div', { class: 'list-item' }, avatar(a.id, a.name, 38, a.active),
      h('div', { class: 'grow' }, h('b', null, a.name), h('span', null, [a.username ? '@' + a.username : null, a.phone ? '+' + a.phone : null, `ID ${a.id}`].filter(Boolean).join(' · '))),
      a.active ? badge('clean', 'Active') : (a.expired ? h('button', { class: 'btn sm', type: 'button', onclick: startAddAccount }, 'Sign in again') : h('button', { class: 'btn sm', type: 'button', onclick: () => switchAccount(a) }, icon('swap', 14), 'Switch')),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Sign out of ${a.name}`, title: 'Sign out', onclick: () => signOut(a) }, icon('logout', 16))))),
    h('p', { class: 'hint' }, `Each account keeps its own database, alert rules and live targets. API ID in use: ${s.api_id || '—'}.`));

  // smtp
  const sm = s.smtp;
  const host = input({ class: 'input mono', value: sm.host, placeholder: 'smtp.gmail.com' });
  const port = input({ class: 'input mono', type: 'number', value: sm.port, placeholder: '587' });
  let security = sm.security || 'starttls';
  const secBox = h('div');
  const paintSec = () => clear(secBox).appendChild(seg([['starttls', 'STARTTLS'], ['ssl', 'SSL/TLS'], ['none', 'None']], security, (k) => { security = k; paintSec(); }, 'SMTP security'));
  paintSec();
  const user = input({ value: sm.user, placeholder: 'alerts@example.com' });
  const pass = input({ type: 'password', value: '', placeholder: sm.has_password ? 'Saved — leave empty to keep' : 'App password', autocomplete: 'new-password' });
  const sender = input({ value: sm.sender, placeholder: 'TGSherlock <alerts@example.com>' });
  const to = input({ value: sm.to, placeholder: 'soc@example.com, analyst@example.com' });
  const preset = (hst, prt, sec) => { host.value = hst; port.value = prt; security = sec; paintSec(); };
  const smtpBody = () => ({ smtp: { host: host.value, port: port.value, security, user: user.value, password: pass.value, sender: sender.value, to: to.value } });
  const saveSmtp = h('button', { class: 'btn primary', type: 'button' }, 'Save');
  saveSmtp.addEventListener('click', () => busy(saveSmtp, async () => { S.settings = Object.assign(S.settings, await api('/settings', { body: smtpBody() })); pass.value = ''; toast('Email settings saved.', 'ok'); }));
  const testBtn = h('button', { class: 'btn', type: 'button' }, icon('mail', 15), 'Send test email');
  testBtn.addEventListener('click', () => busy(testBtn, async () => {
    S.settings = Object.assign(S.settings, await api('/settings', { body: smtpBody() })); pass.value = '';
    const r = await api('/settings/smtp-test', { body: {} });
    toast(`Test email sent to ${r.sent_to.join(', ')}.`, 'ok');
  }));
  const smtp = card(cardHead('Email alerts · SMTP', h('div', { style: 'display:flex;gap:4px;flex-wrap:wrap' },
    h('span', { class: 'muted small', style: 'align-self:center' }, 'Presets:'),
    h('button', { class: 'btn ghost sm', type: 'button', onclick: () => preset('smtp.gmail.com', 587, 'starttls') }, 'Gmail'),
    h('button', { class: 'btn ghost sm', type: 'button', onclick: () => preset('smtp.office365.com', 587, 'starttls') }, 'Outlook'),
    h('button', { class: 'btn ghost sm', type: 'button', onclick: () => preset('smtp.yandex.com', 465, 'ssl') }, 'Yandex'))),
    h('div', { class: 'form' }, field('SMTP host', host, 'wide'), field('Port', port, 'narrow')),
    h('div', { class: 'field' }, h('span', { class: 'lab' }, 'Security'), secBox),
    h('div', { class: 'form' }, field('Username', user), field('Password', pass)),
    h('div', { class: 'form' }, field('From', sender), field('Default recipients', to)),
    h('p', { class: 'hint' }, 'Gmail and Outlook need an app password, not your normal password. Settings are stored only on this computer (~/.config/tgsherlock, file mode 600).'),
    h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, saveSmtp, testBtn));

  // risk keywords
  const high = s.risk.high.slice(); const watch = s.risk.watch.slice();
  const saveRisk = async () => { try { await api('/settings', { body: { risk: { high, watch } } }); toast('Keywords saved.', 'ok'); } catch (e) { toast(e.message, 'err'); } };
  const risk = card(cardHead('Risk keywords'),
    h('div', { class: 'field' }, h('span', { class: 'lab', style: 'color:var(--red-text)' }, 'High risk'), chipEditor(high, { placeholder: 'Add keyword…', cls: 'red', onChange: saveRisk, label: 'High risk keywords' })),
    h('div', { class: 'field' }, h('span', { class: 'lab', style: 'color:var(--amber-text)' }, 'Watch'), chipEditor(watch, { placeholder: 'Add keyword…', cls: 'amber', onChange: saveRisk, label: 'Watch keywords' })),
    h('p', { class: 'hint' }, 'Every collected message is tagged High risk, Watch or Clean using these lists (case-insensitive). Applies to new messages.'));

  // preferences & system
  const portIn = input({ class: 'input mono', type: 'number', value: s.port, min: 1024, max: 65535 });
  const savePort = h('button', { class: 'btn', type: 'button' }, 'Save');
  savePort.addEventListener('click', () => busy(savePort, async () => { await api('/settings', { body: { port: portIn.value } }); toast('Saved. The new port is used the next time TGSherlock starts.', 'ok'); }));
  const deskBtn = h('button', { class: 'btn sm', type: 'button' }, icon('monitor', 14), s.desktop.installed ? 'Reinstall' : 'Add to app menu');
  deskBtn.addEventListener('click', () => busy(deskBtn, async () => { await api('/desktop/install', { body: {} }); toast('TGSherlock was added to your application menu.', 'ok'); }));
  const stopBtn = h('button', { class: 'btn danger', type: 'button' }, icon('power', 15), 'Stop TGSherlock');
  stopBtn.addEventListener('click', async () => {
    if (!(await confirmBox({ title: 'Stop TGSherlock?', text: 'Live monitoring and alert rules stop until you start it again from the app menu or with “tgsherlock”.', ok: 'Stop', danger: true }))) return;
    try { await api('/shutdown', { body: {} }); } catch (e) { /* server is going down */ }
    if (S.es) S.es.close();
    clear($('#app')).appendChild(h('div', { class: 'boot' }, h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;color:var(--muted)' },
      h('img', { src: '/static/logo-sm.png', alt: '', width: 72, height: 72, style: 'animation:none' }), h('b', { style: 'color:var(--text);font-size:18px' }, 'TGSherlock has stopped.'), 'You can close this tab.')));
  });
  const prefs = card(cardHead('Preferences'),
    h('div', null,
      settingRow('Desktop notifications', 'Browser notifications for alert rules', switchBtn(st.prefs.notify, 'Desktop notifications', (v) => { savePref('notify', v); if (v) askNotify(); })),
      settingRow('Download media', 'Save photos and files from live targets', switchBtn(st.prefs.media, 'Download media', (v) => savePref('media', v))),
      settingRow('Resume live monitor on launch', 'Restart monitoring with the last targets', switchBtn(st.prefs.autostart, 'Resume live monitor on launch', (v) => savePref('autostart', v))),
      settingRow('Open browser on start', 'Open this panel when TGSherlock starts', switchBtn(st.prefs.browser, 'Open browser on start', (v) => savePref('browser', v))),
      settingRow('Application menu', s.desktop.supported ? (s.desktop.installed ? 'Installed — find TGSherlock in your app menu' : 'Not installed') : 'Only available on Linux', s.desktop.supported ? deskBtn : h('span'))),
    h('div', { class: 'form' }, field('Local port', portIn, 'narrow'), savePort),
    h('div', { class: 'kv' },
      h('div', null, h('span', null, 'Config & sessions'), h('span', { class: 'mono small' }, s.paths.config)),
      h('div', null, h('span', null, 'Data & media'), h('span', { class: 'mono small' }, s.paths.data)),
      h('div', null, h('span', null, 'Version'), h('span', { class: 'mono small' }, st.version))),
    h('div', null, stopBtn));

  el.append(h('div', { class: 'row' }, h('div', { class: 'grow-1 stack', style: 'gap:16px' }, accounts, risk), h('div', { class: 'grow-1 stack', style: 'gap:16px' }, smtp, prefs)));
};

// ===========================================================================
// setup / login
// ===========================================================================
let setupTimer = null;
function stopSetupPoll() { clearInterval(setupTimer); setupTimer = null; }
function buildSetup(root) {
  const st = S.status || { accounts: [] };
  const inner = h('div', { class: 'setup-inner' });
  root.appendChild(h('div', { class: 'setup' },
    h('section', { class: 'setup-brand' },
      h('img', { src: '/static/logo.png', alt: '' }), wordmark(true),
      h('ul', { class: 'setup-points' },
        h('li', null, icon('monitor', 20), h('span', null, 'Runs locally on ', h('span', { class: 'mono' }, '127.0.0.1'), ' — nothing is sent anywhere else.')),
        h('li', null, icon('lock', 20), h('span', null, 'Your session stays in ', h('span', { class: 'mono' }, '~/.config/tgsherlock'), '.')),
        h('li', null, icon('qr', 20), h('span', null, 'Sign in by scanning a QR code with your phone.')))),
    h('section', { class: 'setup-form' }, inner)));

  let A = { state: 'idle' };
  let local = null; // 'phone' when the user chose phone login while the QR loop is still running
  let lastState = null, lastQr = null;
  let qrImg = null, expiresEl = null;

  async function poll() {
    try { A = await api('/auth'); } catch (e) { return; }
    if (A.state === 'done') {
      stopSetupPoll(); S.addingAccount = false;
      try { onStatus(await api('/status')); } catch (e) { /* SSE will update */ }
      return;
    }
    if (A.state !== lastState) { if (A.state !== 'qr') local = null; paint(); }
    else if (A.state === 'qr' && A.qr !== lastQr && qrImg) { qrImg.src = A.qr; lastQr = A.qr; }
  }
  function startPoll() { stopSetupPoll(); setupTimer = setInterval(poll, 1500); }

  function steps(n) {
    return h('ol', { class: 'steps', 'aria-label': 'Sign-in steps' }, ['API credentials', 'Verify', 'Password'].map((t, i) => h('li', { class: (i <= n ? 'on' : '') + (i === n ? ' cur' : '') }, h('i'), t)));
  }
  function paint() {
    lastState = A.state;
    clear(inner);
    if (st.error && !S.addingAccount && A.state === 'idle') inner.appendChild(h('div', { class: 'banner err' }, icon('alert', 16), st.error));
    const state = local || A.state;
    if (state === 'idle' || state === 'error' || state === 'done') paintCreds();
    else if (state === 'qr') paintQr();
    else if (state === 'phone') paintPhone();
    else if (state === 'code') paintCode();
    else if (state === 'password') paintPassword();
    const others = (st.accounts || []).filter((a) => !a.active || !st.authorized);
    if (S.addingAccount && st.authorized) {
      inner.appendChild(h('button', { class: 'btn ghost', type: 'button', style: 'align-self:flex-start', onclick: async () => { await api('/auth/cancel', { body: {} }).catch(() => {}); S.addingAccount = false; renderApp(); } }, '← Back to the panel'));
    } else if (others.length && ['idle', 'error', 'done'].includes(A.state)) {
      inner.appendChild(h('div', { class: 'card tight' }, h('div', { class: 'lab muted small' }, 'Saved accounts'),
        others.map((a) => h('div', { class: 'list-item' }, avatar(a.id, a.name, 32, false),
          h('div', { class: 'grow' }, h('b', null, a.name), h('span', null, a.username ? '@' + a.username : `ID ${a.id}`)),
          a.expired ? badge('high', 'Expired') : h('button', { class: 'btn sm', type: 'button', onclick: () => switchAccount(a) }, 'Use this account'),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Remove ${a.name}`, title: 'Sign out & remove', onclick: () => signOut(a) }, icon('trash', 15))))));
    }
  }
  function paintCreds() {
    const last = A.last_api || {};
    const id = input({ class: 'input mono', inputmode: 'numeric', placeholder: '1234567', value: last.api_id || '' });
    const hash = input({ class: 'input mono', type: 'password', placeholder: '32-character hash', value: last.api_hash || '' });
    const btn = h('button', { class: 'btn primary lg', type: 'submit' }, 'Continue');
    append(inner, [
      steps(0),
      h('div', null, h('h1', null, S.addingAccount ? 'Add a Telegram account' : 'Connect your Telegram account'),
        h('p', { class: 'lead' }, 'Enter your API ID and API Hash from ', h('a', { href: 'https://my.telegram.org/apps', target: '_blank', rel: 'noopener' }, 'my.telegram.org'), ' → API development tools.')),
      A.state === 'error' && A.error ? h('div', { class: 'banner err' }, icon('alert', 16), A.error) : null,
      h('form', { class: 'stack', style: 'gap:16px', onsubmit: (e) => { e.preventDefault(); busy(btn, async () => { A = await api('/auth/start', { body: { api_id: id.value, api_hash: hash.value } }); local = null; paint(); startPoll(); }); } },
        field('API ID', id), field('API Hash', hash), btn),
      h('details', { class: 'help' }, h('summary', null, 'Where do I get these?'),
        h('ol', null, h('li', null, 'Log in at my.telegram.org with your phone number.'), h('li', null, 'Open “API development tools” and create an app (any name and platform).'),
          h('li', null, 'Copy ', h('span', { class: 'mono' }, 'api_id'), ' and ', h('span', { class: 'mono' }, 'api_hash'), ' here.'))),
    ]);
    setTimeout(() => (id.value ? hash : id).focus(), 0);
  }
  function paintQr() {
    qrImg = h('img', { alt: 'Login QR code', src: A.qr || '' });
    lastQr = A.qr;
    const qrBox = h('div', { class: 'qr' }, A.qr ? qrImg : h('span', { class: 'spinner', style: 'color:#0A0E12;width:28px;height:28px' }));
    if (!A.qr) { const t = setInterval(() => { if (A.qr && qrBox.isConnected) { clear(qrBox).appendChild(qrImg); qrImg.src = A.qr; lastQr = A.qr; clearInterval(t); } else if (!qrBox.isConnected) clearInterval(t); }, 500); }
    expiresEl = h('span', { class: 'mono' });
    const tick = setInterval(() => { if (!expiresEl.isConnected) { clearInterval(tick); return; } const left = Math.max(0, Math.round((new Date(A.expires) - Date.now()) / 1000)); expiresEl.textContent = A.expires ? `${left} s` : '…'; }, 500);
    append(inner, [
      steps(1),
      h('div', null, h('h1', null, 'Scan with Telegram'), h('p', { class: 'lead' }, 'On your phone: Settings → Devices → Link Desktop Device, then point the camera at this code.')),
      h('div', { class: 'qr-wrap' }, qrBox,
        h('div', { class: 'stack', style: 'flex:1 1 180px' },
          h('span', { style: 'display:flex;align-items:center;gap:8px;color:var(--text-2)' }, h('span', { class: 'spinner', style: 'color:var(--amber)' }), 'Waiting for scan…'),
          h('span', { class: 'muted small' }, 'Code refreshes in ', expiresEl))),
      h('div', { class: 'card-head' },
        h('button', { class: 'btn ghost', type: 'button', style: 'color:var(--muted)', onclick: async () => { await api('/auth/cancel', { body: {} }).catch(() => {}); A = await api('/auth').catch(() => ({ state: 'idle' })); stopSetupPoll(); paint(); } }, '← Back'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { local = 'phone'; paint(); } }, 'Use phone number instead')),
    ]);
  }
  function paintPhone() {
    const phone = input({ class: 'input mono', type: 'tel', placeholder: '+90 555 111 22 33', autocomplete: 'tel' });
    const btn = h('button', { class: 'btn primary lg', type: 'submit' }, 'Send code');
    append(inner, [
      steps(1),
      h('div', null, h('h1', null, 'Sign in with phone'), h('p', { class: 'lead' }, 'Telegram sends a login code to your Telegram app.')),
      h('form', { class: 'stack', style: 'gap:16px', onsubmit: (e) => { e.preventDefault(); busy(btn, async () => { A = await api('/auth/phone', { body: { phone: phone.value } }); local = null; paint(); }); } },
        field('Phone number (with country code)', phone), btn),
      h('button', { class: 'btn ghost', type: 'button', style: 'align-self:flex-start', onclick: async () => { local = null; A = await api('/auth/qr', { body: {} }).catch(() => A); paint(); } }, '← Use QR code instead'),
    ]);
    setTimeout(() => phone.focus(), 0);
  }
  function paintCode() {
    const code = input({ class: 'input mono', inputmode: 'numeric', placeholder: '12345', autocomplete: 'one-time-code', style: 'letter-spacing:.3em;font-size:18px' });
    const btn = h('button', { class: 'btn primary lg', type: 'submit' }, 'Verify');
    append(inner, [
      steps(1),
      h('div', null, h('h1', null, 'Enter the code'), h('p', { class: 'lead' }, `We sent a code to the Telegram app of ${A.phone || 'your phone'}.`)),
      h('form', { class: 'stack', style: 'gap:16px', onsubmit: (e) => { e.preventDefault(); busy(btn, async () => { A = await api('/auth/code', { body: { code: code.value } }); if (A.state === 'done') poll(); else paint(); }); } },
        field('Login code', code), btn),
      h('button', { class: 'btn ghost', type: 'button', style: 'align-self:flex-start', onclick: () => { local = 'phone'; paint(); } }, '← Change number'),
    ]);
    setTimeout(() => code.focus(), 0);
  }
  function paintPassword() {
    const pw = input({ type: 'password', placeholder: 'Cloud password', autocomplete: 'current-password' });
    const btn = h('button', { class: 'btn primary lg', type: 'submit' }, 'Sign in');
    append(inner, [
      steps(2),
      h('div', null, h('h1', null, 'Two-step verification'), h('p', { class: 'lead' }, 'This account has a cloud password. Enter it to finish signing in.')),
      h('form', { class: 'stack', style: 'gap:16px', onsubmit: (e) => { e.preventDefault(); busy(btn, async () => { A = await api('/auth/password', { body: { password: pw.value } }); if (A.state === 'done') poll(); else paint(); }); } },
        field('Password', pw), A.hint ? h('p', { class: 'hint' }, `Hint: ${A.hint}`) : null, btn),
    ]);
    setTimeout(() => pw.focus(), 0);
  }
  api('/auth').then((a) => { A = a; paint(); if (['qr', 'code', 'password', 'phone'].includes(A.state)) startPoll(); }).catch(() => paint());
}

// ===========================================================================
// boot
// ===========================================================================
async function boot() {
  try { S.status = await api('/status'); }
  catch (e) { clear($('#app')).appendChild(h('div', { class: 'boot' }, errorBox('Cannot reach the TGSherlock server. Is it running?', () => location.reload()))); return; }
  renderApp();
  connectEvents();
}
boot();
})();
