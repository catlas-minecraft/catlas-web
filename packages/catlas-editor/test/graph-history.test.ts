import { describe, expect, test } from "vite-plus/test";
import { Graph } from "../src/lib/graph";
import { moveNode } from "../src/lib/editor/actions";
import { History } from "../src/lib/editor/history";
import { line, node } from "./helpers";

describe("Graph", () => {
  test("keeps node and way id spaces separate and remains immutable", () => {
    const graph = new Graph([node(1), line(1, [1, 2]), node(2)]);
    const next = graph.replace({ ...node(1), geom: { x: 10, y: 0, z: 20 } });

    expect(graph.node(1)?.geom.x).toBe(1);
    expect(next.node(1)?.geom.x).toBe(10);
    expect(next.way(1)?.nodeIds).toEqual([1, 2]);
    expect(next.parentWays(2).map((way) => way.id)).toEqual([1]);
  });

  test("remaps local ids, references, and server versions", () => {
    const graph = new Graph([node(-1), node(5), line(-1, [-1, 5])]);
    const remapped = graph.remapIds(
      new Map([
        ["n-1", { id: 20, version: 1 }],
        ["n5", { id: 5, version: 2 }],
        ["w-1", { id: 30, version: 1 }],
      ]),
    );

    expect(remapped.node(20)?.version).toBe(1);
    expect(remapped.node(5)?.version).toBe(2);
    expect(remapped.way(30)?.nodeIds).toEqual([20, 5]);
  });
});

describe("History", () => {
  test("supports undo and redo without action-specific inverse logic", () => {
    const history = new History(new Graph([node(1)]));
    history.perform(moveNode(1, { x: 8, y: 0, z: 9 }), "Move node");

    expect(history.graph.node(1)?.geom).toEqual({ x: 8, y: 0, z: 9 });
    expect(history.undo()).toBe(true);
    expect(history.graph.node(1)?.geom.x).toBe(1);
    expect(history.redo()).toBe(true);
    expect(history.graph.node(1)?.geom.x).toBe(8);
  });

  test("rebases untouched entities while preserving local edits", () => {
    const history = new History(new Graph([node(1), node(2)]));
    history.perform(moveNode(1, { x: 99, y: 0, z: 99 }), "Move node");
    history.rebase([
      { ...node(1), version: 2, geom: { x: 10, y: 0, z: 10 } },
      { ...node(2), version: 2, geom: { x: 20, y: 0, z: 20 } },
    ]);

    expect(history.base.node(1)?.version).toBe(2);
    expect(history.graph.node(1)?.geom.x).toBe(99);
    expect(history.graph.node(1)?.version).toBe(1);
    expect(history.graph.node(2)?.geom.x).toBe(20);
    expect(history.graph.node(2)?.version).toBe(2);
  });
});
