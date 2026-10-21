# Prototype

`paperleaf.html` is the first working prototype of Paperleaf Journal: one self-contained page, no build step.

## Where it runs

**Inside Claude (the published artifact).** This is the full version: [Paperleaf Journal](https://claude.ai/artifact/RMCm96Uw4zoxds6959aaDU). Pages are saved privately to your Claude account. Photos can be taped in, and Claude can read the handwriting on them.

**Opened as a plain file in a browser.** The notebook, writing, drawing, dictation (where the browser allows it) and search all work. Nothing is saved, though: the status line says "Preview · pages are not kept", and everything is gone when the tab closes. The prototype stores data through claude.ai, so it can't save anywhere when opened this way.

## What it already covers from the spec

| Spec item | In the prototype |
|---|---|
| P0-1 The book | Yes: spreads, page turn, index, month tabs, ribbon |
| P0-2 Quick write | Yes, but the paper and handwriting choices are still visible, not hidden |
| P0-3 Voice entry | Partly: works where the browser allows the microphone, with keyboard dictation as the fallback |
| P0-4 Drawing | Yes |
| P0-5 Photo page | Yes, without rotate or crop |
| P0-6 Scan your shelf | No |
| P0-7 Transcription | Yes, inside Claude only |
| P0-8 Search | Yes |
| P0-9 Encrypted, local-first, backed up | No. It uses claude.ai storage, which is private to you but not end-to-end encrypted |
| P0-10 Export | No |

The v1 app (see [../docs/spec.md](../docs/spec.md)) will reuse its layout and page rendering. Storage will be replaced with encrypted, local-first storage.
