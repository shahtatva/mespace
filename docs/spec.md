# Paperleaf Journal: v1 spec

*Updated October 21, 2026 · builds on [brainstorm.md](brainstorm.md) and the [prototype](../prototype/README.md)*

**In one line:** a journal where every entry is a page in a paper-style book, and where photographed paper pages and digital pages live together, in date order, searchable from your phone.

---

## Decisions

These were open questions in the first draft. They are now settled.

| Question | Decision | What it changes |
|---|---|---|
| Who is v1 for? | **Just me.** A personal tool for one person | No sign-up flow, no beta, no analytics. Goals and metrics are personal and measured on the device |
| Which platform? | **An installable web app** that runs on phone, tablet and desktop | The prototype can be reused. The camera and microphone work once the app runs outside claude.ai |
| Which privacy model? | **The safer one: end-to-end encrypted and local-first** | Pages are stored on the device and encrypted with a key only I hold. Anything synced or backed up is encrypted first, so no server can read it. Search runs on the device |
| Is there a deadline? | **No.** It's a project I care about | Work is planned as ordered milestones, not dates |

**The trade-off of the safer option.** If I lose both my passphrase and my recovery key, nobody can unlock the journal, me included. P0-9 and P0-10 exist to make that very unlikely.

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

| # | Goal | Measured by (on the device, never sent anywhere) |
|---|---|---|
| G1 | **Making an entry takes under a minute.** Median time from opening the app to a saved quick entry is ≤ 60 s | Open and save timestamps |
| G2 | **I journal more often than on paper.** ≥ 3 entries a week over a 4-week stretch, above my Phase 0 paper baseline | Entry counts per week |
| G3 | **My old notebooks are preserved.** At least one full old notebook imported within two weeks of v1 | Imported pages per notebook |
| G4 | **I can find old entries.** 8 out of 10 searches for an entry I remember find it on the first try, and transcription gets ≥ 90% of words right on neat pages | A self-test of 10 searches; the transcription test set |
| G5 | **The habit sticks.** At least one entry every week for 8 weeks after v1 | Entry counts per week |
| G6 | **Nothing is lost or exposed.** Zero lost pages. A restore onto a fresh device works. Nothing readable leaves my devices except pages I choose to send for transcription | Restore drill; a review of what the app sends over the network |

## Non-goals

1. **No other users.** No sign-up, no sharing, no collaboration. Journals are private by design, and v1 is for one person.
2. **No analytics or tracking.** Progress stats are worked out on the device, from page dates and counts only.
3. **No formatting, folders or tags.** Every choice adds effort. The book's order, its index and the month tabs are the organization.
4. **No planner features** (calendars, habit trackers, to-do lists). Paperleaf is a journal, not a planner.
5. **No personal handwriting font in v1.** It's the most exciting idea and the riskiest to build. Revisit once enough of my own pages have been imported (P2).
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
9. As an archivist, I want each imported page dated automatically from what I wrote, and easy to correct, so that old pages land in the right place in the book.
10. As an archivist, I want to export everything as a PDF, as text and as the original photos, so that I'm never locked in.

### Privacy and safety

11. As the only person who should ever read this, I want my journal locked behind a passphrase, so that someone holding my phone or the server can't read it.
12. As someone who might forget a passphrase, I want a recovery key I can print and store, so that I can't lock myself out for good.
13. As someone who might lose or break a phone, I want my journal backed up off the device automatically, encrypted, so that losing the device doesn't lose the journal.

### Edge cases

14. As a journaler with no signal, I want my entry saved anyway, so that I never lose words to a bad connection.
15. As a journaler whose handwriting can't be read, I want the photo kept and marked "not transcribed", with an option to type the text myself, so that a failed transcription never loses a page.
16. As a journaler who writes long, I want text that doesn't fit to continue onto the next page, so that page size never cuts me off.
17. As a journaler who deleted a page by mistake, I want to restore it within 30 days, so that a slip isn't permanent.
18. As a journaler who doesn't want a page read by AI, I want transcription off by default and asked for page by page, so that I decide what leaves my device.

## Requirements

### P0: must have (v1 doesn't ship without these)

**P0-1 · The book.** Entries are pages in one book, in date order. The book shows two-page spreads on tablet and desktop and single pages on phone. It has page turning, page numbers, an index that builds itself, and month tabs. *(Already in the prototype.)*
- [ ] Each entry is a page, ordered by its date, then by when it was created
- [ ] The index lists every page with its date, title or first line, and page number. Tapping a row opens that page
- [ ] Month tabs appear only for months that have pages, and jump to the first page of that month
- [ ] Swipe on phone and the arrow keys on desktop turn pages. With reduced motion turned on, pages change without animation

