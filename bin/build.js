#!/usr/bin/env node
/* eslint-disable no-console */
"use strict";

const { spawnSync } = require("child_process");
const {
    copyFileSync,
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
} = require("fs");
const os = require("os");
const path = require("path");

const MIN_MAJOR = 3;
const MIN_MINOR = 10;

const PYTHON_DOWNLOAD_URL = "https://www.python.org/downloads/";


function detectPython() {
    for (const cmd of ["python3", "python", "py"]) {
        const result = spawnSync(cmd, ["--version"], { stdio: "pipe", encoding: "utf8" });
        /* c8 ignore next -- the `result.status !== 0` half only triggers if a binary
           named python* exists on PATH and answers --version with a non-zero exit */
        if (result.error || result.status !== 0) continue;

        /* c8 ignore next -- older pythons print --version to stderr instead of stdout */
        const version = `${result.stdout || ""}${result.stderr || ""}`.trim();
        const match = version.match(/Python\s+(\d+)\.(\d+)/);
        /* c8 ignore next -- a python that prints a non-Python-shaped version line */
        if (!match) continue;

        const major = Number(match[1]);
        const minor = Number(match[2]);
        /* c8 ignore next 3 -- the `<MIN` half requires an outdated python on PATH */
        if (major > MIN_MAJOR || (major === MIN_MAJOR && minor >= MIN_MINOR)) {
            return { cmd, version };
        }
    }
    return null;
}


function pythonMissingMessage() {
    return [
        `Python ${MIN_MAJOR}.${MIN_MINOR}+ is required but was not found on PATH.`,
        `install it from ${PYTHON_DOWNLOAD_URL} and try again.`,
    ];
}


/**
 * Build dist/pvzf_console.pyz from the packaged src/ and data/.
 *
 * @param {object} options
 * @param {string} options.repoRoot   Root containing src/, data/, dist/.
 * @param {boolean} [options.quiet]   Suppress stdout/stderr of the python call.
 * @returns {string} Absolute path to the generated archive.
 */
function buildPyz({ repoRoot, quiet = false }) {
    const srcDir = path.join(repoRoot, "src", "pvz_console");
    const dataDir = path.join(repoRoot, "data");
    const distDir = path.join(repoRoot, "dist");
    const outFile = path.join(distDir, "pvzf_console.pyz");

    const python = detectPython();
    if (python === null) {
        const err = new Error(pythonMissingMessage().join("\n"));
        err.code = "PYTHON_NOT_FOUND";
        throw err;
    }
    if (!existsSync(srcDir)) {
        throw new Error(`source directory missing: ${srcDir}`);
    }

    const staging = mkdtempSync(path.join(os.tmpdir(), "pvzf-build-"));
    try {
        const stagedPackage = path.join(staging, "pvz_console");
        cpSync(srcDir, stagedPackage, { recursive: true });
        if (existsSync(dataDir)) {
            cpSync(dataDir, path.join(stagedPackage, "data"), { recursive: true });
        }

        mkdirSync(distDir, { recursive: true });
        const result = spawnSync(
            python.cmd,
            ["-m", "zipapp", staging, "-m", "pvz_console.__main__:main", "-o", outFile],
            { stdio: quiet ? "pipe" : "inherit" },
        );
        /* c8 ignore start -- defensive: zipapp exits 0 unless the host Python is broken */
        if (result.error) throw result.error;
        if (result.status !== 0) {
            throw new Error(`zipapp exited with status ${result.status}`);
        }
        /* c8 ignore stop */

        const distReadmeSrc = path.join(repoRoot, "README.dist.md");
        if (existsSync(distReadmeSrc)) {
            copyFileSync(distReadmeSrc, path.join(distDir, "README.md"));
        }
    } finally {
        rmSync(staging, { recursive: true, force: true });
    }

    return outFile;
}


module.exports = { buildPyz, detectPython, pythonMissingMessage, PYTHON_DOWNLOAD_URL };


// CLI entry point: `node scripts/build.js`
if (require.main === module) {
    const repoRoot = path.resolve(__dirname, "..");
    try {
        const outFile = buildPyz({ repoRoot });
        console.log(`built: ${path.relative(repoRoot, outFile)}`);
        const readmeOut = path.join(repoRoot, "dist", "README.md");
        if (existsSync(readmeOut)) {
            console.log(`doc:   ${path.relative(repoRoot, readmeOut)}`);
        }
    } catch (e) {
        console.error(`build: ${e.message}`);
        process.exit(1);
    }
}
