import { describe, expect, test } from "vite-plus/test";
import { visibleNodesForSelection } from "../src/lib/editor/renderer";
import { Graph } from "../src/lib/graph";
import { area, line, node } from "./helpers";

const visibleIds = (
  graph: Graph,
  selection: Parameters<typeof visibleNodesForSelection>[1],
  options?: Parameters<typeof visibleNodesForSelection>[2],
) => visibleNodesForSelection(graph, selection, options).map((entity) => entity.id);

describe("renderer node visibility", () => {
  const graph = new Graph([
    node(1),
    node(2),
    node(3),
    node(4),
    node(5),
    node(9),
    line(10, [1, 2]),
    line(11, [1, 3]),
    area(20, [3, 4, 5, 3]),
  ]);

  test("hides way vertices until their way is selected", () => {
    expect(visibleIds(graph, null)).toEqual([9]);
    expect(visibleIds(graph, { type: "way", id: 10 })).toEqual([1, 2, 9]);
    expect(visibleIds(graph, { type: "way", id: 20 })).toEqual([3, 4, 5, 9]);
  });

  test("keeps parent way vertices visible when a vertex is selected", () => {
    expect(visibleIds(graph, { type: "node", id: 1 })).toEqual([1, 2, 3, 9]);
    expect(visibleIds(graph, { type: "node", id: 4 })).toEqual([3, 4, 5, 9]);
  });

  test("keeps standalone point nodes visible", () => {
    expect(visibleIds(graph, { type: "node", id: 9 })).toEqual([9]);
  });

  test("shows line vertices while drawing a line", () => {
    expect(visibleIds(graph, null, { showLineVertices: true })).toEqual([1, 2, 3, 9]);
  });
});