**P0-2 · Quick write.** A new page opens with today's date, the default paper and the cursor on the first line. Nothing is required, including the title.
- [ ] Given the app is unlocked, when I tap New page, then I can type within 2 taps and under 2 s
- [ ] Saving takes one tap. Text that overflows continues onto new pages that share the date and title
- [ ] Paper and handwriting style options are hidden under "Page style" and have sensible defaults

**P0-3 · Voice entry.** Spoken words are written onto the page as I talk.
- [ ] Live dictation works in the installed app on current iOS Safari and Chrome on Android, and on desktop
- [ ] If the microphone is blocked or unsupported, the page says so and explains how to use the device's own keyboard dictation
- [ ] Interim words are shown as they're recognized, and final words are added to the page
- [ ] Note: some browsers send the audio to their own speech service. The app says so the first time dictation is used, and keyboard dictation stays available as the alternative

**P0-4 · Drawing.** An ink layer on every page, photographed pages included. *(Already in the prototype.)*
- [ ] Three inks, two nib sizes, an eraser and undo. Ink is stored as vectors
- [ ] After any stylus input, touches from the palm are ignored for the rest of the session

**P0-5 · Photo page.** Capture or choose a photo of a paper page. It's placed on a page and can be rotated and cropped.
- [ ] The camera opens directly on phones. Choosing an existing image works everywhere
- [ ] The original photo is kept at full quality and encrypted like every other page. A smaller copy is used for display
- [ ] A page is never saved with a missing photo

**P0-6 · Scan your shelf.** A continuous capture mode for importing many pages in a row.
- [ ] I name the notebook (for example "Blue notebook 2023"), then capture page after page without leaving the camera
- [ ] Each page is dated: first from transcription, if I've allowed it for this import and a date is found, otherwise from the previous page, otherwise by me
- [ ] 20 pages can be captured and saved in under 5 minutes on a mid-range phone
- [ ] Imported pages carry the notebook's name and appear in the book in date order

**P0-7 · Handwriting transcription (opt-in, per page or per import).** Turns photographed handwriting into searchable, editable text. This is the only feature that sends page content off the device, so it's off by default.
- [ ] Each time, before anything is sent, a confirmation says which pages will go to the transcription service
- [ ] A whole import can be transcribed in the background after one confirmation
- [ ] The text is stored encrypted with the page and can be edited. Pages that fail or score low confidence are marked so I can check them
- [ ] On the test set, it gets ≥ 90% of words right on neat pages and ≥ 75% on messy ones
- [ ] Technical note: the service's API key is stored inside the encrypted vault on the device. It is never placed in the app's code or sent to the sync server

**P0-8 · Search on the device.** One search box covers titles, typed text and transcriptions. The search index is built and kept only on the device.
- [ ] Each result shows the date, the title and a snippet with the match highlighted. Opening a result goes to that page
- [ ] Results appear in under 1 s for a 1,000-page journal on a mid-range phone

**P0-9 · Locked, encrypted, backed up.** The journal is local-first and end-to-end encrypted.
- [ ] **Setup:** I choose a passphrase. The app shows a recovery key once and asks me to confirm I've stored it before the first page can be written
- [ ] **Encryption:** every page, photo and transcription is encrypted on the device with a key derived from the passphrase, using a slow, standard key-derivation function. Nothing is stored unencrypted, including on the device
- [ ] **Unlocking:** the app asks for the passphrase when opened and locks itself after a period of inactivity that I choose
- [ ] **Offline:** given airplane mode, when I save a page, then it's stored on the device and queued for backup
- [ ] **Backup and sync:** encrypted pages are copied to a sync server when online. A second device with the same passphrase gets the same journal within 1 minute of reconnecting. The server only ever holds encrypted data and never sees the key
- [ ] **Restore:** on a fresh device, the passphrase or the recovery key restores the full journal. This is tested as a drill before v1 counts as done
- [ ] **Trash:** deleted pages go to Trash and can be restored for 30 days

**P0-10 · Export.** The whole journal can be exported at any time, in two forms:
- [ ] **An encrypted backup file**, restorable with the passphrase or the recovery key. The app reminds me to make one monthly
- [ ] **A readable export**, after a warning that it won't be encrypted: a PDF with pages exactly as they look in the book, a Markdown file per page including transcriptions, and a zip of the original photos

