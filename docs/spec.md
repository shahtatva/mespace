# Paperleaf Journal: v1 spec

*Draft · October 21, 2026 · builds on [brainstorm.md](brainstorm.md) and the [prototype](https://claude.ai/artifact/RMCm96Uw4zoxds6959aaDU)*

**In one line:** a journal where every entry is a page in a paper-style book, and where photographed paper pages and digital pages live together, in date order, searchable from your phone.

---

## Problem statement

People who journal on paper hit three walls.

1. **Effort.** Writing by hand takes more time and effort than a busy moment allows, so entries get skipped.
2. **Preservation.** Years of notebooks take up shelf space, wear out, and have no backup.
3. **Access.** Old entries can't be reached when the notebook isn't nearby, and can't be searched even when it is.

Existing journaling apps solve capture and search, but they feel like a notes app, which loses the personal quality that makes paper journaling worth doing. Paper-style note apps keep the look, but they treat a person's existing paper notebooks as foreign material.

**Evidence today is one person:** the founder's own practice, shown in the reference photos, plus a working prototype. Phase 0 below exists to widen that.

## Target users

- **Primary: the hybrid journaler.** Keeps a paper journal, carries a phone everywhere, and writes less often than they'd like because writing takes effort.
- **Secondary: the archivist.** Has a shelf of old notebooks and worries about losing them. May have stopped journaling.

## Goals

| # | Goal | Type | Measured by |
|---|---|---|---|
| G1 | **Making an entry takes under a minute.** Median time from opening the app to a saved quick entry is ≤ 60 s | User | Timestamps for app open and first save (no content logged) |
| G2 | **People journal more often.** Beta users average ≥ 3 entries a week in weeks 2–4, and ≥ 60% say they journal more than before | User | Entry counts plus an end-of-beta survey |
| G3 | **Old notebooks get preserved.** ≥ 40% of beta users who own old notebooks import at least one full notebook (≥ 20 pages) within 14 days | User | Import events |
| G4 | **Old entries can be found.** ≥ 80% of "find this entry" tasks succeed on the first search in usability tests, and handwriting transcription gets ≥ 90% of words right on neat pages | User | Usability test; a labelled set of transcription test pages |
| G5 | **Demand is validated.** Week-4 retention (wrote at least one entry in week 4) is ≥ 40% across a 20-person beta | Business | Beta cohort |

## Non-goals

1. **No formatting, folders or tags.** Every choice adds effort. The book's order, its index and the month tabs are the organization.
2. **No planner features** (calendars, habit trackers, to-do lists). The digital planners in the reference photos already do this. Paperleaf is a journal.
3. **No sharing or collaboration.** Journals are private by design. Sharing changes the trust model and the product.
4. **No personal handwriting font in v1.** It's the most exciting idea and the riskiest to build. Revisit once users have imported enough of their own pages to learn from (P2).
5. **No native mobile app, widgets or lock-screen capture in v1.** v1 is an installable web app so the prototype can be reused. Native comes after demand is validated (P2).
6. **No printed books.** This is a possible revenue line once there are enough pages to print (P2).

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

### Edge cases

11. As a journaler with no signal, I want my entry saved anyway, so that I never lose words to a bad connection.
12. As a journaler whose handwriting can't be read, I want the photo kept and marked "not transcribed", with an option to type the text myself, so that a failed transcription never loses a page.
13. As a journaler who writes long, I want text that doesn't fit to continue onto the next page, so that page size never cuts me off.
14. As a journaler who deleted a page by mistake, I want to restore it within 30 days, so that a slip isn't permanent.
15. As a journaler who doesn't want AI reading my pages, I want to turn transcription off and still use everything else, so that I can choose my own privacy level.

## Requirements

### P0: must have (v1 doesn't ship without these)

**P0-1 · The book.** Entries are pages in one book, in date order. The book shows two-page spreads on tablet and desktop and single pages on phone. It has page turning, page numbers, an index that builds itself, and month tabs. *(Already in the prototype.)*
- [ ] Each entry is a page, ordered by its date, then by when it was created
- [ ] The index lists every page with its date, title or first line, and page number. Tapping a row opens that page
- [ ] Month tabs appear only for months that have pages, and jump to the first page of that month
- [ ] Swipe on phone and the arrow keys on desktop turn pages. With reduced motion turned on, pages change without animation

**P0-2 · Quick write.** A new page opens with today's date, the default paper and the cursor on the first line. Nothing is required, including the title.
- [ ] Given the app is open, when the user taps New page, then they can type within 2 taps and under 2 s
- [ ] Saving takes one tap. Text that overflows continues onto new pages that share the date and title
- [ ] Paper and handwriting style options are hidden under "Page style" and have sensible defaults

**P0-3 · Voice entry.** Spoken words are written onto the page as the user talks.
- [ ] Live dictation works in the installed web app on current iOS Safari and Chrome on Android, and on desktop
- [ ] If the microphone is blocked or unsupported, the page says so and explains how to use the device's own keyboard dictation
- [ ] Interim words are shown as they're recognized, and final words are added to the page

**P0-4 · Drawing.** An ink layer on every page, photographed pages included. *(Already in the prototype.)*
- [ ] Three inks, two nib sizes, an eraser and undo. Ink is stored as vectors
- [ ] After any stylus input, touches from the palm are ignored for the rest of the session

**P0-5 · Photo page.** Capture or choose a photo of a paper page. It's placed on a page and can be rotated and cropped.
- [ ] The camera opens directly on phones. Choosing an existing image works everywhere
- [ ] The original photo is kept at full quality. A smaller copy is used for display
- [ ] If an upload is interrupted, it resumes, and the page is never saved with a missing photo

**P0-6 · Scan your shelf.** A continuous capture mode for importing many pages in a row.
- [ ] The user names the notebook (for example "Blue notebook 2023"), then captures page after page without leaving the camera
- [ ] Each page is dated: first from transcription, if it's turned on and a date is found, otherwise from the previous page, otherwise by the user
- [ ] 20 pages can be captured and saved in under 5 minutes on a mid-range phone
- [ ] Imported pages carry the notebook's name and appear in the book in date order

**P0-7 · Handwriting transcription (opt-in).** Turns photographed handwriting into searchable, editable text.
- [ ] Before the first use, a consent screen explains what is sent, where it goes, and that transcription can be turned off at any time
- [ ] Transcription can run on one page or on a whole import, in the background
- [ ] Text is editable. Pages that fail or score low confidence are marked so the user can check them
- [ ] On the labelled test set, it gets ≥ 90% of words right on neat pages and ≥ 75% on messy ones

**P0-8 · Search.** One search box covers titles, typed text and transcriptions.
- [ ] Each result shows the date, the title and a snippet with the match highlighted. Opening a result goes to that page
- [ ] Results appear in under 1 s for a 1,000-page journal

**P0-9 · Saved, synced, private.** Entries are saved on the device first, so the app works offline. They then sync to the user's account.
- [ ] Given airplane mode, when a page is saved, then it is kept on the device, and it appears on a second signed-in device within 1 minute of reconnecting
- [ ] Data is encrypted in transit and at rest. No entry content appears in analytics or logs
- [ ] Deleted pages go to Trash and can be restored for 30 days

**P0-10 · Export.** The whole journal can be exported at any time.
- [ ] A PDF with pages exactly as they look in the book
- [ ] A Markdown or text file per page, including transcriptions
- [ ] A zip of the original photos

### P1: nice to have (fast follow)

- **Prompts when stuck.** A "Give me a prompt" button on a blank page, drawing from a starter set and from the user's own saved prompts. *Criterion:* choosing a prompt places it as a faint first line that the user can keep or remove.
- **Automatic page edges.** Detect the page edges in a photo, straighten the perspective and flatten curved pages.
- **Volumes.** Imported notebooks become separate books on a shelf, each with its own cover, in addition to appearing in the main book.
- **On this day.** On opening, show the page from the same date in earlier years, if there is one.
- **Fix punctuation.** Clean up dictated text without changing the words. *(Already in the prototype.)*
- **Gentle reminder.** One optional daily nudge at a time the user picks.

### P2: later (design for these now)

- **Native iPhone and iPad app** with widgets, lock-screen capture and low-latency Apple Pencil. *Design for it:* keep the data model and sync independent of the web front end.
- **Your own handwriting.** A personal font learned from imported pages. *Design for it:* keep original photos and transcriptions linked page by page.
- **End-to-end encryption.** *Design for it:* keep transcription on the device or behind explicit consent, so it doesn't depend on the server reading content.
- **Printed yearly book.** *Design for it:* pages are fixed-size and layout-stable, and they export to print-ready PDF.
- **Field-notes layout.** Questions and observations side by side, with sketches over both.

## Success metrics

Evaluate at 2 weeks and at 6 weeks of beta. Analytics count events only, never content.

| Indicator | Metric | Success | Stretch |
|---|---|---|---|
| Leading | First entry saved in the first session | 70% of new users | 85% |
| Leading | Median time from open to saved quick entry | ≤ 60 s | ≤ 30 s |
| Leading | Users who start a shelf import and finish ≥ 20 pages | 50% | 70% |
| Leading | Transcription word accuracy (neat / messy test sets) | 90% / 75% | 95% / 85% |
| Leading | Share of entries by input type (typed, voice, photo, drawn) | Tracked, no target. This tells us what people actually reach for | — |
| Lagging | Week-4 retention (≥ 1 entry in week 4) | 40% | 55% |
| Lagging | Entries per active user per week | 3 | 5 |
| Lagging | "I'd trust this with my private entries" (survey) | 80% agree | 90% |
| Lagging | Data-loss incidents | 0 | 0 |

## Open questions

**Blocking: answer before Phase 1 starts**

1. **Who is v1 for:** just you, or a beta group of other journalers? This changes how much account, sync and onboarding work is P0. *(You)*
2. **Platform:** an installable web app (recommended: it reuses the prototype, and the microphone and camera work outside claude.ai), or native iOS first? *(You, engineering)*
3. **Privacy model:** server-side encryption (simpler, and allows server-side search and transcription) or end-to-end encryption (stronger, but harder)? *(Engineering, legal)*
4. **Transcription engine and cost per page:** a hosted vision model such as Claude, or on-device text recognition? Cost decides whether whole-shelf imports are viable. *(Engineering, data)*

**Not blocking: resolve during the build**

5. Should typed entries use a handwriting font at all, or a clean book typeface? Test both in the interviews. *(Design)*
6. Should the page size stay fixed at 17 lines, or adapt to the screen? *(Design)*
7. Should imported notebooks merge into one book, or stay as separate volumes from day one? *(Design, interviews)*
8. Pricing: free, one-time purchase, or subscription to cover storage and transcription? *(Business)*
9. Account deletion and data-export obligations under privacy laws in the launch markets. *(Legal)*
10. Is there a fixed date for this, such as a class pitch or a demo day? *(You)*

## Timeline and phasing

No hard deadlines are known yet (see open question 10).

- **Phase 0: validate (about 2 weeks, uses the existing prototype).**
  - Journal in the prototype for two weeks and compare entries per week with your paper baseline.
  - Run 10 real pages, including the field notebook, through transcription to build the test set.
  - Interview 5 paper journalers.
  - *Exit criterion:* the riskiest assumption, that the paper feel makes people journal more, holds up.
- **Phase 1: v1 installable web app.**
  - Scope: P0-1 to P0-10.
  - Dependencies: an auth and sync backend, file storage for photos, and a transcription provider.
  - Rough size for one developer: 8–10 weeks. This is an assumption to re-estimate once the platform and privacy questions are answered.
- **Phase 2: fast follows.** The P1 list, ordered by what the beta shows.
- **Phase 3: native app and the bigger bets.** Decided by the Phase 1 retention results.
