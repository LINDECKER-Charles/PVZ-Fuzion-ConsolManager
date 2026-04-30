#!/usr/bin/env node
/* eslint-disable no-console */
"use strict";

const { spawnSync } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

const { buildPyz, detectPython, pythonMissingMessage } = require("./build");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const PYZ_PATH = path.join(PACKAGE_ROOT, "dist", "pvzf_console.pyz");


function fatal(message) {
    const prefix = "pvzf-console:";
    for (const line of String(message).split("\n")) {
        console.error(`${prefix} ${line}`);
    }
    process.exit(1);
}


function ensureArchive() {
    if (existsSync(PYZ_PATH)) return;
    // The archive was either never built (fresh `npm install` from a stripped
    // tarball, or a dev checkout) or the user deleted it. Rebuild from the
    // sources shipped in the npm package.
    try {
        console.error("pvzf-console: bundled archive not found, building it now\u2026");
        buildPyz({ repoRoot: PACKAGE_ROOT, quiet: true });
    } catch (e) {
        /* c8 ignore start -- defensive: main() exits on PYTHON_NOT_FOUND before we get here */
        if (e && e.code === "PYTHON_NOT_FOUND") {
            fatal(pythonMissingMessage().join("\n"));
        }
        /* c8 ignore stop */
        /* c8 ignore next -- defensive: ternary fallback when the thrown value lacks .message */
        fatal(`failed to build bundled archive: ${e && e.message ? e.message : e}`);
    }
    /* c8 ignore start -- defensive: buildPyz either creates the archive or throws */
    if (!existsSync(PYZ_PATH)) {
        fatal(`archive still missing after build: ${PYZ_PATH}`);
    }
    /* c8 ignore stop */
}


function main() {
    const python = detectPython();
    if (python === null) {
        fatal(pythonMissingMessage().join("\n"));
    }

    ensureArchive();

    const args = process.argv.slice(2);
    const result = spawnSync(python.cmd, [PYZ_PATH, ...args], { stdio: "inherit" });
    /* c8 ignore start -- defensive: spawnSync only errors when the resolved python disappears between detect and exec */
    if (result.error) {
        fatal(result.error.message);
    }
    /* c8 ignore stop */
    /* c8 ignore next -- result.status is null only when the child is killed by signal */
    process.exit(result.status === null ? 1 : result.status);
}


module.exports = { main, fatal, ensureArchive, PYZ_PATH };

if (require.main === module) {
    main();
}