### P1: nice to have (fast follow)

- **Prompts when stuck.** A "Give me a prompt" button on a blank page, drawing from a starter set and from my own saved prompts. *Criterion:* choosing a prompt places it as a faint first line that I can keep or remove.
- **Automatic page edges.** Detect the page edges in a photo, straighten the perspective and flatten curved pages.
- **Volumes.** Imported notebooks become separate books on a shelf, each with its own cover, in addition to appearing in the main book.
- **On this day.** On opening, show the page from the same date in earlier years, if there is one.
- **Fix punctuation.** Clean up dictated text without changing the words. This sends the text to the transcription service, so it's opt-in each time like P0-7. *(Already in the prototype.)*
- **On-device transcription.** A lower-quality option that never sends pages anywhere, for pages I'd rather not send.
- **Gentle reminder.** One optional daily nudge at a time I pick.
- **My stats.** A private page showing entries per week, streaks and input types, worked out on the device.

### P2: later (design for these now)

- **Native iPhone and iPad app** with widgets, lock-screen capture and low-latency Apple Pencil. *Design for it:* keep the data model, encryption and sync format independent of the web front end.
- **My own handwriting.** A personal font learned from imported pages. *Design for it:* keep original photos and transcriptions linked page by page.
- **Printed yearly book.** *Design for it:* pages are fixed-size and layout-stable, and they export to print-ready PDF.
- **Field-notes layout.** Questions and observations side by side, with sketches over both.
- **Sharing a single page.** Only if I ever want it, and only as an explicit export. Never as a live link into the journal.

## Success metrics

All measured on the device from page dates and counts. Nothing is reported anywhere. Review at 2 weeks, 4 weeks and 8 weeks after v1.

| Indicator | Metric | Success | Stretch |
|---|---|---|---|
| Leading | Median time from open to saved quick entry (passphrase entry excluded) | ≤ 60 s | ≤ 30 s |
| Leading | Old notebooks fully imported | 1 within 2 weeks | 3 within 8 weeks |
| Leading | Transcription word accuracy (neat / messy test sets) | 90% / 75% | 95% / 85% |
| Leading | Share of entries by input type (typed, voice, photo, drawn) | Tracked, no target. This shows what I actually reach for | — |
| Lagging | Entries per week, against my paper baseline from Phase 0 | ≥ 3 and above baseline | ≥ 5 |
| Lagging | Weeks in a row with at least one entry | 8 | 12 |
| Safety | Lost pages | 0 | 0 |
| Safety | Restore drill on a fresh device | Passes | Passes from the recovery key alone |

## Open questions

**Blocking: answer before the milestone that needs it**

1. **Sync server** (needed for M3): a small hosted database or object store that holds only encrypted data, or a file in my own cloud drive? Whatever is chosen must never receive the key. *(Engineering)*
2. **Transcription service and cost** (needed for M4): Claude's image reading versus on-device text recognition. Phase 0's test pages decide this on accuracy, and the cost per page decides whether whole-shelf imports are affordable. *(Engineering)*

**Not blocking: resolve during the build**

3. How often should the passphrase be asked: every time the app opens, or stay unlocked on a trusted device for a set time? Use device biometrics (Face ID or fingerprint) where the browser supports them? *(Design, security)*
4. Should typed entries use a handwriting font at all, or a clean book typeface? Decide after two weeks of using the prototype. *(Design)*
5. Should the page stay fixed at 17 lines, or adapt to the screen? *(Design)*
6. Should imported notebooks merge into one book, or stay as separate volumes from day one? *(Design)*

## Phasing

No deadline. The milestones are in order, and each one leaves something usable every day.

- **Phase 0: try it (about 2 weeks, using the existing prototype).**
  - Journal in the prototype and count entries per week, compared with my usual paper pace.
  - Run 10 real pages, including the field notebook, through "Read the handwriting" to build the test set.
- **Phase 1: v1 installable web app.**
  - **M1, the daily driver.** Installable and offline app shell, encrypted local storage with passphrase and recovery key, the book, quick write, drawing, Trash, and an encrypted backup file. *After M1, nothing written is ever at risk.*
  - **M2, more ways in.** Photo pages and voice entry.
  - **M3, safe everywhere.** End-to-end encrypted sync, the restore drill, and the readable export.
  - **M4, the shelf.** Scan your shelf, transcription, and search across transcriptions.
- **Phase 2: fast follows.** The P1 list, in whatever order daily use suggests.
- **Phase 3: native app and the bigger bets.** Only if the habit holds (G5).
