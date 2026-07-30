import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
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

import {
  AppSettings,
  SETTINGS_ENV_VAR,
  legacySettingsPath,
  loadSettings,
  saveSettings,
  settingsPath,
  userConfigDir,
} from "../src/settings";
import { createTempProject, type TempProject } from "./helpers";

let tempBase: string;
let settingsFile: string;

beforeEach(() => {
  tempBase = mkdtempSync(path.join(tmpdir(), "pvzf-settings-"));
  mockConfigState.repoRoot = tempBase;
  mockConfigState.projectRoot = path.join(tempBase, "default-project");
  settingsFile = path.join(tempBase, "settings.json");
  // Pin the settings file so tests never touch the real per-user config dir.
  vi.stubEnv(SETTINGS_ENV_VAR, settingsFile);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tempBase, { recursive: true, force: true });
});

/** Swap `process.platform`, which is read-only but configurable. */
function withPlatform(value: string, fn: () => void): void {
  const original = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { value, configurable: true });
  try {
    fn();
  } finally {
    if (original) Object.defineProperty(process, "platform", original);
  }
}

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

  it(`${SETTINGS_ENV_VAR} pins the settings file`, () => {
    expect(settingsPath()).toBe(settingsFile);
  });

  it("expands ~ in the env override", () => {
    vi.stubEnv("HOME", tempBase);
    vi.stubEnv("USERPROFILE", tempBase);
    vi.stubEnv(SETTINGS_ENV_VAR, path.join("~", "pinned.json"));
    expect(settingsPath()).toBe(path.join(tempBase, "pinned.json"));
  });

  it("save reports the reason instead of throwing", () => {
    const locked = path.join(tempBase, "locked");
    mkdirSync(locked, { recursive: true });
    vi.stubEnv(SETTINGS_ENV_VAR, path.join(locked, "sub", "settings.json"));
    chmodSync(locked, 0o500); // no write bit -> mkdir of `sub/` fails
    try {
      const err = saveSettings(new AppSettings());
      // Windows ignores POSIX modes, so the write legitimately succeeds there.
      if (process.platform === "win32") {
        expect(err).toBeNull();
      } else {
        expect(err).toContain("settings.json");
      }
    } finally {
      chmodSync(locked, 0o700);
    }
  });
});

describe("per-user config dir", () => {
  beforeEach(() => {
    vi.stubEnv("HOME", path.join(tempBase, "home"));
    vi.stubEnv("USERPROFILE", path.join(tempBase, "home"));
    vi.stubEnv("XDG_CONFIG_HOME", undefined);
    vi.stubEnv("APPDATA", undefined);
    vi.stubEnv("LOCALAPPDATA", undefined);
  });

  it("uses Application Support on macOS", () => {
    withPlatform("darwin", () => {
      expect(userConfigDir()).toBe(
        path.join(tempBase, "home", "Library", "Application Support", "pvzf-console"),
      );
    });
  });

  it("uses ~/.config elsewhere on POSIX", () => {
    withPlatform("linux", () => {
      expect(userConfigDir()).toBe(path.join(tempBase, "home", ".config", "pvzf-console"));
    });
  });

  it("honours an absolute XDG_CONFIG_HOME, ignores a relative one", () => {
    withPlatform("linux", () => {
      vi.stubEnv("XDG_CONFIG_HOME", path.join(tempBase, "xdg"));
      expect(userConfigDir()).toBe(path.join(tempBase, "xdg", "pvzf-console"));
      vi.stubEnv("XDG_CONFIG_HOME", "relative/path");
      expect(userConfigDir()).toBe(path.join(tempBase, "home", ".config", "pvzf-console"));
    });
  });

  it("uses APPDATA on Windows, falling back to AppData\\Roaming", () => {
    withPlatform("win32", () => {
      vi.stubEnv("APPDATA", path.join(tempBase, "roaming"));
      expect(userConfigDir()).toBe(path.join(tempBase, "roaming", "pvzf-console"));
      vi.stubEnv("APPDATA", undefined);
      expect(userConfigDir()).toBe(
        path.join(tempBase, "home", "AppData", "Roaming", "pvzf-console"),
      );
    });
  });

  it("settingsPath defaults to the config dir when no override is set", () => {
    withPlatform("darwin", () => {
      vi.stubEnv(SETTINGS_ENV_VAR, undefined);
      expect(settingsPath()).toBe(path.join(userConfigDir() as string, "settings.json"));
    });
  });
});

describe("legacy in-package settings", () => {
  const legacyPayload = JSON.stringify({ source_locale: "German", accent_color: "red" });
  let userFile: string;

  beforeEach(() => {
    userFile = path.join(tempBase, "cfg", "settings.json");
    vi.stubEnv(SETTINGS_ENV_VAR, userFile);
  });

  it("legacySettingsPath stays inside the package", () => {
    expect(legacySettingsPath()).toBe(path.join(tempBase, "settings.json"));
  });

  it("reads the legacy file when no per-user file exists", () => {
    writeFileSync(settingsFile, legacyPayload, { encoding: "utf-8" });
    const loaded = loadSettings();
    expect(loaded.sourceLocale).toBe("German");
    expect(loaded.accentColor).toBe("red");
  });

  it("saving migrates to the new path and leaves the legacy file untouched", () => {
    writeFileSync(settingsFile, legacyPayload, { encoding: "utf-8" });
    const migrated = loadSettings();
    migrated.sourceLocale = "French";
    expect(saveSettings(migrated)).toBeNull();
    expect(isFile(userFile)).toBe(true);
    // Older versions keep reading their own copy, unchanged.
    expect(readFileSync(settingsFile, { encoding: "utf-8" })).toBe(legacyPayload);
    expect(loadSettings().sourceLocale).toBe("French");
  });

  it("the per-user file wins when both exist", () => {
    writeFileSync(settingsFile, legacyPayload, { encoding: "utf-8" });
    mkdirSync(path.dirname(userFile), { recursive: true });
    writeFileSync(userFile, JSON.stringify({ source_locale: "Spanish" }), { encoding: "utf-8" });
    expect(loadSettings().sourceLocale).toBe("Spanish");
  });

  it("falls back to defaults when the legacy file is corrupt", () => {
    writeFileSync(settingsFile, "not json", { encoding: "utf-8" });
    expect(loadSettings().sourceLocale).toBe("English");
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
