# Changelog

The complete technical history of the project, rebuilt from the git log: every one of the
commits since the first one on 2025-10-30 is accounted for in exactly one file. Each file
covers one version — the commits between the previous tag and the version's own — and ends
with the table of those commits.

For the notes that were actually published with each version, see
[../release/](../release/README.md).

| Version | Period | Commits | Tag | npm | GitHub release |
| --- | --- | ---: | --- | --- | --- |
| [Unreleased](unreleased.md) | 2026-08-08 → 2026-08-22 | 9 | — | — | — |
| [v1.6.0](v1.6.0.md) | 2026-08-08 | 13 | `c2ee3f1` | 2026-08-08 | [yes](../release/v1.6.0.md) |
| [v1.5.0](v1.5.0.md) | 2026-07-20 → 2026-08-08 | 18 | — | — | [never published](../release/v1.5.0.md) |
| [v1.4.1](v1.4.1.md) | 2026-07-14 | 2 | `6444e36` | 2026-07-14 | [yes](../release/v1.4.1.md) |
| [v1.4.0](v1.4.0.md) | 2026-05-02 → 2026-06-22 | 24 | `b96ba2e` ⚠️ | 2026-06-22 | [yes](../release/v1.4.0.md) |
| [v1.3.0](v1.3.0.md) | 2026-04-30 | 8 | `f9a4ad0` | 2026-05-02 | [yes](../release/v1.3.0.md) |
| [v1.2.0](v1.2.0.md) | 2026-04-20 | 3 | `33ff281` | 2026-04-20 | — |
| [v1.0.0](v1.0.0.md) | 2026-04-19 | 3 | `40de05e` | 2026-04-19 | [yes](../release/v1.0.0.md) |
| [0.x — Python prototype](v0.x-prototype.md) | 2025-10-30 → 2025-11-02 | 11 | — | — | — |

⚠️ The `v1.4.0` tag points at a version-bump commit of 2026-05-02 that was reverted minutes
later; the 1.4.0 content landed on 2026-06-22. Each file's *Notes* section records this kind
of discrepancy between the git history and what was published.

## Format

Each file has the same shape:

1. a header table — period, commit count, tag and the commit it points at, npm publish date,
   link to the published release notes;
2. a short summary of what the version is about, user-facing first;
3. sections in this fixed order, only those that apply: **Added**, **Changed**, **Fixed**,
   **Removed**, **Security**, **Dependencies**, **CI**, **Build**, **Docs**, **Internal**.
   Every entry ends with the commit(s) that back it, linked to GitHub;
4. **Notes** — version bumps, tag or publish anomalies, anything needed to reconcile the
   history with the released versions;
5. **Commits** — the exhaustive table for the range (hash, date, author, subject). A Dependabot
   merge commit is folded into the dependency entry it merges.

## Adding a version

Before tagging, create `v<version>.md` from the commits since the previous tag
(`git log --reverse --date=short --format='%h|%ad|%an|%s' <previous-tag>..HEAD`), move the
entries that `unreleased.md` accumulated into it, and add the row above. Keep the entries
factual: name the files, commands, menu entries, settings keys and version numbers the diff
actually touches.
