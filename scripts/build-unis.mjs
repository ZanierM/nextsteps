// Builds the university course data for Next Steps Explorer from the Discover Uni CSV files.
//
// Once a year (the new data comes out each September):
//   1. Download the Discover Uni dataset (CSV version) from
//      https://www.hesa.ac.uk/support/tools-and-downloads/unistats
//   2. Unzip it and upload the .csv files into the source/ folder on GitHub, replacing the old ones.
//   3. The "Rebuild university data" Action runs this script automatically.
// Or run it yourself:  node scripts/build-unis.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2] || path.join(ROOT, 'source');
const OUT = path.join(ROOT, 'data', 'uni');

// ---------- tiny CSV reader (handles quotes, commas and newlines inside quotes) ----------
function readCsv(name) {
  const file = path.join(SRC, name + '.csv');
  if (!fs.existsSync(file)) { console.warn('Missing', name + '.csv'); return []; }
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  // Some headers repeat (HECOS appears five times); keep the first of each
  const idx = {}; head.forEach((h, i) => { if (!(h in idx)) idx[h] = i; });
  return rows.map((r) => new Proxy(r, { get: (t, k) => (typeof k === 'string' && k in idx ? t[idx[k]] : t[k]) }));
}
const num = (v) => (v === '' || v == null || isNaN(+v) ? null : +v);
const key = (r) => `${r.PUBUKPRN}|${r.KISCOURSEID}|${r.KISMODE}`;

// Index a per-course table: keep the first row that has data available
function byCourse(name, reasonField) {
  const m = new Map();
  for (const r of readCsv(name)) {
    const k = key(r);
    if (reasonField && r[reasonField] !== '0') { if (!m.has(k)) m.set(k, null); continue; }
    if (!m.get(k)) m.set(k, r);
  }
  return m;
}

