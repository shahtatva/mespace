# mespace

Home of **Paperleaf Journal**: a journal where every entry is a page in a paper-style book. Photographed paper pages and digital pages live together, in date order, searchable from your phone.

It came from three frustrations with paper journaling:

- **Effort:** writing an entry takes too long.
- **Preservation:** notebooks take up space and wear out.
- **Access:** old entries can't be reached when the notebook isn't nearby.

The goal is to fix those three without losing what makes paper journaling feel personal.

## Status

Phase 0: trying the prototype before building v1.

## What's here

| Path | What it is |
|---|---|
| [`docs/brainstorm.md`](docs/brainstorm.md) | Problem framing, directions explored, riskiest assumptions, and what was chosen |
| [`docs/spec.md`](docs/spec.md) | The v1 spec: decisions, goals, requirements, metrics and milestones |
| [`prototype/`](prototype/) | The working prototype, a single HTML page. [Try it in Claude](https://claude.ai/artifact/RMCm96Uw4zoxds6959aaDU) |

## Key decisions for v1

- **For one person.** A personal tool, with no accounts for other people and no analytics.
- **An installable web app** for phone, tablet and desktop.
- **End-to-end encrypted and local-first.** Pages live on the device, encrypted with a key only the owner holds. Backups are encrypted before they leave the device.
- **No deadline.** Work goes milestone by milestone, starting with a version usable every day.
