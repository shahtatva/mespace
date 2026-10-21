# Paperleaf Journal: v1 spec

*Updated October 21, 2026 · builds on [brainstorm.md](brainstorm.md) · the app lives in [`app/`](../app/)*

**In one line:** a journal where every entry is a page in a paper-style book, and where photographed paper pages and digital pages live together, in date order, searchable from your phone.

---

## Decisions

| Question | Decision | What it changes |
|---|---|---|
| Who is v1 for? | **Just me.** A personal tool for one person | No sign-up, no beta, no analytics. Goals are personal and measured on the device |
| Which platform? | **An installable web app** for phone, tablet and desktop | The prototype's design carries over, and the camera and microphone work outside claude.ai |
| How much privacy work, and when? | **Keep a place for it; don't build around it yet.** Pages stay on the device, and v1 focuses on never *losing* them | Storage has one hook where end-to-end encryption plugs in later (M4). Until then, effort goes to the journaling itself |
| Must typed or transcribed text look like my handwriting? | **No.** What matters now is that the words are captured correctly | The stock handwriting fonts stay. Word accuracy is the bar for transcription and dictation |
| Is there a deadline? | **No.** It's a project I care about | Work is planned as ordered milestones, not dates |

## Problem statement

I journal on paper and keep hitting three walls.

1. **Effort.** Writing by hand takes more time and effort than a busy moment allows, so entries get skipped.
2. **Preservation.** Notebooks take up shelf space, wear out, and have no backup.
3. **Access.** Old entries can't be reached when the notebook isn't with me, and can't be searched even when it is.

Existing journaling apps solve capture and search, but they feel like a notes app, which loses the personal quality that makes paper journaling worth doing. Paper-style note apps keep the look, but they treat my existing paper notebooks as foreign material.

## Who it's for

One user in v1: me. I wear two hats, and the user stories are written for each:

- **The hybrid journaler:** keeps a paper journal, carries a phone everywhere, and writes less often than they'd like.
- **The archivist:** has a shelf of old notebooks they don't want to lose.

## Goals

| # | Goal | Measured by (on the device) |
|---|---|---|
| G1 | **Making an entry takes under a minute.** Median time from opening the app to a saved quick entry is ≤ 60 s | Open and save timestamps |
| G2 | **I journal more often than on paper.** ≥ 3 entries a week over a 4-week stretch | Entry counts per week |
| G3 | **My old notebooks are preserved.** At least one full old notebook imported within two weeks of M2 | Imported pages per notebook |
| G4 | **Words are captured correctly.** Transcription gets ≥ 90% of words right on neat pages and ≥ 75% on messy ones. Dictated entries need only a few corrections | A labelled test set of 10 real pages; corrections on 10 dictated entries |
| G5 | **I can find old entries.** 8 out of 10 searches for an entry I remember find it on the first try | A self-test of 10 searches |
| G6 | **The habit sticks.** At least one entry every week for 8 weeks | Entry counts per week |
| G7 | **Nothing is lost.** Zero lost pages, and a backup file restores the whole journal in a fresh browser | Restore drill |

## Non-goals

1. **No other users.** No sign-up, no sharing, no collaboration. Journals are private by design, and v1 is for one person.
2. **No analytics or tracking.** Any stats are worked out on the device.
3. **No formatting, folders or tags.** Every choice adds effort. The book's order, its index and the month tabs are the organization.
4. **No planner features** (calendars, habit trackers, to-do lists). Paperleaf is a journal, not a planner.
5. **No matching my handwriting.** The stock fonts are fine. Effort goes to getting the words right instead (P2 at most).
6. **No native app, widgets or lock-screen capture in v1.** The installable web app comes first (P2).
7. **No printed books.** Possible later, once there are enough pages (P2).

## User stories

### Hybrid journaler

1. As a hybrid journaler, I want to start writing the moment I open the app, without choosing anything first, so that a spare minute is enough for an entry.
2. As a hybrid journaler, I want to speak an entry while walking, so that I can journal when my hands are busy.
3. As a hybrid journaler, I want to photograph today's paper page, so that it sits in the same book as my digital pages.
4. As a hybrid journaler, I want to sketch or mark up any page, including photographed ones, so that pages still feel like my own.
5. As a hybrid journaler, I want to flip through my book and jump straight to a month, so that browsing feels like a notebook, not a list.
6. As a hybrid journaler, I want to search everything I've written, handwritten pages included, so that I can find an old entry in seconds.
7. As a hybrid journaler, I want a prompt to choose from when I'm stuck, so that a blank page doesn't stop me (P1).

