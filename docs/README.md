# Documentation

Everything about **PVZ Fuzion Console Manager**, split so the main
[README](../README.md) can stay short.

## Start here

| You are… | Read |
| --- | --- |
| a **translator** who wants reports and a backlog | [guide/usage.md](guide/usage.md), then [guide/outputs.md](guide/outputs.md) |
| a **locale maintainer** setting the tool up for a team | [guide/configuration.md](guide/configuration.md), then [guide/catalog.md](guide/catalog.md) |
| a **contributor** about to touch the code | [internals/architecture.md](internals/architecture.md), then [CONTRIBUTING.md](../CONTRIBUTING.md) |
| wondering **what changed** | [release/](release/README.md) for what shipped, [changelog/](changelog/README.md) for every commit |
| **stuck** | [guide/troubleshooting.md](guide/troubleshooting.md) |

## Layout

| Folder | Contents |
| --- | --- |
| [guide/](guide/) | User-facing reference: install, screens, commands, settings, supported files, generated outputs, troubleshooting. |
| [internals/](internals/) | How the code is built: layers, seams, invariants, enforced limits, extension points. |
| [release/](release/) | The published release notes, one file per version, reproduced verbatim from GitHub. |
| [changelog/](changelog/) | The full technical history, one file per version, every commit accounted for. |
| [assets/](assets/) | Diagrams and icons used across these pages, plain SVG — no binary images in the repository. |
| `archived/` | Local-only working material: release drafts, announcement copy, dated audits. Gitignored. |

## Guide

| Document | Contents |
| --- | --- |
| [guide/usage.md](guide/usage.md) | Install, project-root discovery, every menu screen, the headless commands, exit codes, CI usage. |
| [guide/catalog.md](guide/catalog.md) | Every locale, file, category, migration target and Trello list the toolkit handles — and what it ignores on purpose. |
| [guide/configuration.md](guide/configuration.md) | Settings reference, per-platform storage locations, on-disk format, environment overrides, upgrade notes. |
| [guide/outputs.md](guide/outputs.md) | The anatomy of every generated report, JSON diff, CSV and summary, with samples. |
| [guide/troubleshooting.md](guide/troubleshooting.md) | Symptom, cause, fix — grouped by area. |

## Internals

| Document | Contents |
| --- | --- |
| [internals/architecture.md](internals/architecture.md) | Design goals, layers, seams, invariants, enforced limits, testing strategy, extension points. |

## History

| Document | Contents |
| --- | --- |
| [release/README.md](release/README.md) | Index of every version: tag, commit, publish dates on GitHub and npm, one-line summary. |
| [changelog/README.md](changelog/README.md) | Index of the commit-by-commit history, from the 2025 Python prototype to today. |
| [Releases on GitHub](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/releases) | The same notes, where they were published. |

## Project

| Document | Contents |
| --- | --- |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Dev setup, code standards, tests, commit and branch conventions, how to add a translation category, release checklist. |
| [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | The behaviour expected of everyone taking part. |
| [SECURITY.md](../SECURITY.md) | Threat model, supported versions, private reporting, preventive measures in CI. |
