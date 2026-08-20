# LaneForge

**Swimlane process builder** for ops and hiring workflows. Draw lanes, arrange steps, present to stakeholders, export JSON — all in the browser. **Local-first:** maps persist in `localStorage`, no account and no server.

Demo content uses a fictional **Acme Corp** hiring flow.

## Live demo

https://lane-forge.vercel.app

## Why

Process maps usually live in a diagramming tool that nobody opens twice, or in a slide that goes stale the day after it ships. LaneForge keeps the map editable, keeps it in one JSON file you own, and makes it presentable without a design pass.

## Features

- Swimlane grid with lanes as rows and process order as columns
- **Edit mode** — add, rename, and delete lanes; add, edit, and delete steps; drag steps between lanes and columns
- **Step detail panel** with owner, duration, systems touched, and a reference link
- **Search** across titles, summaries, owners, and systems, dimming everything that does not match
- **Fit view** to scale a wide map down to the screen for presenting
- **JSON import/export** so maps are portable and diffable
- Keyboard driven: `E` edit, `F` fit, `/` search, `?` help, `Esc` close
- Persists to browser `localStorage`, nothing leaves the machine

## Quick start

```bash
git clone https://github.com/Jarvis-123/lane-forge.git
cd lane-forge
npm run dev
```

Open http://localhost:8080

There is no build step and no dependencies. `index.html`, `styles.css`, and `app.js` are the whole app, so opening `index.html` directly in a browser also works.

## Sample map

The Acme Corp flow loads automatically on first run. To reload it later, or to see the file format, import `sample-maps/acme-hiring.json` with the **Import** button.

## Data format

A map is a flat JSON object. Lanes carry an id and a name; each step points at a lane and a column index.

```json
{
  "name": "Acme Corp — Hiring Flow",
  "lanes": [{ "id": "lane-ta", "name": "Talent Acquisition" }],
  "steps": [
    {
      "id": "step-intake",
      "laneId": "lane-ta",
      "column": 1,
      "title": "Intake call",
      "summary": "Agree the scorecard, must-haves, and sourcing plan.",
      "owner": "Recruiter",
      "duration": "45 min",
      "systems": ["ATS"],
      "link": ""
    }
  ]
}
```

Unknown fields are dropped on import and missing ones get sensible defaults, so hand-written files are fine.

## Roadmap

- PNG and PDF export for decks
- Optional cloud sync and shared templates
- Lane grouping for cross-functional maps

## License

MIT — commercial use allowed. Built by [Amit Singh](https://www.linkedin.com/in/amit-singh-he-him-his-936059a9/).

## Related

[QueryForge](https://github.com/Jarvis-123/queryforge) · [CorpusSearch](https://github.com/Jarvis-123/corpus-search) · [FormatDesk Lite](https://github.com/Jarvis-123/formatdesk-lite)
