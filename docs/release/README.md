# Releases

The release notes as published, one file per version, reproduced verbatim from the
[GitHub releases](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/releases)
with a metadata header (tag, commit, publish dates, assets). For the commit-by-commit
history behind each version see [../changelog/](../changelog/README.md).

| Version | Date | Tag → commit | GitHub | npm | Notes |
| --- | --- | --- | --- | --- | --- |
| [v1.6.0](v1.6.0.md) | 2026-08-08 | `v1.6.0` → `c2ee3f1` | ✅ | ✅ | Documentation tab, console rebuilt on `@clack/prompts`, size and complexity limits enforced by ESLint. |
| [v1.5.0](v1.5.0.md) | 2026-08-08 | — | ❌ | ❌ | Bumped in `package.json`, never published; folded into 1.6.0 the same afternoon. Draft notes kept. |
| [v1.4.1](v1.4.1.md) | 2026-07-14 | `v1.4.1` → `6444e36` | ✅ | ✅ | New `travel_buffs.json` structure (`category:id` → `{ name, desc }`). |
| [v1.4.0](v1.4.0.md) | 2026-06-22 | `v1.4.0` → `b96ba2e` ⚠️ | ✅ | ✅ | Python → TypeScript rewrite, partial migrations, security CI. The tag points at a reverted commit of 2026-05-02. |
| [v1.3.0](v1.3.0.md) | 2026-05-02 | `v1.3.0` → `f9a4ad0` | ✅ | ✅ | Duplicate detection, JSON diff export, first test suite. |
| v1.2.0 | 2026-04-20 | `v1.2.0` → `33ff281` | ❌ | ✅ | Custom project root in settings. No release notes were written; see [changelog/v1.2.0.md](../changelog/v1.2.0.md). |
| [v1.0.0](v1.0.0.md) | 2026-04-19 | `v1.0.0` → `40de05e` | ✅ | ✅ | First published version: Python `.pyz` behind an npm wrapper. |

Version `1.1.0` (bumped and overwritten within the same minute) and the 2025 prototype were
never published; the changelog is the only place that covers them.

## Adding a release

1. Write `docs/changelog/v<version>.md` first — the notes are distilled from it.
2. Write `v<version>.md` here with the same header table as the existing files. The body is
   what goes on the GitHub release, verbatim, so the two never drift.
3. Add the row above, newest first. Drafts and announcement copy (Discord, …) stay local
   under `docs/archived/`.