### Archivist

8. As an archivist, I want to photograph a whole notebook in one sitting, page after page, so that digitizing a shelf is a few evenings of work, not a project.
9. As an archivist, I want the words on each imported page captured correctly, so that search finds what I actually wrote.
10. As an archivist, I want each imported page dated automatically from what I wrote, and easy to correct, so that old pages land in the right place in the book.
11. As an archivist, I want to export everything as a PDF, as text and as the original photos, so that I'm never locked in.

### Not losing anything

12. As someone whose phone could break, I want to save a backup file of my whole journal, so that I can restore it on another device.
13. As someone who forgets, I want a reminder when I haven't backed up in a while, so that a backup is never months old.
14. As a journaler who deleted a page by mistake, I want to restore it within 30 days, so that a slip isn't permanent.

### Edge cases

15. As a journaler with no signal, I want the app to open and save anyway, so that I never lose words to a bad connection.
16. As a journaler whose handwriting can't be read, I want the photo kept and marked "not transcribed", with an option to type the text myself, so that a failed transcription never loses a page.
17. As a journaler who writes long, I want text that doesn't fit to continue onto the next page, so that page size never cuts me off.
18. As a journaler who'd rather a page wasn't read by AI, I want transcription to happen only when I ask for it, so that I decide what leaves my device.

## Requirements

Each requirement is tagged with the milestone that delivers it. **Built** means it's in the app now.

### P0: must have

**P0-1 · The book** · *M1 · Built.* Entries are pages in one book, in date order. The book shows two-page spreads on wide screens and single pages on phones. It has page turning, page numbers, an index that builds itself, month tabs, and a ribbon that jumps to the latest page.
- [x] Each entry is a page, ordered by its date, then by when it was created
- [x] The index lists every page with its date, title or first line, and page number. Tapping a row opens that page
- [x] Month tabs appear only for months that have pages, and jump to the first page of that month
- [x] Swipe on phone and the arrow keys on desktop turn pages. With reduced motion turned on, pages change without animation

**P0-2 · Quick write** · *M1 · Built.* A new page opens with today's date, the default paper and the cursor on the first line. Nothing is required, including the title.
- [x] Typing can start right after tapping New page. Saving takes one tap
- [x] Text that overflows continues onto new pages that share the date and title
- [x] Paper and handwriting style are tucked under "Page style". New pages use the last style picked

**P0-3 · Voice entry** · *M1 · Built.* Spoken words are written onto the page as I talk.
- [x] Live dictation through the browser's speech recognition, with interim words shown as they're heard. Listening continues through pauses until I stop it
- [x] If the browser can't take dictation, the page explains how to use the device's own keyboard dictation, with the cursor ready on the page
- [ ] Accuracy check: 10 dictated entries need few corrections (G4)

**P0-4 · Drawing** · *M1 · Built.* An ink layer on every page, photographed pages included.
- [x] Three inks, two nib sizes, an eraser, undo and clear. Ink is stored as vectors
- [x] After any stylus input, touches from the palm are ignored

**P0-5 · Photo page** · *M1 · Built, except rotate and crop.* Capture or choose a photo of a paper page. It's taped onto a page.
- [x] The camera opens directly on phones. Choosing an existing image works everywhere
- [x] The photo is stored on the device at up to 2400 px on its long side, enough to read handwriting later
- [x] A text field holds what the page says, so search can find it before automatic transcription exists
- [ ] Rotate and crop (moved to M2, alongside automatic page edges)

**P0-6 · Scan your shelf** · *M2.* A continuous capture mode for importing many pages in a row.
- [ ] I name the notebook (for example "Blue notebook 2023"), then capture page after page without leaving the camera
- [ ] Each page is dated: from its transcription if a date is found, otherwise from the previous page, otherwise by me
- [ ] 20 pages can be captured and saved in under 5 minutes on a mid-range phone
- [ ] Imported pages carry the notebook's name and appear in the book in date order

**P0-7 · Handwriting transcription** · *M2.* Turns photographed handwriting into searchable, editable text. **Word accuracy is the measure of success.** How the result looks doesn't matter.
- [ ] Runs on one page or a whole import, only when I ask
- [ ] The text is editable. Pages that fail or score low confidence are marked so I can check them
- [ ] On the test set, it gets ≥ 90% of words right on neat pages and ≥ 75% on messy ones
- [ ] The service's API key is entered in the app's settings and kept on the device, never in the code

