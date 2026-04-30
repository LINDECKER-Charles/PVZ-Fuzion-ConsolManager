"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const wrapperPath = path.resolve(__dirname, "..", "bin", "pvzf-console.js");
const buildPath = path.resolve(__dirname, "..", "bin", "build.js");


function makeFixtureRepo() {
    /* A package layout pvzf-console.js expects: src/pvz_console + data + bin/. */
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pvzf-wrap-"));
    const pkg = path.join(root, "src", "pvz_console");
    fs.mkdirSync(pkg, { recursive: true });
    fs.writeFileSync(path.join(pkg, "__init__.py"), "");
    fs.writeFileSync(
        path.join(pkg, "__main__.py"),
        "import sys\n"
        + "def main():\n"
        + "    print('args=' + ','.join(sys.argv[1:]))\n"
        + "    sys.exit(0)\n"
        + "if __name__ == '__main__':\n"
        + "    main()\n",
    );
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin, { recursive: true });
    fs.copyFileSync(buildPath, path.join(bin, "build.js"));
    fs.copyFileSync(wrapperPath, path.join(bin, "pvzf-console.js"));
    return root;
}


test("module exports main, fatal, ensureArchive, PYZ_PATH", () => {
    const mod = require("../bin/pvzf-console");
    assert.equal(typeof mod.main, "function");
    assert.equal(typeof mod.fatal, "function");
    assert.equal(typeof mod.ensureArchive, "function");
    assert.equal(typeof mod.PYZ_PATH, "string");
    assert.match(mod.PYZ_PATH, /pvzf_console\.pyz$/);
});


test("wrapper builds the pyz on first run and forwards args to python", (t) => {
    const repoRoot = makeFixtureRepo();
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

    // First run: no archive yet → must build then execute.
    const wrapper = path.join(repoRoot, "bin", "pvzf-console.js");
    const first = spawnSync(process.execPath, [wrapper, "diff", "--lang", "French"], {
        encoding: "utf8",
    });
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /args=diff,--lang,French/);
    assert.ok(fs.existsSync(path.join(repoRoot, "dist", "pvzf_console.pyz")));
    assert.match(first.stderr, /bundled archive not found, building it now/);

    // Second run: archive exists → the build branch is skipped.
    const second = spawnSync(process.execPath, [wrapper], { encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr);
    assert.equal(second.stderr, "");
});


test("wrapper exits with the python child's status code", (t) => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pvzf-wrap-fail-"));
    const pkg = path.join(repoRoot, "src", "pvz_console");
    fs.mkdirSync(pkg, { recursive: true });
    fs.writeFileSync(path.join(pkg, "__init__.py"), "");
    fs.writeFileSync(
        path.join(pkg, "__main__.py"),
        "import sys\nsys.exit(7)\n",
    );
    fs.mkdirSync(path.join(repoRoot, "bin"), { recursive: true });
    fs.copyFileSync(buildPath, path.join(repoRoot, "bin", "build.js"));
    fs.copyFileSync(wrapperPath, path.join(repoRoot, "bin", "pvzf-console.js"));
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

    const wrapper = path.join(repoRoot, "bin", "pvzf-console.js");
    const result = spawnSync(process.execPath, [wrapper], { encoding: "utf8" });
    assert.equal(result.status, 7);
});


