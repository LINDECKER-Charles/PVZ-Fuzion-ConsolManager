"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
    buildPyz,
    detectPython,
    pythonMissingMessage,
    PYTHON_DOWNLOAD_URL,
} = require("../bin/build");


function makeFixtureRepo() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pvzf-fixture-"));
    const pkg = path.join(root, "src", "pvz_console");
    fs.mkdirSync(pkg, { recursive: true });
    fs.writeFileSync(path.join(pkg, "__init__.py"), "");
    fs.writeFileSync(
        path.join(pkg, "__main__.py"),
        "def main():\n    print('ok')\n\nif __name__ == '__main__':\n    main()\n",
    );
    fs.mkdirSync(path.join(root, "data"), { recursive: true });
    fs.writeFileSync(path.join(root, "data", "title.md"), "# Title");
    fs.writeFileSync(path.join(root, "README.dist.md"), "# Dist README");
    return root;
}


test("pythonMissingMessage references the download URL", () => {
    const lines = pythonMissingMessage();
    assert.equal(lines.length, 2);
    assert.match(lines[0], /Python.*required.*not found/);
    assert.ok(lines.some((l) => l.includes(PYTHON_DOWNLOAD_URL)));
});


test("detectPython returns null when no candidate matches", () => {
    // Run detectPython under an empty PATH so spawnSync cannot find any python.
    const code = `
        process.env.PATH = "";
        const { detectPython } = require(${JSON.stringify(path.resolve(__dirname, "..", "bin", "build"))});
        process.stdout.write(JSON.stringify(detectPython()));
    `;
    const result = spawnSync(process.execPath, ["-e", code], {
        encoding: "utf8",
        env: { ...process.env, PATH: "" },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "null");
});


test("detectPython returns a usable shape on this machine", () => {
    const found = detectPython();
    if (found === null) {
        // Local CI machines may have python missing — covered by the dedicated null test.
        return;
    }
    assert.equal(typeof found.cmd, "string");
    assert.ok(found.cmd.length > 0);
    assert.match(found.version, /Python\s+\d+\.\d+/);
});


test("buildPyz produces a runnable .pyz from a fixture repo", (t) => {
    if (detectPython() === null) {
        t.skip("python interpreter not available");
        return;
    }
    const repoRoot = makeFixtureRepo();
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

    const outFile = buildPyz({ repoRoot, quiet: true });
    assert.ok(fs.existsSync(outFile), "pyz should exist");
    assert.equal(path.basename(outFile), "pvzf_console.pyz");

    // README.dist.md is copied into dist/README.md.
    assert.ok(fs.existsSync(path.join(repoRoot, "dist", "README.md")));

    // Run the produced archive — proves it's valid.
    const python = detectPython();
    const run = spawnSync(python.cmd, [outFile], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /ok/);
});


test("buildPyz works when README.dist.md and data/ are absent", (t) => {
    if (detectPython() === null) {
        t.skip("python interpreter not available");
        return;
    }
    const repoRoot = makeFixtureRepo();
    fs.rmSync(path.join(repoRoot, "data"), { recursive: true });
    fs.rmSync(path.join(repoRoot, "README.dist.md"));
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

    const outFile = buildPyz({ repoRoot, quiet: true });
    assert.ok(fs.existsSync(outFile));
    assert.ok(!fs.existsSync(path.join(repoRoot, "dist", "README.md")));
});


test("buildPyz throws PYTHON_NOT_FOUND when python is missing", (t) => {
    // Force PATH=empty inside a subprocess so the in-test detectPython fails.
    const repoRoot = makeFixtureRepo();
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

    const code = `
        process.env.PATH = "";
        const { buildPyz } = require(${JSON.stringify(path.resolve(__dirname, "..", "bin", "build"))});
        try {
            buildPyz({ repoRoot: ${JSON.stringify(repoRoot)}, quiet: true });
            process.stdout.write("NO_THROW");
        } catch (e) {
            process.stdout.write(e.code || "");
            process.stdout.write("|");
            process.stdout.write(e.message);
        }
    `;
    const result = spawnSync(process.execPath, ["-e", code], {
        encoding: "utf8",
        env: { ...process.env, PATH: "" },
    });
    assert.equal(result.status, 0);
    const [code_, message] = result.stdout.split("|");
    assert.equal(code_, "PYTHON_NOT_FOUND");
    assert.match(message, /Python.*required.*not found/);
});


test("buildPyz throws when src directory is missing", () => {
    if (detectPython() === null) {
        return; // Skipped via the null-python tests above.
    }
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "pvzf-empty-"));
    try {
        assert.throws(
            () => buildPyz({ repoRoot: empty, quiet: true }),
            /source directory missing/,
        );
    } finally {
        fs.rmSync(empty, { recursive: true, force: true });
    }
});


function stageBuildScript(repoRoot) {
    /* build.js resolves repoRoot as `path.resolve(__dirname, "..")`. Stage it
     * under `<repoRoot>/bin/build.js` so the resolution lands on the fixture. */
    const binDir = path.join(repoRoot, "bin");
    fs.mkdirSync(binDir, { recursive: true });
    const stagedScript = path.join(binDir, "build.js");
    fs.copyFileSync(path.resolve(__dirname, "..", "bin", "build.js"), stagedScript);
    return stagedScript;
}


test("CLI entry prints the relative pyz path on success", (t) => {
    if (detectPython() === null) {
        t.skip("python interpreter not available");
        return;
    }
    const repoRoot = makeFixtureRepo();
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

    const stagedScript = stageBuildScript(repoRoot);
    const result = spawnSync(process.execPath, [stagedScript], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /built:.*pvzf_console\.pyz/);
    assert.match(result.stdout, /doc:.*README\.md/);
});


test("CLI entry exits with code 1 and prints error message on failure", (t) => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "pvzf-cli-empty-"));
    t.after(() => fs.rmSync(empty, { recursive: true, force: true }));

    const stagedScript = stageBuildScript(empty);
    const result = spawnSync(process.execPath, [stagedScript], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /build:/);
});


test("real bin/build.js runs successfully against the actual repo", (t) => {
    /* Drives the CLI entry block of the real ./bin/build.js so c8 records its
     * coverage. The output goes to ./dist/ which is gitignored. */
    if (detectPython() === null) {
        t.skip("python interpreter not available");
        return;
    }
    const repoRoot = path.resolve(__dirname, "..");
    const realScript = path.join(repoRoot, "bin", "build.js");
    const result = spawnSync(process.execPath, [realScript], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /built:.*pvzf_console\.pyz/);
});


test("real bin/build.js prints 'build:' and exits 1 when python is missing", () => {
    /* Hits the catch block of the CLI entry on the real script. */
    const repoRoot = path.resolve(__dirname, "..");
    const realScript = path.join(repoRoot, "bin", "build.js");
    const result = spawnSync(process.execPath, [realScript], {
        encoding: "utf8",
        env: { ...process.env, PATH: "" },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /build:.*Python.*required/);
});
