import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `settings.ts` reads `REPO_ROOT` / `PROJECT_ROOT` from `../src/config`.
 * Python isolated tests via `monkeypatch.setattr(config, ...)`; the ESM
 * equivalent is mocking the module with mutable holders the tests drive.
 */
const mockConfigState: { repoRoot: string; projectRoot: string } = {
  repoRoot: "",
  projectRoot: "",
};

vi.mock("../src/config", () => ({
  get REPO_ROOT() {
    return mockConfigState.repoRoot;
  },
  get PROJECT_ROOT() {
    return mockConfigState.projectRoot;
  },
  PROJECT_DIR_NAME: "PvZ_Fusion_Translator",
  SOURCE_LOCALE: "English",
}));

import { AppSettings, loadSettings, saveSettings, settingsPath } from "../src/settings";
import { createTempProject, type TempProject } from "./helpers";

let tempBase: string;
let settingsFile: string;

beforeEach(() => {
  tempBase = mkdtempSync(path.join(tmpdir(), "pvzf-settings-"));
  mockConfigState.repoRoot = tempBase;
  mockConfigState.projectRoot = path.join(tempBase, "default-project");
  settingsFile = path.join(tempBase, "settings.json");
});

afterEach(() => {
  rmSync(tempBase, { recursive: true, force: true });
});

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

describe("load/save", () => {
  it("returns defaults when file missing", () => {
    const s = loadSettings();
    expect(s).toBeInstanceOf(AppSettings);
    expect(s.sourceLocale).toBe("English");
    expect(s.projectRoot).toBeNull();
  });

  it("save then load round-trips", () => {
    const s = new AppSettings({ sourceLocale: "French", color: "cyan", showEmoji: false });
    saveSettings(s);
    expect(isFile(settingsFile)).toBe(true);
    const loaded = loadSettings();
    expect(loaded.sourceLocale).toBe("French");
    expect(loaded.color).toBe("cyan");
    expect(loaded.showEmoji).toBe(false);
  });

  it("persists snake_case keys on disk", () => {
    saveSettings(new AppSettings({ accentColor: "red", trelloLabel: "X" }));
    const onDisk = JSON.parse(readFileSync(settingsFile, { encoding: "utf-8" }));
    expect(Object.keys(onDisk)).toEqual([
      "project_root",
      "source_locale",
      "color",
      "accent_color",
      "density",
      "show_emoji",
      "show_banner",
      "trello_label",
    ]);
    expect(onDisk.accent_color).toBe("red");
    expect(onDisk.trello_label).toBe("X");
  });

  it("ignores unknown keys", () => {
    writeFileSync(
      settingsFile,
      JSON.stringify({ source_locale: "German", bogus_field: "ignored" }),
      { encoding: "utf-8" },
    );
    expect(loadSettings().sourceLocale).toBe("German");
  });

  it("returns defaults on invalid json", () => {
    writeFileSync(settingsFile, "not json", { encoding: "utf-8" });
    expect(loadSettings().sourceLocale).toBe("English");
  });

  it("settingsPath sits under REPO_ROOT", () => {
    expect(settingsPath()).toBe(settingsFile);
  });
});

describe("project root resolution", () => {
  it("uses explicit value", () => {
    const custom = path.join(tempBase, "custom");
    mkdirSync(custom, { recursive: true });
    const s = new AppSettings({ projectRoot: custom });
    expect(s.resolvedProjectRoot()).toBe(path.resolve(custom));
  });

  it("falls back to default when unset", () => {
    mockConfigState.projectRoot = path.join(tempBase, "default");
    const s = new AppSettings({ projectRoot: null });
    expect(s.resolvedProjectRoot()).toBe(path.join(tempBase, "default"));
  });
});

describe("validateProjectRoot", () => {
  it("flags missing Localization", () => {
    const s = new AppSettings({ projectRoot: tempBase }); // exists, but no Localization/
    const err = s.validateProjectRoot();
    expect(err).not.toBeNull();
    expect(err).toContain("Localization");
  });

  it("flags nonexistent path", () => {
    const s = new AppSettings({ projectRoot: path.join(tempBase, "does-not-exist") });
    const err = s.validateProjectRoot();
    expect(err).not.toBeNull();
    expect(err).toContain("does not exist");
  });

  it("passes when complete", () => {
    let project: TempProject | undefined;
    try {
      project = createTempProject();
      const s = new AppSettings({ projectRoot: project.root });
      expect(s.validateProjectRoot()).toBeNull();
    } finally {
      project?.cleanup();
    }
  });
});

describe("validateSourceLocale", () => {
  it("locale mode", () => {
    let project: TempProject | undefined;
    try {
      project = createTempProject();
      project.makeLocale("French");
      const s = new AppSettings({ projectRoot: project.root, sourceLocale: "French" });
      expect(s.validateSourceLocale()).toBeNull();
      s.sourceLocale = "Klingon";
      const err = s.validateSourceLocale();
      expect(err).not.toBeNull();
      expect(err).toContain("Klingon");
    } finally {
      project?.cleanup();
    }
  });

  it("dumps mode", () => {
    let project: TempProject | undefined;
    try {
      project = createTempProject();
      const s = new AppSettings({ projectRoot: project.root, sourceLocale: "Dumps" });
      expect(s.usesDumpsSource()).toBe(true);
      expect(s.validateSourceLocale()).toBeNull();
    } finally {
      project?.cleanup();
    }
  });

  it("dumps mode without Dumps folder", () => {
    mkdirSync(path.join(tempBase, "Localization"), { recursive: true });
    const s = new AppSettings({ projectRoot: tempBase, sourceLocale: "Dumps" });
    const err = s.validateSourceLocale();
    expect(err).not.toBeNull();
    expect(err).toContain("Dumps");
  });
});