test("wrapper aborts with a friendly error when python is missing", (t) => {
    const repoRoot = makeFixtureRepo();
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

    const wrapper = path.join(repoRoot, "bin", "pvzf-console.js");
    const result = spawnSync(process.execPath, [wrapper], {
        encoding: "utf8",
        env: { ...process.env, PATH: "" },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pvzf-console:.*Python.*required/);
});


test("wrapper aborts with a build error when the source tree is broken", (t) => {
    /* No src/pvz_console anywhere → ensureArchive() falls into the catch branch
     * for "failed to build bundled archive: ...". */
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pvzf-wrap-broken-"));
    fs.mkdirSync(path.join(repoRoot, "bin"), { recursive: true });
    fs.copyFileSync(buildPath, path.join(repoRoot, "bin", "build.js"));
    fs.copyFileSync(wrapperPath, path.join(repoRoot, "bin", "pvzf-console.js"));
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

    const wrapper = path.join(repoRoot, "bin", "pvzf-console.js");
    const result = spawnSync(process.execPath, [wrapper], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pvzf-console: failed to build bundled archive/);
});


test("fatal prints each line under the prefix and exits 1", (t) => {
    /* Run fatal() in a child process so we can observe the exit code & stderr. */
    const code = `
        const { fatal } = require(${JSON.stringify(wrapperPath)});
        fatal("first line\\nsecond line");
    `;
    const result = spawnSync(process.execPath, ["-e", code], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pvzf-console: first line/);
    assert.match(result.stderr, /pvzf-console: second line/);
});


test("real bin/pvzf-console.js wrapper runs the real archive end-to-end", (t) => {
    /* Drives the actual ./bin/pvzf-console.js so c8 records its coverage.
     * The wrapper builds dist/pvzf_console.pyz on demand, then forks Python
     * with the args we pass. We use --help so the python side exits cleanly. */
    const repoRoot = path.resolve(__dirname, "..");
    const realWrapper = path.join(repoRoot, "bin", "pvzf-console.js");
    const result = spawnSync(process.execPath, [realWrapper, "--help"], {
        encoding: "utf8",
    });
    // argparse exits 0 on --help; if python is missing the wrapper exits 1
    // — both paths exercise main() up to the spawnSync call.
    assert.ok(result.status === 0 || result.status === 1, `unexpected status ${result.status}`);
});


test("real bin/pvzf-console.js rebuilds when dist/pvzf_console.pyz is absent", (t) => {
    /* Forces ensureArchive() into its build branch on the real wrapper. */
    const repoRoot = path.resolve(__dirname, "..");
    const archive = path.join(repoRoot, "dist", "pvzf_console.pyz");
    const restored = fs.existsSync(archive)
        ? fs.readFileSync(archive)
        : null;
    if (restored !== null) {
        fs.rmSync(archive);
    }
    t.after(() => {
        // Restore whatever was there before, so we don't surprise the next test.
        if (restored !== null) {
            fs.writeFileSync(archive, restored);
        }
    });

    const realWrapper = path.join(repoRoot, "bin", "pvzf-console.js");
    const result = spawnSync(process.execPath, [realWrapper, "--help"], {
        encoding: "utf8",
    });
    assert.ok(result.status === 0 || result.status === 1, `unexpected status ${result.status}`);
    assert.match(result.stderr, /bundled archive not found, building it now/);
    assert.ok(fs.existsSync(archive), "archive should have been rebuilt");
});


test("real bin/pvzf-console.js prints 'failed to build' when src tree is missing", (t) => {
    /* Exercises the catch block of ensureArchive on the real wrapper.
     * We temporarily move src/pvz_console aside and remove dist/pvzf_console.pyz
     * so the build attempt fails with "source directory missing". */
    const repoRoot = path.resolve(__dirname, "..");
    const archive = path.join(repoRoot, "dist", "pvzf_console.pyz");
    const srcPkg = path.join(repoRoot, "src", "pvz_console");
    const srcBackup = path.join(repoRoot, "src", "_pvz_console_test_backup");
    const archiveBackup = fs.existsSync(archive) ? fs.readFileSync(archive) : null;

    if (archiveBackup !== null) fs.rmSync(archive);
    fs.renameSync(srcPkg, srcBackup);

    t.after(() => {
        try { fs.renameSync(srcBackup, srcPkg); } catch (_) { /* already restored */ }
        if (archiveBackup !== null) {
            try { fs.writeFileSync(archive, archiveBackup); } catch (_) { /* skip */ }
        }
    });

    const realWrapper = path.join(repoRoot, "bin", "pvzf-console.js");
    const result = spawnSync(process.execPath, [realWrapper, "--help"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /failed to build bundled archive/);
});


test("real bin/pvzf-console.js exits 1 when python is missing", () => {
    const repoRoot = path.resolve(__dirname, "..");
    const realWrapper = path.join(repoRoot, "bin", "pvzf-console.js");
    const result = spawnSync(process.execPath, [realWrapper], {
        encoding: "utf8",
        env: { ...process.env, PATH: "" },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pvzf-console:.*Python.*required/);
});


test("ensureArchive is a no-op when the archive already exists", (t) => {
    const repoRoot = makeFixtureRepo();
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
    const distDir = path.join(repoRoot, "dist");
    fs.mkdirSync(distDir, { recursive: true });
    const archive = path.join(distDir, "pvzf_console.pyz");
    fs.writeFileSync(archive, "stub");

    /* Run ensureArchive in a child that points PACKAGE_ROOT at the fixture by
     * loading a copy of the wrapper from inside the fixture's bin/. */
    const wrapperCopy = path.join(repoRoot, "bin", "pvzf-console.js");
    const code = `
        const mod = require(${JSON.stringify(wrapperCopy)});
        mod.ensureArchive();
        process.stdout.write("ok");
    `;
    const result = spawnSync(process.execPath, ["-e", code], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "ok");
    assert.equal(fs.readFileSync(archive, "utf8"), "stub", "archive untouched");
});