// ---------- subject names ----------
const CAH1 = {
  CAH01: 'Medicine and dentistry', CAH02: 'Subjects allied to medicine', CAH03: 'Biological and sport sciences',
  CAH04: 'Psychology', CAH05: 'Veterinary sciences', CAH06: 'Agriculture, food and related studies',
  CAH07: 'Physical sciences', CAH09: 'Mathematical sciences', CAH10: 'Engineering and technology',
  CAH11: 'Computing', CAH13: 'Architecture, building and planning', CAH15: 'Social sciences', CAH16: 'Law',
  CAH17: 'Business and management', CAH19: 'Language and area studies',
  CAH20: 'Historical, philosophical and religious studies', CAH22: 'Education and teaching',
  CAH23: 'Combined and general studies', CAH24: 'Media, journalism and communications',
  CAH25: 'Creative arts and design', CAH26: 'Geographical and environmental studies',
};
// Clearer names where the most common course title would be misleading
const CAH3_NAMES = {
  'CAH01-01-01': 'Medical sciences', 'CAH01-01-02': 'Medicine', 'CAH01-01-03': 'Medicine by specialism', 'CAH01-01-04': 'Dentistry',
  'CAH02-02-02': 'Toxicology', 'CAH02-04-01': 'Nursing (general)', 'CAH02-04-02': 'Adult nursing', 'CAH02-04-04': 'Midwifery',
  'CAH02-04-05': "Children's nursing", 'CAH02-04-06': 'Dental hygiene and therapy', 'CAH02-04-07': 'Mental health nursing',
  'CAH02-04-08': 'Learning disabilities nursing', 'CAH02-04-09': 'Operating department practice',
  'CAH02-05-02': 'Healthcare science', 'CAH02-05-04': 'Physiology', 'CAH02-06-01': 'Paramedic science, ODP and speech therapy',
  'CAH02-06-02': 'Nutrition and dietetics', 'CAH02-06-03': 'Optometry and orthoptics', 'CAH02-06-04': 'Public and environmental health',
  'CAH02-06-06': 'Podiatry, osteopathy and chiropractic', 'CAH02-06-07': 'Occupational therapy and counselling',
  'CAH03-01-01': 'Biological sciences', 'CAH03-01-02': 'Biology', 'CAH03-01-03': 'Ecology and marine biology',
  'CAH03-01-05': 'Plant sciences', 'CAH03-01-06': 'Zoology and animal behaviour', 'CAH03-01-09': 'Hair and beauty sciences',
  'CAH03-02-01': 'Sport and exercise sciences', 'CAH04-01-01': 'Psychology', 'CAH04-01-02': 'Applied and forensic psychology',
  'CAH04-01-03': 'Developmental and educational psychology', 'CAH04-01-04': 'Clinical psychology and neuropsychology',
  'CAH04-01-05': 'Social and cognitive psychology', 'CAH05-01-01': 'Veterinary medicine', 'CAH05-01-02': 'Veterinary nursing and bioveterinary science',
  'CAH06-01-01': 'Animal science', 'CAH06-01-02': 'Agricultural technology', 'CAH06-01-03': 'Agriculture and horticulture',
  'CAH06-01-04': 'Land and wildlife management', 'CAH06-01-06': 'Food and nutrition', 'CAH06-01-08': 'Food production and culinary arts',
  'CAH07-04-01': 'Physical sciences (general)', 'CAH07-04-02': 'Forensic science', 'CAH07-04-03': 'Applied science',
  'CAH09-01-02': 'Operational research and analytics', 'CAH09-01-03': 'Statistics and data science',
  'CAH10-01-01': 'General engineering', 'CAH10-01-03': 'Automotive, robotics and mechatronics', 'CAH10-01-04': 'Aerospace engineering',
  'CAH10-01-05': 'Naval architecture', 'CAH10-01-10': 'Mining and fire engineering', 'CAH10-03-01': 'Jewellery and gemmology',
  'CAH10-03-02': 'Materials engineering', 'CAH10-03-03': 'Textile technology', 'CAH10-03-04': 'Maritime technology',
  'CAH10-03-06': 'Audio technology and other technologies', 'CAH10-03-07': 'Materials science',
  'CAH11-01-01': 'Computer science', 'CAH11-01-02': 'Information technology', 'CAH11-01-03': 'Information systems and data',
  'CAH11-01-04': 'Software engineering and cyber security', 'CAH11-01-06': 'Games design and development',
  'CAH11-01-07': 'Business computing', 'CAH11-01-08': 'Creative and networked computing',
  'CAH13-01-02': 'Construction management and surveying', 'CAH13-01-04': 'Urban and town planning',
  'CAH15-01-01': 'Social sciences (general)', 'CAH15-01-02': 'Sociology and criminology', 'CAH15-01-03': 'Social policy and policing',
  'CAH15-01-05': 'International development', 'CAH15-01-06': 'Cultural and heritage studies', 'CAH15-03-01': 'Politics and international relations',
  'CAH15-04-02': 'Childhood and youth studies', 'CAH16-01-01': 'Law', 'CAH17-01-01': 'Business management',
  'CAH17-01-02': 'Business and international business', 'CAH17-01-04': 'Management', 'CAH17-01-06': 'Tourism, events and hospitality',
  'CAH17-01-07': 'Finance and banking', 'CAH17-01-08': 'Accounting', 'CAH17-01-09': 'Business (other)',
  'CAH19-01-01': 'English studies', 'CAH19-01-02': 'English language', 'CAH19-01-06': 'British Sign Language',
  'CAH19-04-06': 'Asian studies', 'CAH19-04-07': 'Middle Eastern studies', 'CAH19-04-09': 'Modern languages and translation',
  'CAH20-01-04': 'Heritage and conservation', 'CAH20-01-05': 'Classics and ancient history', 'CAH20-02-02': 'Theology and religious studies',
  'CAH22-01-01': 'Education studies', 'CAH22-01-02': 'Teacher training (primary, QTS)',
  'CAH23-01-01': 'Combined studies', 'CAH23-01-02': 'Entrepreneurship', 'CAH23-01-03': 'Arts and humanities (combined)',
  'CAH23-01-04': 'Liberal arts', 'CAH24-01-01': 'Information and media', 'CAH24-01-02': 'Public relations and communications',
  'CAH24-01-03': 'Publishing', 'CAH24-01-05': 'Media and film studies', 'CAH25-01-01': 'Art and design (general)',
  'CAH25-01-03': 'Design (graphic, illustration, interior)', 'CAH25-01-04': 'Photography, film and animation',
  'CAH25-01-05': 'Crafts', 'CAH25-02-01': 'Performing arts', 'CAH25-02-02': 'Music', 'CAH25-02-03': 'Drama and acting',
  'CAH26-01-01': 'Geography', 'CAH26-01-02': 'Physical geography', 'CAH26-01-03': 'Human geography',
  'CAH26-01-04': 'Environmental science', 'CAH26-01-05': 'Earth sciences', 'CAH26-01-06': 'Geology and geoscience',
};
const tidy = (t) => t.replace(/\(.*?\)|\[.*$/g, '')
  .replace(/\b(with|including) (a |an )?(integrated )?(foundation year|placement year|year abroad|year in industry|professional placement|study abroad|international year|preparatory year).*$/i, '')
  .replace(/\s+/g, ' ').trim().replace(/[-,:]$/, '').trim();

// ---------- load ----------
console.log('Reading CSV files from', SRC);
if (!fs.existsSync(path.join(SRC, 'KISCOURSE.csv'))) {
  console.log('No KISCOURSE.csv in source/, so the existing university data is kept.');
  process.exit(0);
}
const inst = readCsv('INSTITUTION');
const tefRows = readCsv('TEFOutcome');
const tef = Object.fromEntries(tefRows.map((r) => [r.PUBUKPRN, r.OVERALL_RATING]));
const providers = {};
for (const r of inst) {
  let url = r.PROVURL || '';
  if (url && !/^https?:/.test(url)) url = 'https://' + url;
  providers[r.PUBUKPRN] = [r.FIRST_TRADING_NAME || r.LEGAL_NAME, tef[r.PUBUKPRN] || '', url];
}
const locs = new Map(); const firstLoc = new Map();
for (const r of readCsv('LOCATION')) {
  const lat = num(r.LATITUDE), lon = num(r.LONGITUDE);
  if (lat == null || lon == null) continue;
  const v = [Math.round(lat * 1000) / 1000, Math.round(lon * 1000) / 1000, r.LOCNAME];
  locs.set(r.UKPRN + '|' + r.LOCID, v);
  if (!firstLoc.has(r.UKPRN)) firstLoc.set(r.UKPRN, v);
}
const courseLoc = new Map();
for (const r of readCsv('COURSELOCATION')) if (!courseLoc.has(key(r))) courseLoc.set(key(r), [r.UKPRN, r.LOCID]);
const sbj = new Map();
for (const r of readCsv('SBJ')) { const k = key(r); if (!sbj.has(k)) sbj.set(k, []); if (r.SBJ && !sbj.get(k).includes(r.SBJ)) sbj.get(k).push(r.SBJ); }

const TAR = byCourse('TARIFF', 'TARUNAVAILREASON');
const ENT = byCourse('ENTRY', 'ENTUNAVAILREASON');
const NSS = byCourse('NSS', 'NSSUNAVAILREASON');
const EMP = byCourse('EMPLOYMENT', 'EMPUNAVAILREASON');
const GOS = byCourse('GOSALARY', 'GOSALUNAVAILREASON');
const LEO = byCourse('LEO5', 'LEO5UNAVAILREASON');
const CON = byCourse('CONTINUATION', 'CONTUNAVAILREASON');
const BANDS = ['T001', 'T048', 'T064', 'T080', 'T096', 'T112', 'T128', 'T144', 'T160', 'T176', 'T192', 'T208', 'T224', 'T240'];

// ---------- build ----------
const groups = {}; const titleCount = {}; const provCount = {};
let n = 0;
for (const c of readCsv('KISCOURSE')) {
  // Full-time, first degree, honours
  if (c.KISMODE !== '01' || c.KISLEVEL !== '03' || c.HONOURS !== '1' || (c.DISTANCE && c.DISTANCE !== '0')) continue;
  const k = key(c);
  const codes = sbj.get(k) || [];
  if (!codes.length) continue;
  const cl = courseLoc.get(k);
  const loc = (cl && locs.get(cl[0] + '|' + cl[1])) || firstLoc.get(c.UKPRN) || firstLoc.get(c.PUBUKPRN);
  if (!loc) continue;
  const rec = { t: c.TITLE.trim(), p: c.PUBUKPRN, k: c.KISCOURSEID, y: loc[0], x: loc[1] };
  if (loc[2] && loc[2] !== providers[c.PUBUKPRN]?.[0]) rec.ln = loc[2];
  let url = c.CRSEURL || ''; if (url && !/^https?:/.test(url)) url = 'https://' + url;
  if (url) rec.u = url;
  rec.s = codes;
  let f = '';
  if (c.SANDWICH === '2') f += 'P'; else if (c.SANDWICH === '1') f += 'p';   // placement year: compulsory / optional
  if (c.YEARABROAD === '2') f += 'A'; else if (c.YEARABROAD === '1') f += 'a';
  if (c.FOUNDATION === '2') f += 'F'; else if (c.FOUNDATION === '1') f += 'f';
  if (c.NHS === '1') f += 'N';
  if (f) rec.f = f;
  let agg = '';
  const t = TAR.get(k);
  if (t) { rec.ta = BANDS.map((b) => num(t[b]) ?? 0); rec.tn = num(t.TARPOP); if (t.TARSBJ) agg += 't'; }
  const e = ENT.get(k);
  if (e && num(e.ALEVEL) != null) rec.al = num(e.ALEVEL);
  const s = NSS.get(k);
  if (s) { const th = [1, 2, 3, 4, 5, 6, 7].map((i) => num(s['T' + i])); if (th.some((v) => v != null)) { rec.n = th; if (s.NSSSBJ) agg += 'n'; } }
  const em = EMP.get(k);
  if (em && num(em.WORKSTUDY) != null) { rec.w = num(em.WORKSTUDY); rec.un = num(em.UNEMP); if (em.EMPSBJ) agg += 'w'; }
  const g = GOS.get(k);
  if (g && num(g.GOINSTMED) != null) { rec.sa = num(g.GOINSTMED); if (g.GOSALSBJ) agg += 's'; }
  const l = LEO.get(k);
  if (l && num(l.LEO5INSTMED) != null) { rec.l5 = num(l.LEO5INSTMED); if (l.LEO5SBJ) agg += 'l'; }
  const co = CON.get(k);
  if (co && num(co.UCONT) != null) { rec.c = num(co.UCONT); if (co.CONTSBJ) agg += 'c'; }
  if (agg) rec.g = agg;
  if (c.UCASPROGID) rec.uc = c.UCASPROGID;

  const g1 = [...new Set(codes.map((x) => x.slice(0, 5)))];
  for (const g of g1) (groups[g] ||= []).push(rec);
  if (codes.length === 1) { const tt = tidy(rec.t); ((titleCount[codes[0]] ||= {})[tt] = (titleCount[codes[0]][tt] || 0) + 1); }
  provCount[c.PUBUKPRN] = (provCount[c.PUBUKPRN] || 0) + 1;
  n++;
}

// Subject labels: our own name, or the most common course title
const subjects = {};
const allCodes = new Set(Object.values(groups).flat().flatMap((r) => r.s));
for (const code of [...allCodes].sort()) {
  if (CAH3_NAMES[code]) { subjects[code] = CAH3_NAMES[code]; continue; }
  const top = Object.entries(titleCount[code] || {}).sort((a, b) => b[1] - a[1])[0];
  subjects[code] = top ? top[0] : code;
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/^CAH\d+\.json$/.test(f)) fs.unlinkSync(path.join(OUT, f));
const counts = {};
for (const [g, list] of Object.entries(groups)) {
  list.sort((a, b) => a.t.localeCompare(b.t));
  fs.writeFileSync(path.join(OUT, g + '.json'), JSON.stringify(list));
  counts[g] = list.length;
}
const usedProviders = Object.fromEntries(Object.entries(providers).filter(([id]) => provCount[id]));
let year = '';
try { year = (fs.readFileSync(path.join(SRC, 'readme.txt'), 'utf8').match(/Produced\s+([\d-]+)/) || ['', ''])[1]; } catch {}
const meta = {
  built: new Date().toISOString(), dataset: year, courses: n,
  groups: Object.fromEntries(Object.keys(CAH1).filter((g) => counts[g]).map((g) => [g, [CAH1[g], counts[g]]])),
  subjects, providers: usedProviders,
};
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta));
console.log(`Saved ${n} courses from ${Object.keys(usedProviders).length} providers in ${Object.keys(counts).length} subject groups.`);
