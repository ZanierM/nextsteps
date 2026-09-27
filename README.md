# Next Steps Explorer

A website for Sixth Form students to compare university courses and apprenticeships side by side. It has three tabs.

**Universities**
- 25,525 full-time degree courses at 355 UK universities and colleges, on a map with the school marked.
- Students enter predicted grades (and EPQ). The site works out their UCAS points and compares them with the points recent students actually arrived with. Each course is labelled Above typical, Typical, Stretch or Big stretch.
- Each course card shows the spread of entry points, National Student Survey scores, the % in work or study after 15 months, salary after 15 months and 5 years, the % continuing after the first year, and the university's TEF rating. It links to the course page, Discover Uni and UCAS.
- Filter by subject, distance from school, placement year, year abroad and TEF Gold. Sort by match, distance, satisfaction, salary and more.

**Apprenticeships**
- All 712 apprenticeship types approved by Skills England, from Level 2 to Level 7, with degree apprenticeships highlighted.
- Each card shows the job, typical job titles, what you get, entry requirements and a button that searches live vacancies near Gravesend on GOV.UK.
- Optional: live vacancies within 30 miles of school, shown in the site itself (see below).

**Compare routes**
- Pick an interest (Engineering, Law, Nursing and so on) or type one. The site shows the degree route and the apprenticeship route next to each other, plus a table of things to weigh up.

**Shortlist:** students add courses and apprenticeships to a shortlist, then print it, save it as a PDF or copy it as text (useful for UCAS and careers meetings). The shortlist and grades are saved in that browser only. Nothing is sent anywhere.

## Setup

1. Create a new GitHub repository, for example `next-steps`, and upload everything in this folder, **including the hidden `.github` folder**. On a Mac, press Cmd+Shift+. in Finder to show hidden folders.
2. Go to **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions** and save.
3. Publish the site using either:
   - **GitHub Pages:** go to **Settings → Pages**, choose `main` and `/ (root)`, then save.
   - **Vercel:** import the repository. There's no build step, so leave the settings at their defaults.

The site works immediately, because the data files already contain the latest figures (Discover Uni 2025). You don't need to upload any CSV files to get started.

## Keeping it up to date

| Data | How it updates |
|---|---|
| Apprenticeship types | Automatically every Monday, from Skills England. |
| Live vacancies (optional) | Automatically every day, once you add a key (below). |
| University courses | Once a year, by you (about 5 minutes). |

**University data, once a year.** New Discover Uni data comes out each autumn. HESA's download page has a bot check, so this step can't be automated.
1. Go to https://www.hesa.ac.uk/support/tools-and-downloads/unistats and download the latest dataset (CSV version), then unzip it.
2. In your repository, open the `source` folder and click **Add file → Upload files**.
3. Drag in **only these files**: CONTINUATION, COURSELOCATION, EMPLOYMENT, ENTRY, GOSALARY, INSTITUTION, KISCOURSE, LEO5, LOCATION, NSS, SBJ, TARIFF and TEFOutcome (.csv), plus `readme.txt`. Don't upload the XML file or the whole folder: GitHub's website refuses any file over 25 MB, and the XML is about 370 MB. The largest CSV (KISCOURSE) is about 19 MB, so it's fine.
4. Commit. The **Rebuild university data** Action builds the course data and updates the site within a couple of minutes.

If an upload still says a file is too large, use GitHub Desktop (free) to add the files instead. It has no 25 MB limit.

To run any update straight away, go to the **Actions** tab, pick the workflow and click **Run workflow**. If a website can't be reached, the scripts keep the last good copy, so the site never breaks.

## Optional: live vacancies

Without this, every apprenticeship has a button that searches Find an Apprenticeship on GOV.UK near Gravesend. To show vacancies inside the site instead:

1. Register (free) at https://developer.apprenticeships.education.gov.uk/ and subscribe to the **Display Advert API**. Copy your key.
2. In your repository, go to **Settings → Secrets and variables → Actions → New repository secret**. Name it `FAA_API_KEY` and paste the key.
3. Run the **Update apprenticeships and vacancies** workflow once from the Actions tab.

The key stays secret on GitHub and is never put on the website. Vacancies within 30 miles of Gravesend are then refreshed every morning. To change the area, add repository **variables** (same page, Variables tab): `FAA_PLACE`, `FAA_LAT`, `FAA_LON` and `FAA_MILES`.

## Things to know

- **Entry points are not offers.** They are the UCAS points that recent students arrived with. Foundation-year courses (hidden by default) and access routes pull the numbers down. Students should always check the course page for the typical offer and required subjects.
- Small courses don't publish some figures, or combine several years or similar courses at the same university. These are marked with a *.
- The Compare tab matches by keywords, so it gives a good starting point rather than a complete list.
- To use this for another school, change `SCHOOL` near the top of the script in `index.html`, and the `FAA_` variables above.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole site |
| `data/uni/` | University courses, one file per subject area, plus `meta.json` (built from `source/`) |
| `data/apprenticeships.json` | Apprenticeship types (updated automatically) |
| `data/vacancies.json` | Live vacancies (only appears once a key is added) |
| `source/` | Where you upload the Discover Uni CSV files once a year (empty to start with) |
| `scripts/build-unis.mjs` | Turns the CSV files into the course data |
| `scripts/update-apprenticeships.mjs` | Downloads apprenticeship types from Skills England |
| `scripts/update-vacancies.mjs` | Downloads live vacancies (needs the key) |
| `.github/workflows/` | The automatic updates |

Data sources: Discover Uni dataset (Office for Students and HESA, Open Government Licence), Skills England, Find an Apprenticeship (Department for Education).