**P0-8 · Search** · *M1 · Built.* One search box covers titles, typed text and photo text, all on the device.
- [x] Each result shows the date, the title and a snippet with the match highlighted. Opening a result goes to that page
- [ ] Speed check: results in under 1 s for a 1,000-page journal on a mid-range phone

**P0-9 · Hard to lose** · *M1 · Built.* Pages are kept on the device and protected against loss.
- [x] Pages and photos are saved in the browser's on-device database. The app asks the browser to keep them, rather than clearing them when space runs low
- [x] The app opens and works offline once it has been loaded
- [x] Deleted pages go to Trash, with Undo straight after, and can be restored for 30 days
- [x] "Back up now" saves one file with every page and photo. The status line shows when the last backup was made, and nudges after 14 days
- [x] "Restore from a backup" adds missing pages, keeps whichever copy of each page is newer, and opens the book to the newest page

**P0-10 · Sync and export** · *M3.*
- [ ] My journal on a second device, kept in sync automatically
- [ ] A readable export: a PDF with pages exactly as they look in the book, a Markdown file per page, and the original photos

### P1: nice to have

- **Automatic page edges** (M2). Detect the edges of a photographed page, straighten the perspective and flatten curved pages.
- **Prompts when stuck.** A "Give me a prompt" button on a blank page, drawing from a starter set and from my own saved prompts.
- **Volumes.** Imported notebooks become separate books on a shelf, each with its own cover, in addition to appearing in the main book.
- **On this day.** On opening, show the page from the same date in earlier years, if there is one.
- **Fix punctuation.** Clean up dictated text without changing the words.
- **Gentle reminder.** One optional daily nudge at a time I pick.
- **My stats.** Entries per week, streaks and input types, worked out on the device.

### P2: later

- **End-to-end encryption** (M4). A passphrase and recovery key, with encrypted backups and sync. *Already designed for:* every record passes through one encode/decode step in `app/js/store.js`, where encryption plugs in.
- **Native iPhone and iPad app** with widgets, lock-screen capture and low-latency Apple Pencil. *Design for it:* the data model and backup format are independent of the web front end.
- **Printed yearly book.** *Design for it:* pages are fixed-size and layout-stable.
- **Field-notes layout.** Questions and observations side by side, with sketches over both.
- **My own handwriting as a font.** Not important for now (see Decisions).

## Success metrics

Measured on the device. Review at 2 weeks, 4 weeks and 8 weeks of daily use.

| Indicator | Metric | Success | Stretch |
|---|---|---|---|
| Leading | Median time from open to saved quick entry | ≤ 60 s | ≤ 30 s |
| Leading | Transcription word accuracy (neat / messy test sets) | 90% / 75% | 95% / 85% |
| Leading | Old notebooks fully imported after M2 | 1 within 2 weeks | 3 within 8 weeks |
| Leading | Share of entries by input type (typed, voice, photo, drawn) | Tracked, no target. This shows what I actually reach for | — |
| Lagging | Entries per week | ≥ 3 | ≥ 5 |
| Lagging | Weeks in a row with at least one entry | 8 | 12 |
| Safety | Lost pages | 0 | 0 |
| Safety | Restore from a backup file into a fresh browser | Passes | Passes on a different device |

## Open questions

1. **Transcription service** (needed for M2): Claude's image reading versus on-device text recognition. Decide on word accuracy against the 10-page test set first, then cost per page. *(Engineering)*
2. **Sync** (needed for M3): a small hosted database, or a file in my own cloud drive? *(Engineering)*
3. **Hosting:** where the installable app lives so my phone can reach it. GitHub Pages works for a public repository; a private one needs a paid plan or another host. *(Me)*
4. Should the page stay fixed at 17 lines, or adapt to the screen? *(Design)*
5. Should imported notebooks merge into one book, or stay as separate volumes from day one? *(Design)*

## Milestones

No deadline. Each milestone leaves something usable every day.

- **M1, the daily driver** · *built.* Installable app that works offline, on-device storage, the book, quick write, drawing, voice, photo pages with a text field, search, Trash, and backup and restore.
- **Try it (alongside M1, about 2 weeks).** Journal in M1 daily. Collect 10 real pages, including the field notebook, with their correct text, as the transcription test set.
- **M2, the shelf.** Scan your shelf, transcription measured on the test set, automatic dating, and automatic page edges, rotate and crop.
- **M3, everywhere.** Sync across devices and the readable export.
- **M4, locked.** End-to-end encryption, using the storage hook that already exists.
- **Then:** the P1 list, in whatever order daily use suggests. A native app only if the habit holds (G6).
