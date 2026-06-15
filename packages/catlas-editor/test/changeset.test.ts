import { describe, expect, test } from "vite-plus/test";
import { Graph } from "../src/lib/graph";
import { difference, toChangesetUpload } from "../src/lib/editor/changeset";
import { area, line, node } from "./helpers";

describe("changeset serialization", () => {
  test("classifies creates, modifications, and deletes", () => {
    const base = new Graph([node(1, 1, 1, 3), node(2), line(5, [1, 2], 4), node(9)]);
    const current = new Graph([
      { ...node(1, 1, 1, 3), geom: { x: 4, y: 2, z: 8 } },
      node(2),
      line(5, [1, 2], 4),
      node(-1, 10, 10),
      area(-1, [-1, 2, 1, -1]),
    ]);
    const diff = difference(base, current);
    const payload = toChangesetUpload(base, current);

    expect(diff.created.map((entity) => `${entity.type}:${entity.id}`)).toEqual([
      "node:-1",
      "way:-1",
    ]);
    expect(diff.modified.map((entity) => `${entity.type}:${entity.id}`)).toEqual(["node:1"]);
    expect(diff.deleted.map((entity) => `${entity.type}:${entity.id}`)).toEqual(["node:9"]);
    expect(payload.modify.nodes[0]?.expectedVersion).toBe(3);
    expect(payload.create.ways[0]?.nodeRefs).toEqual([-1, 2, 1, -1]);
    expect(payload.delete.nodes).toEqual([{ id: 9, expectedVersion: 1 }]);
  });
});
