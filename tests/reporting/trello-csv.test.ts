import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { TrelloCard } from "../../src/core/models";
import {
  CSV_HEADER,
  buildTrelloCsv,
  buildTrelloReadme,
  writeTrelloCsvsByList,
} from "../../src/reporting/trello-csv";

const dirs: string[] = [];

function makeTmp(): string {
  const d = mkdtempSync(path.join(tmpdir(), "pvzf-csv-"));
  dirs.push(d);
  return d;
}

afterEach(() => {
  while (dirs.length > 0) {
    rmSync(dirs.pop()!, { recursive: true, force: true });
  }
});

function read(p: string): string {
  return readFileSync(p, { encoding: "utf-8" });
}

function card(partial: Partial<TrelloCard>): TrelloCard {
  return {
    name: partial.name ?? "",
    description: partial.description ?? "",
    listName: partial.listName ?? "Plants",
    labels: partial.labels ?? "To be translated",
  };
}

describe("CSV_HEADER", () => {
  it("matches the Python column order", () => {
    expect([...CSV_HEADER]).toEqual(["Name", "Description", "Labels", "List"]);
  });
});

describe("buildTrelloCsv", () => {
  it("quotes all fields and uses CRLF terminators", () => {
    const tmpPath = makeTmp();
    const out = path.join(tmpPath, "trello.csv");
    buildTrelloCsv(
      [card({ name: "Sunflower", description: "A flower", listName: "Plants", labels: "L" })],
      out,
    );
    const content = read(out);
    expect(content).toBe(
      '"Name","Description","Labels","List"\r\n' + '"Sunflower","A flower","L","Plants"\r\n',
    );
  });

  it("escapes embedded quotes, commas and newlines", () => {
    const tmpPath = makeTmp();
    const out = path.join(tmpPath, "trello.csv");
    buildTrelloCsv(
      [
        card({
          name: 'Say "hi"',
          description: "line1\nline2, still",
          listName: "Strings",
          labels: "To be translated",
        }),
      ],
      out,
    );
    const content = read(out);
    // Quotes are doubled; comma and newline stay inside the quoted field.
    expect(content).toBe(
      '"Name","Description","Labels","List"\r\n' +
        '"Say ""hi""","line1\nline2, still","To be translated","Strings"\r\n',
    );
  });

  it("creates parent directories", () => {
    const tmpPath = makeTmp();
    const out = path.join(tmpPath, "nested", "deep", "trello.csv");
    buildTrelloCsv([card({ name: "X" })], out);
    expect(existsSync(out)).toBe(true);
  });
});

describe("writeTrelloCsvsByList", () => {
  it("writes one CSV per list and sanitizes filenames", () => {
    const tmpPath = makeTmp();
    const paths = writeTrelloCsvsByList(
      [
        card({ name: "A", listName: "Plants" }),
        card({ name: "B", listName: "Plants" }),
        card({ name: "C", listName: "I, Zombie" }),
      ],
      tmpPath,
    );
    expect(Object.keys(paths).sort()).toEqual(["I, Zombie", "Plants"]);
    expect(path.basename(paths["Plants"]!)).toBe("trello_Plants.csv");
    // "I, Zombie" -> non-alnum runs collapse to "_", trailing "_" stripped.
    expect(path.basename(paths["I, Zombie"]!)).toBe("trello_I_Zombie.csv");
    // Plants file has header + 2 rows.
    expect(read(paths["Plants"]!).split("\r\n").filter(Boolean)).toHaveLength(3);
  });

  it("produces no file for empty input", () => {
    const tmpPath = makeTmp();
    const paths = writeTrelloCsvsByList([], tmpPath);
    expect(paths).toEqual({});
  });

  it("honours a custom filename prefix", () => {
    const tmpPath = makeTmp();
    const paths = writeTrelloCsvsByList([card({ listName: "Regex" })], tmpPath, "export_");
    expect(path.basename(paths["Regex"]!)).toBe("export_Regex.csv");
  });
});

describe("buildTrelloReadme", () => {
  it("renders the stats table and counts data rows", () => {
    const tmpPath = makeTmp();
    const paths = writeTrelloCsvsByList(
      [
        card({ name: "A", listName: "Plants" }),
        card({ name: "B", listName: "Plants" }),
        card({ name: "C", listName: "Zombies" }),
      ],
      tmpPath,
    );
    const out = path.join(tmpPath, "README.md");
    buildTrelloReadme("French", paths, "To be translated", out);
    const body = read(out);
    expect(body).toContain("# 🗂️ Trello Import — French Missing Translations");
    expect(body).toContain("`To be translated`");
    // 2 + 1 = 3 cards total.
    expect(body).toContain("**3**");
    expect(body).toContain("trello_Plants.csv");
    expect(body).toContain("trello_Zombies.csv");
    expect(body).toContain("   - `Plants`");
  });

  it("renders the empty-export fallback", () => {
    const tmpPath = makeTmp();
    const out = path.join(tmpPath, "README.md");
    buildTrelloReadme("French", {}, "To be translated", out);
    const body = read(out);
    expect(body).toContain("_Nothing to import — the target locale looks fully translated._");
    expect(body).toContain("trello_Plants.csv");
    expect(body).toContain("   _(no lists required — export is empty)_");
  });
});
