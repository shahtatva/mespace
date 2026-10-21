# Prototype

`paperleaf.html` is the first working prototype of Paperleaf Journal: one self-contained page, no build step.

## Where it runs

**Inside Claude (the published artifact).** This is the full version: [Paperleaf Journal](https://claude.ai/artifact/RMCm96Uw4zoxds6959aaDU). Pages are saved privately to your Claude account. Photos can be taped in, and Claude can read the handwriting on them.

**Opened as a plain file in a browser.** The notebook, writing, drawing, dictation (where the browser allows it) and search all work. Nothing is saved, though: the status line says "Preview · pages are not kept", and everything is gone when the tab closes. The prototype stores data through claude.ai, so it can't save anywhere when opened this way.

## How it relates to the app

The installable app in [`../app/`](../app/) grew out of this prototype. It keeps the same notebook design, saves pages on the device, and adds Trash, backup and restore, and offline support. The prototype stays here for reference. It is also the only version that can currently read handwriting with Claude, and only when opened inside Claude.
