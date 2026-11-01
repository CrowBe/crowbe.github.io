# Resume build

`resume.json` is the single source for Ben's resume. One command renders it three ways:

| File | For | Notes |
|---|---|---|
| `dist/Benjamin_Crow_Resume.pdf` | People: direct applications, email, the site | The designed version (`designed.mjs`). The site's hero band, the career route, project screenshots and both essay series. Also copied to `../resources/Benjamin_Crow_Resume.pdf`, the file the site links to. |
| `dist/Benjamin_Crow_Resume_ATS.pdf` | Applicant tracking systems | Plain single column, standard section names, clean text layer. |
| `dist/Benjamin_Crow_Resume.docx` | Job portals | The ATS content in Arial and Georgia, which portals parse most reliably. |

## Build

```sh
cd resume
npm install
npx playwright install chromium   # first time only
npm run build
```

`qpdf`, if installed, losslessly shrinks both PDFs.

## The designed version

- **Header band.** `assets/header-night.jpg` is a still of the site's hero shader. `render-header.mjs` reads the shader straight from `../resources/scripts/websitescripts.js`, so re-run it if the hero changes (`node render-header.mjs --time 64` picks the moment of the flow).
- **Two fixed A4 pages.** A script in the page carries experience that doesn't fit on page 1 over to page 2, splitting a role between bullets if needed, and draws the dotted trail through each page's waypoints. If page 2 overflows, the build stops and says by how much.
- **Display-only fields** in `resume.json`: `short` (company name on the route), `image` and `tagline` (project cards), and `parts` (article titles in each series). The ATS outputs ignore them.

## Rules the build keeps

- **Only true claims.** Every line comes from Ben's own resume or something he has confirmed. Add a keyword or tagline only if it's true.
- **ATS outputs stay ATS-safe.** One column, no tables or text boxes, nothing in page headers or footers, contact details in the body, standard section names (Summary, Skills, Work Experience, Projects, Writing, Education), consistent "Mon YYYY" dates.
- **Clean text layer.** Static fonts, because Chromium embeds variable fonts as Type 3, which some parsers read badly. Ligatures are off in the ATS PDF, so words extract as plain letters.
- **Two pages, A4,** for every output.

## Check a build

```sh
pdftotext -raw dist/Benjamin_Crow_Resume_ATS.pdf - | head -40   # reads top to bottom, in order
pdffonts dist/Benjamin_Crow_Resume_ATS.pdf                      # all "CID TrueType", "uni yes"
```

Fonts are under the SIL Open Font License (see `fonts/OFL-*.txt`).
