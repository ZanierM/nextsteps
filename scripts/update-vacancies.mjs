// OPTIONAL: downloads live apprenticeship vacancies near the school from the
// Find an Apprenticeship service and saves them to data/vacancies.json.
//
// This only runs if you have added a free API key as a GitHub secret called FAA_API_KEY.
// Get a key: https://developer.apprenticeships.education.gov.uk/ (sign up, then subscribe
// to the "Display Advert API"). Without a key, the site links to the GOV.UK search instead.
//
// Optional secrets/variables: FAA_LAT, FAA_LON (default: Gravesend), FAA_MILES (default 30).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'vacancies.json');
const KEY = process.env.FAA_API_KEY;
const LAT = +(process.env.FAA_LAT || 51.441), LON = +(process.env.FAA_LON || 0.368), MILES = +(process.env.FAA_MILES || 30);
const PLACE = process.env.FAA_PLACE || 'Gravesend';
const API = 'https://api.apprenticeships.education.gov.uk/vacancies/vacancy';

if (!KEY) { console.log('No FAA_API_KEY secret set, so live vacancies are switched off.'); process.exit(0); }

const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

async function page(n) {
  const q = new URLSearchParams({ Lat: LAT, Lon: LON, DistanceInMiles: MILES, PageNumber: n, PageSize: 100, Sort: 'DistanceAsc' });
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(`${API}?${q}`, { headers: { 'Ocp-Apim-Subscription-Key': KEY, 'X-Version': '2', accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
      return await r.json();
    } catch (e) { if (attempt === 3) throw e; await new Promise((res) => setTimeout(res, 4000 * attempt)); }
  }
}

try {
  const all = [];
  let n = 1, pages = 1;
  do {
    const d = await page(n);
    pages = Math.min(d.totalPages || 1, 20);
    all.push(...(d.vacancies || []));
    n++;
  } while (n <= pages);
  const vacancies = all.map((v) => {
    const a = v.address || (v.addresses && v.addresses[0]) || {};
    const w = v.wage || {};
    return {
      ref: v.vacancyReference, title: v.title, employer: v.employerName,
      town: a.addressLine4 || a.addressLine3 || a.addressLine2 || '', postcode: a.postcode || '',
      y: a.latitude ?? null, x: a.longitude ?? null, dist: v.distance != null ? Math.round(v.distance * 10) / 10 : null,
      level: v.course?.level ?? null, lars: v.course?.larsCode ?? null, course: v.course?.title || '', route: v.course?.route || '',
      wage: w.wageAdditionalInformation || (w.wageAmount ? `£${w.wageAmount} ${w.wageUnit || ''}`.trim() : (w.wageType || '')),
      hours: v.hoursPerWeek ?? null, duration: v.expectedDuration || '',
      posted: v.postedDate, closing: v.closingDate, start: v.startDate, positions: v.numberOfPositions ?? null,
      url: v.vacancyUrl, desc: text(v.description).slice(0, 600),
    };
  });
  fs.writeFileSync(OUT, JSON.stringify({ fetched: new Date().toISOString(), place: PLACE, lat: LAT, lon: LON, miles: MILES, vacancies }));
  console.log(`Saved ${vacancies.length} vacancies within ${MILES} miles of ${PLACE}.`);
} catch (e) {
  console.error('Could not update vacancies, keeping the existing file:', e.message);
}
