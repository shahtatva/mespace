# Paperleaf Journal: brainstorm notes

*October 21, 2026 · input: concept write-up, five reference photos, the working prototype ([Paperleaf Journal artifact](https://claude.ai/artifact/RMCm96Uw4zoxds6959aaDU))*

## 1. Frame

**What we're exploring.** A digital journal that keeps the look and feel of a paper notebook. Each entry is a page in a book, not a document.

**Why now.** A working prototype exists. Before turning it into a real app, we need to decide what the product is *for*, because the three original frustrations point in different directions.

**What we know.**

- The person with the problem journals on paper today. The reference photos include a hand-written "how to journal" guide spread and a dense field notebook, with questions, observations and sketches mixed together.
- They also look at digital planners: the GoodNotes-style PDF planners with month tabs and hyperlinked pages.
- The three stated frustrations are:
  1. **Effort:** making an entry takes too long.
  2. **Preservation:** notebooks take up space and wear out.
  3. **Access:** the right notebook isn't with you when you need an old entry.
- Building the prototype showed that a browser page can't reliably use the microphone. Voice is a platform problem, not a feature problem.

**Constraints.** Small team (likely one person). A journal holds the most private data a person owns. The prototype is a single web page inside claude.ai.

## 2. The job underneath

> When something happens that I want to process or remember, I want to get it down quickly in a way that still feels like *my* journal, so I feel settled now and can find it again later.

The functional job (capture, store, find) is already served by Day One, Apple Journal and plain Notes. The **emotional job** is the opening: the entry should feel personal and intimate, and not like a productivity tool. The paper look stands in for that feeling. The real question is whether the look alone is enough to deliver it.

**What people "fire" to hire this:**
- the paper notebook, for the moments when it's too slow or isn't in your bag
- the phone's Notes app, for when paper isn't available but the result feels throwaway
- doing nothing, which is the most common outcome

## 3. Diverge: ten directions

| # | Direction | Which frustration it hits |
|---|---|---|
| A | **Hybrid book** (the current prototype): photographed paper pages and digital pages in one chronological book | Access, preservation |
| B | **"Scan your shelf":** batch-digitize whole old notebooks. Fast page capture, auto-crop, auto-dating, searchable text | Preservation (directly) |
| C | **Ten-second capture:** voice or a quick note from a widget or lock screen that lands as a finished page with zero choices | Effort |
| D | **Your own handwriting:** learn the writer's letterforms from imported pages, so typed and spoken entries appear in *their* handwriting, not a stock font | The emotional job |
| E | **Prompts from your own guide:** the reference guide spread *is* a prompt list ("emotions I feel", "stories to remember"). Make "I'm stuck" a first-class button | Effort (blank-page friction) |
| F | **Remove the choices:** no folders, tags or formatting. The book's order, index and month tabs are the only organization | Effort |
| G | **The opposite: print it.** Turn a year of digital pages into a bound physical book | Preservation, inverted |
| H | **Field-notes mode:** questions on one side, observations on the other, sketches over both, as in the field-notebook photo. Serves students and researchers | A different segment |
| I | **Marked paper:** pages with a printed code so a photo files itself under the right date and notebook | Preservation (hardware-adjacent) |
| J | **On this day:** reopen the spread from a year ago. Access becomes rediscovery | Access |

## 4. Provoke

- **"A skin isn't a product."** Strongest case against: people who love paper will keep paper, and people who journal digitally don't care what it looks like. The hybrid audience in the middle might be small. *Counter:* that middle is exactly the person this started with, who has both. It needs to be tested, not assumed.
- **Stock handwriting fonts can feel fake.** Typed text in a handwriting font can come across as a costume. Paper journalers love *their own* hand. This is why direction D matters, and also why the prototype's typed pages may disappoint the target user most.
- **The prototype adds effort.** Paper type, handwriting style and a title field are decisions, and decisions are effort. Frustration #1 says defaults should do the work. Ship with choices hidden.
- **The 17-line page is a feature and a friction.** A finite page is less intimidating than an endless document and gives entries rhythm. Long voice entries overflow it, though. The carry-over to a new page handles this, but it needs watching.
- **Trust is the adoption gate.** People will put their rawest writing here. Cloud storage plus sending photos to an AI for transcription needs a clear, upfront privacy story: opt-in transcription, encryption, and an easy export.
- **The web is the wrong home for capture.** Camera, microphone, offline use, widgets and stylus input all point to a native app (iPhone and iPad first). The browser prototype hit the microphone wall on day one.

## 5. Assumptions, ranked by risk

| Assumption | Confidence | Cheapest test |
|---|---|---|
| **The paper feel makes people journal more often than a plain app would** (riskiest) | Low. It's a hunch from one person | Use the prototype for two weeks. Count entries per week against your paper baseline, and note which input you actually reach for |
| Handwriting transcription is good enough on real, messy pages | Medium for neat print, low for field-note scrawl | Run 10 real pages (including the field notebook) through "Read the handwriting" and count the share of words it gets right |
| Hybrid journalers exist beyond one person | Unknown | Five short interviews with people who keep paper journals: what stops them writing more, and would they trust digital? |
| People will trust a cloud journal with private entries | Medium | Ask the same five people directly; watch for hesitation at the photo-upload step |
| Batch scanning is the hook that gets someone started | Medium | In the interviews, ask how many old notebooks they own and what they'd do if those were lost |

## 6. Converge

**1. Core: the hybrid book (A), with defaults (F).** This is the one thing nobody else does well: paper pages and digital pages living together in one book, in date order. Every other journaling app treats a scanned page as an attachment, not a page. Keep it, and remove the decisions.

**2. Wedge: "Scan your shelf" (B).** My strongest pick. Preservation is the most concrete pain, and it's the one thing paper can never fix on its own. Digitizing old notebooks is a reason to install the app. The hybrid book is the reason to keep using it.

**3. Habit: ten-second capture with prompts (C + E).** This answers frustration #1. If an entry can't be made in under a minute on a phone, the effort problem isn't solved, however nice the pages look.

**Set aside for now (interesting, not first):**
- D, your own handwriting font: the most exciting idea and the riskiest to build. Revisit once there are imported pages to learn from.
- G, printed books: a later revenue idea.
- H, field-notes mode: a separate segment.
- I, marked paper: hardware, out of scope.
- J, on this day: cheap, add after launch.

## 7. Next steps

1. Write the spec around 1–3 above (see `spec.md`).
2. Run the two cheapest tests now, using the existing prototype: two weeks of self-use, and transcription on 10 real pages.
3. Book five interviews with paper journalers before building native capture.
