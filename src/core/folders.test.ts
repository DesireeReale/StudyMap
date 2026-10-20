import { describe, expect, it } from "vitest";
import { moveTargets, pathTo, reorder, subtreeIds, treeOptions } from "./folders";

const f = (id: string, parent_id: string | null, position = 0) => ({ id, parent_id, name: id, position });
const folders = [f("diritto", null, 1), f("analisi", null, 0), f("scritto", "diritto"), f("esercizi", "scritto"), f("orale", "diritto", 1)];

describe("folder tree", () => {
  it("collects a subtree", () => {
    expect(subtreeIds(folders, "diritto").sort()).toEqual(["diritto", "esercizi", "orale", "scritto"]);
  });

  it("builds the path from the subject", () => {
    expect(pathTo(folders, "esercizi").map((x) => x.id)).toEqual(["diritto", "scritto", "esercizi"]);
  });

  it("lists options depth first in position order", () => {
    expect(treeOptions(folders).map((o) => `${o.depth}:${o.id}`)).toEqual([
      "0:analisi",
      "0:diritto",
      "1:scritto",
      "2:esercizi",
      "1:orale",
    ]);
  });

  it("never offers a move into itself, its parent or past three levels", () => {
    expect(moveTargets(folders, "scritto").map((o) => o.id)).toEqual(["analisi"]);
    expect(moveTargets(folders, "orale").map((o) => o.id)).toEqual(["analisi", "scritto"]);
  });

  it("reorders and ignores moves out of range", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(reorder(items, "c", 0).map((i) => i.id)).toEqual(["c", "a", "b"]);
    expect(reorder(items, "a", 5)).toBe(items);
  });
});
