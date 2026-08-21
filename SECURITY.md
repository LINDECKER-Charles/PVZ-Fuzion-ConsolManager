# Security Policy

`@charles_lindecker/pvzf-console` is a local-first CLI: it reads the game's
localization files from disk, writes reports next to them, and ships two runtime
dependencies (`@clack/prompts`, `picocolors`). It has no server component and
stores no credentials of its own. Vulnerabilities therefore mostly look like
path traversal, unsafe file writes, command/argument injection, or a compromised
dependency reaching an end user's machine.

## Supported versions

Only the latest published minor is supported. Fixes are released as a new patch
version on npm; older lines are not backported.

| Version | Supported |
| ------- | --------- |
| 1.6.x   | ✅        |
| < 1.6   | ❌        |

Node.js 20 or later is required (see `engines` in `package.json`). Running the
CLI on an end-of-life Node release is out of scope.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report privately through either channel:

- GitHub — [Report a vulnerability](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/security/advisories/new)
  (preferred: keeps the discussion and the eventual advisory in one place).
- Email — charles.lindecker@outlook.fr, with `SECURITY` in the subject.

Please include:

- affected version (`pvzf-console --version`) and Node.js version;
- operating system;
- a minimal reproduction — command line, relevant input file layout, and the
  observed vs. expected behaviour;
- the impact you believe it has.

### What to expect

| Step                     | Target                                     |
| ------------------------ | ------------------------------------------ |
| Acknowledgement          | 5 business days                            |
| Initial assessment       | 10 business days                           |
| Fix for confirmed issues | best effort, prioritised by severity       |

This is a hobby project maintained by a single person: there is no on-call
rotation and no paid bug bounty. Reporters are credited in the published
advisory unless they ask otherwise.

Please keep the report private until a fixed version is published, or for
90 days after the acknowledgement, whichever comes first.

## Out of scope

- Vulnerabilities in Plants vs Zombies: Fusion itself, or in its localization
  data — report those to the game's authors.
- Findings that require an attacker to already control the machine or the
  account running the CLI.
- Automated scanner output without a demonstrated impact on this project.
- Advisories in development-only dependencies that never reach the published
  `dist/` bundle. They are tracked, but as maintenance rather than as security
  incidents.

## Preventive measures already in place

The `Security` workflow runs on every push and pull request to `main`, weekly on
a schedule, and on demand:

- `npm audit --omit=dev --audit-level=high` — blocking on production
  dependencies, informational on the full tree;
- ESLint with the security ruleset (`npm run lint:security`, zero warnings);
- Semgrep (`.semgrep.yml` plus the `p/typescript` and `p/nodejs` packs);
- Gitleaks over the full repository history (`.gitleaks.toml`).

Dependabot opens weekly dependency update pull requests behind a cooldown
window.
