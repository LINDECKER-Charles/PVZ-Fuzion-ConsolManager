import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** `settings-storage.ts` reads `REPO_ROOT` from `../src/config`; pin it. */
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

import { AppSettings } from "../src/settings";
import {
  SETTINGS_ENV_VAR,
  legacySettingsPath,
  loadSettings,
  saveSettings,
  settingsPath,
  userConfigDir,
} from "../src/settings-storage";

let tempBase: string;
let settingsFile: string;

beforeEach(() => {
  tempBase = mkdtempSync(path.join(tmpdir(), "pvzf-storage-"));
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

function isFile(target: string): boolean {
  try {
    return statSync(target).isFile();
  } catch {
    return false;
  }
}

describe("load/save", () => {
  it("returns defaults when file missing", () => {
    const settings = loadSettings();
    expect(settings).toBeInstanceOf(AppSettings);
    expect(settings.sourceLocale).toBe("English");
    expect(settings.projectRoot).toBeNull();
  });

  it("save then load round-trips", () => {
    saveSettings(new AppSettings({ sourceLocale: "French", color: "cyan", showEmoji: false }));
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
      "docs_lead_name",
      "docs_lead_aliases",
      "docs_output",
    ]);
    expect(onDisk.accent_color).toBe("red");
    expect(onDisk.trello_label).toBe("X");
  });

  it("round-trips the documentation lead", () => {
    saveSettings(
      new AppSettings({ docsLeadName: "Ada Lovelace", docsLeadAliases: ["@ada", "ada-l"] }),
    );
    expect(loadSettings().leadIdentity()).toEqual({
      name: "Ada Lovelace",
      aliases: ["@ada", "ada-l"],
    });
  });

  it("drops non-string aliases from a hand-edited file", () => {
    writeFileSync(settingsFile, JSON.stringify({ docs_lead_aliases: ["@ada", 42, "  ", null] }), {
      encoding: "utf-8",
    });
    expect(loadSettings().docsLeadAliases).toEqual(["@ada"]);
  });

  it("falls back to the default aliases when the field is not a list", () => {
    writeFileSync(settingsFile, JSON.stringify({ docs_lead_aliases: "@ada" }), {
      encoding: "utf-8",
    });
    expect(loadSettings().docsLeadAliases).toEqual(["@LINDECKER-Charles", "LINDECKER-Charles"]);
  });

  it("ignores unknown keys", () => {
    writeFileSync(settingsFile, JSON.stringify({ source_locale: "German", bogus: "ignored" }), {
      encoding: "utf-8",
    });
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
      const error = saveSettings(new AppSettings());
      // Windows ignores POSIX modes, so the write legitimately succeeds there.
      if (process.platform === "win32") {
        expect(error).toBeNull();
      } else {
        expect(error).toContain("settings.json");
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
