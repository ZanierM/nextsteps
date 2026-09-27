// Downloads the list of apprenticeship standards from Skills England (no key needed)
// and saves a compact copy to data/apprenticeships.json.
// Run with:  node scripts/update-apprenticeships.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'apprenticeships.json');
const API = 'https://skillsengland.education.gov.uk/api/apprenticeshipstandards';

const list = (v) => (Array.isArray(v) ? v : (() => { try { return JSON.parse(v || '[]'); } catch { return []; } })());
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#?\w+);/g, (m, e) => ENT[e] ?? (e[0] === '#' ? String.fromCharCode(+e.slice(1)) : m));
const text = (h) => decode(decode(h || '')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

try {
  let raw;
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(API, { headers: { accept: 'application/json', 'user-agent': 'NextStepsExplorer/1.0 (school project)' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      raw = await r.json(); break;
    } catch (e) { if (attempt === 3) throw e; await new Promise((res) => setTimeout(res, 5000 * attempt)); }
  }
  // Keep the newest version of each standard that is approved for delivery
  const best = {};
  for (const s of raw) {
    if (s.status !== 'Approved for delivery') continue;
    const r = s.referenceNumber;
    if (!best[r] || parseFloat(s.versionNumber) > parseFloat(best[r].versionNumber)) best[r] = s;
  }
  const standards = Object.values(best).map((s) => ({
    ref: s.referenceNumber, lars: s.larsCode, title: s.title, level: s.level, route: s.route,
    dur: s.typicalDuration, deg: s.integratedDegree || '', paused: !!s.approvedForDeliveryPausedStarts,
    overview: (s.overviewOfRole || '').slice(0, 300),
    jobs: list(s.typicalJobTitles).slice(0, 8), kw: list(s.keywords).slice(0, 10),
    entry: text(s.entryRequirements).slice(0, 300),
    prof: list(s.professionalRecognition).map((p) => p.bodyName).filter(Boolean).slice(0, 3),
    quals: list(s.qualifications).map((q) => q.title || '').filter(Boolean).slice(0, 3),
    url: s.standardPageUrl, fund: s.maxFunding,
  })).sort((a, b) => a.title.localeCompare(b.title));
  if (standards.length < 300) throw new Error(`Only ${standards.length} standards returned, keeping the old file`);
  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : null;
  if (old && JSON.stringify(old.standards) === JSON.stringify(standards)) console.log('No change in apprenticeship standards.');
  else {
    fs.writeFileSync(OUT, JSON.stringify({ source: 'Skills England', fetched: new Date().toISOString(), standards }));
    console.log(`Saved ${standards.length} apprenticeship standards.`);
  }
} catch (e) {
  console.error('Could not update apprenticeship standards, keeping the existing file:', e.message);
}
