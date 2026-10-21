# mespace

Home of **Paperleaf Journal**: a journal where every entry is a page in a paper-style book. Photographed paper pages and digital pages live together, in date order, searchable from your phone.

It came from three frustrations with paper journaling:

- **Effort:** writing an entry takes too long.
- **Preservation:** notebooks take up space and wear out.
- **Access:** old entries can't be reached when the notebook isn't nearby.

The goal is to fix those three without losing what makes paper journaling feel personal.

## Status

**Milestone 1 (the daily driver) is built.** It's an installable web app that works offline. Everything is saved on the device:

- the notebook, with page turns, index and month tabs
- quick writing, which carries over onto a new page when one fills up
- drawing on any page
- dictation
- photos of paper pages
- search
- Trash, which keeps deleted pages for 30 days
- backup and restore through a single file

**Milestone 2 (the shelf) is built too:**

- **Scan a notebook:** photograph page after page with the live camera, or choose photos you've already taken. The pages are added in order, under the notebook's name.
- **Reading the handwriting:** Claude reads the pages in the background, so search finds what you wrote, and pages get the dates written on them.
- **Checking:** words Claude wasn't sure of are marked for checking. Ticking "I've checked this text" on a corrected page feeds a running word-accuracy figure in Settings.
- **Rotate and crop** for any photo page.

Next is **M3, everywhere**: sync between devices and a readable export. See [the spec](docs/spec.md#milestones).

## Run it

The app is plain HTML, CSS and JavaScript. There's no build step and nothing to install.

```sh
npm start        # serves app/ at http://localhost:5173
npm test         # unit tests (Node 20 or newer)
```

Any static file server works in place of `npm start`, for example `python3 -m http.server -d app 5173`. Opening `index.html` directly from disk won't work, because browsers block JavaScript modules on `file://` pages.

## Use it on your phone

The app is published with GitHub Pages at **https://shahtatva.github.io/mespace/**. Every push to `main` runs the tests and redeploys it ([workflow](.github/workflows/pages.yml)).

To install it:

- **iPhone or iPad:** open the link in Safari, then choose **Share → Add to Home Screen**. Open it from the Home Screen from then on; that also stops Safari from clearing its storage.
- **Android:** open the link in Chrome, then choose **Install app**.

The installed app works offline. Updates download in the background and appear the next time you open it.

## Reading handwriting

Reading uses Claude Opus 5.5 through Anthropic's API, with your own API key:

1. Create a key at [console.anthropic.com](https://console.anthropic.com/settings/keys) and add some credit. API usage is billed separately from a Claude.ai subscription.
2. In the app, open **Menu → Settings** and paste the key. The app checks it before saving.

The key is stored only on that device. A photo leaves the device only while it's being read, and each page costs a few cents. Settings shows the running total.

**Keep backups.** Pages live only on the device until sync arrives in M3. Use **Menu → Back up now** now and then, and keep the file somewhere else, such as iCloud Drive, Google Drive or email. The status line reminds you after 14 days.

## What's here

| Path | What it is |
|---|---|
| [`app/`](app/) | The app. `index.html` is the entry point; `js/` holds the modules; `sw.js` provides offline support |
| [`tests/`](tests/) | Unit tests for the parts that don’t need a browser: dates, the book layout, search, ink, page overflow, dictation, backups, reading and accuracy, and the offline file list |
| [`docs/brainstorm.md`](docs/brainstorm.md) | Problem framing, directions explored, riskiest assumptions, and what was chosen |
| [`docs/spec.md`](docs/spec.md) | The v1 spec: decisions, goals, requirements with build status, metrics and milestones |
| [`prototype/`](prototype/) | The first single-page prototype, kept for reference. [Try it in Claude](https://claude.ai/artifact/RMCm96Uw4zoxds6959aaDU) |

## How the app is put together

| Module | Job |
|---|---|
| `main.js` | Starts the app, and runs the menu, backup and restore, Trash, install and the status line |
| `notebook.js` | The open book: layout, page turning, tabs, pager and search |
| `editor.js` | The page editor: write, draw, speak and photo |
| `render.js` | Builds each page's HTML: paper, header, text, ink and taped-in photo |
| `store.js` | Saves pages, photos and settings in IndexedDB. Every record passes through one encode/decode step, where encryption plugs in later (M4) |
| `scanner.js` | Scan a notebook: live camera or chosen photos, a tray to rotate or remove pages, then adds them to the book |
| `claude.js` | Calls Claude to read a photographed page, through the official Anthropic SDK bundled in `vendor/` (`npm run vendor` rebuilds it) |
| `transcriber.js` | The background reading queue, which survives closing the app and going offline |
| `settings.js`, `imageedit.js` | The Settings sheet (API key, cost, accuracy, pages to check), and rotate and crop |
| `book.js`, `model.js`, `search.js`, `ink.js`, `textfit.js`, `backup.js`, `dates.js`, `dictation.js`, `transcription.js`, `accuracy.js` | Logic that doesn't need a browser, covered by the unit tests |

Fonts (Jost, Kalam and Caveat) are stored in the repo under the SIL Open Font License, so the app works offline. See `app/fonts/OFL.txt`.
