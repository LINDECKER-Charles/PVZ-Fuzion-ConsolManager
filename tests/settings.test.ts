import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `settings.ts` reads `PROJECT_ROOT` from `../src/config`. Python isolated
 * tests via `monkeypatch.setattr(config, ...)`; the ESM equivalent is mocking
 * the module with mutable holders the tests drive.
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

import { AppSettings, expandUser } from "../src/settings";
import { createTempProject, type TempProject } from "./helpers";

let tempBase: string;

beforeEach(() => {
  tempBase = mkdtempSync(path.join(tmpdir(), "pvzf-settings-"));
  mockConfigState.repoRoot = tempBase;
  mockConfigState.projectRoot = path.join(tempBase, "default-project");
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tempBase, { recursive: true, force: true });
});

describe("defaults", () => {
  it("applies the documented fallbacks", () => {
    const settings = new AppSettings();
    expect(settings.projectRoot).toBeNull();
    expect(settings.sourceLocale).toBe("English");
    expect(settings.trelloLabel).toBe("To be translated");
    expect(settings.docsOutput).toBe("contribution-summary.md");
  });

  it("ignores fields explicitly set to undefined", () => {
    const settings = new AppSettings({ sourceLocale: undefined, color: "red" });
    expect(settings.sourceLocale).toBe("English");
    expect(settings.color).toBe("red");
  });

  it("copies the alias list instead of aliasing the caller's array", () => {
    const aliases = ["@ada"];
    const settings = new AppSettings({ docsLeadAliases: aliases });
    aliases.push("mutated");
    expect(settings.docsLeadAliases).toEqual(["@ada"]);
  });

  it("exposes the lead identity consumed by the docs tools", () => {
    const settings = new AppSettings({ docsLeadName: "Ada", docsLeadAliases: ["@ada"] });
    expect(settings.leadIdentity()).toEqual({ name: "Ada", aliases: ["@ada"] });
  });
});

describe("expandUser", () => {
  it("expands a leading ~ and leaves everything else alone", () => {
    vi.stubEnv("HOME", tempBase);
    vi.stubEnv("USERPROFILE", tempBase);
    expect(expandUser(path.join("~", "pinned.json"))).toBe(path.join(tempBase, "pinned.json"));
    expect(expandUser("plain/path.json")).toBe("plain/path.json");
  });
});

describe("project root resolution", () => {
  it("uses explicit value", () => {
    const custom = path.join(tempBase, "custom");
    mkdirSync(custom, { recursive: true });
    expect(new AppSettings({ projectRoot: custom }).resolvedProjectRoot()).toBe(
      path.resolve(custom),
    );
  });

  it("falls back to default when unset", () => {
    mockConfigState.projectRoot = path.join(tempBase, "default");
    expect(new AppSettings({ projectRoot: null }).resolvedProjectRoot()).toBe(
      path.join(tempBase, "default"),
    );
  });
});

describe("validateProjectRoot", () => {
  it("flags missing Localization", () => {
    const error = new AppSettings({ projectRoot: tempBase }).validateProjectRoot();
    expect(error).toContain("Localization");
  });

  it("flags nonexistent path", () => {
    const settings = new AppSettings({ projectRoot: path.join(tempBase, "does-not-exist") });
    expect(settings.validateProjectRoot()).toContain("does not exist");
  });

  it("passes when complete", () => {
    let project: TempProject | undefined;
    try {
      project = createTempProject();
      expect(new AppSettings({ projectRoot: project.root }).validateProjectRoot()).toBeNull();
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
      const settings = new AppSettings({ projectRoot: project.root, sourceLocale: "French" });
      expect(settings.validateSourceLocale()).toBeNull();
      settings.sourceLocale = "Klingon";
      expect(settings.validateSourceLocale()).toContain("Klingon");
    } finally {
      project?.cleanup();
    }
  });

  it("dumps mode", () => {
    let project: TempProject | undefined;
    try {
      project = createTempProject();
      const settings = new AppSettings({ projectRoot: project.root, sourceLocale: "Dumps" });
      expect(settings.usesDumpsSource()).toBe(true);
      expect(settings.validateSourceLocale()).toBeNull();
    } finally {
      project?.cleanup();
    }
  });

  it("dumps mode without Dumps folder", () => {
    mkdirSync(path.join(tempBase, "Localization"), { recursive: true });
    const settings = new AppSettings({ projectRoot: tempBase, sourceLocale: "Dumps" });
    expect(settings.validateSourceLocale()).toContain("Dumps");
  });
});
