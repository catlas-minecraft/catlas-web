import { describe, expect, test } from "vite-plus/test";
import { Graph } from "../src/lib/graph";
import { deleteEntity, insertNodeIntoWay } from "../src/lib/editor/actions";
import { validateGraph } from "../src/lib/editor/validation";
import { area, line, node } from "./helpers";

describe("editor actions", () => {
  test("deleting an area vertex preserves a valid closed ring", () => {
    const graph = new Graph([node(1), node(2), node(3), node(4), area(10, [1, 2, 3, 4, 1])]);
    const next = deleteEntity({ type: "node", id: 2 })(graph);

    expect(next.node(2)).toBeUndefined();
    expect(next.way(10)?.nodeIds).toEqual([1, 3, 4, 1]);
    expect(validateGraph(next).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  test("deleting a vertex removes ways that become too short", () => {
    const graph = new Graph([node(1), node(2), line(10, [1, 2])]);
    const next = deleteEntity({ type: "node", id: 2 })(graph);
    expect(next.way(10)).toBeUndefined();
  });

  test("inserting a midpoint creates the node and updates the way", () => {
    const graph = new Graph([node(1), node(2), line(10, [1, 2])]);
    const next = insertNodeIntoWay(10, 1, node(-1, 1.5, 1.5))(graph);
    expect(next.node(-1)).toBeDefined();
    expect(next.way(10)?.nodeIds).toEqual([1, -1, 2]);
  });

  test("deleting a local way removes its untagged local vertices", () => {
    const graph = new Graph([
      { ...node(-1), featureType: "route:vertex" },
      { ...node(-2), featureType: "route:vertex" },
      line(-1, [-1, -2]),
    ]);
    const next = deleteEntity({ type: "way", id: -1 })(graph);

    expect(next.way(-1)).toBeUndefined();
    expect(next.node(-1)).toBeUndefined();
    expect(next.node(-2)).toBeUndefined();
  });
});

describe("validation", () => {
  test("blocks open areas, missing nodes, and reserved tags", () => {
    const graph = new Graph([{ ...node(1), tags: { version: "bad" } }, area(10, [1, 2, 3])]);
    const messages = validateGraph(graph).map((issue) => issue.message);

    expect(messages).toContain("Tag 'version' is reserved.");
    expect(messages).toContain("An area must be closed.");
    expect(messages).toContain("Referenced node 2 is missing.");
  });
});
