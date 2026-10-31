# Resume build

`resume.json` is the single source for Ben's resume. One command renders it two ways:

| File | For | Notes |
|---|---|---|
| `dist/Benjamin_Crow_Resume.pdf` | Email, the portfolio link | Site type and colour (Familjen Grotesk, Literata), embedded as TrueType. Also copied to `../resources/Benjamin_Crow_Resume.pdf`, the file the site links to. |
| `dist/Benjamin_Crow_Resume.docx` | Job portals | Same content in Arial and Georgia, which portals parse most reliably. |

## Build

```sh
cd resume
npm install
npx playwright install chromium   # first time only
npm run build
```

## Rules the build keeps

- **Only true claims.** Every line comes from Ben's own resume or something he has confirmed. Add a keyword only if it's true.
- **ATS-safe layout.** One column, no tables or text boxes, nothing in page headers or footers, contact details in the body, standard section names (Summary, Skills, Work Experience, Projects, Writing, Education), consistent "Mon YYYY" dates.
- **Clean text layer.** Static fonts, because Chromium embeds variable fonts as Type 3, which some parsers read badly. Ligatures are off, so words extract as plain letters.
- **Two pages, A4.**

## Check a build

```sh
pdftotext -raw dist/Benjamin_Crow_Resume.pdf - | head -40   # reads top to bottom, in order
pdffonts dist/Benjamin_Crow_Resume.pdf                      # all "CID TrueType", "uni yes"
```

Fonts are under the SIL Open Font License (see `fonts/OFL-*.txt`).
