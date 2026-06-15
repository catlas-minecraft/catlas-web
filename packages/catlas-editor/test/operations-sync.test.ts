import { Cause, Effect, Exit, Option } from "effect";
import { describe, expect, test } from "vite-plus/test";
import { Graph } from "../src/lib/graph";
import {
  EditorApiError,
  type EditorApiService,
  toEditorApiError,
} from "../src/lib/editor/api-client";
import { getOperation } from "../src/lib/editor/operations";
import { loadViewportEntities, saveGraph } from "../src/lib/editor/sync";
import { line, node } from "./helpers";

const emptyViewport = {
  nodes: [],
  ways: [],
  wayNodes: [],
  relations: [],
  relationMembers: [],
};

const unusedAuth = {
  createSession: () => Effect.die("not used"),
  verifySession: () => Effect.die("not used"),
  revokeSession: () => Effect.die("not used"),
};

describe("operations", () => {
  test("reports availability and a disabled reason separately", () => {
    const graph = new Graph([node(1)]);
    const disabled = getOperation("delete", graph, null);
    const enabled = getOperation("delete", graph, { type: "node", id: 1 });

    expect(disabled.available).toBe(false);
    expect(disabled.disabledReason).toBe("Select a feature to delete it.");
    expect(enabled.available).toBe(true);
    expect(enabled.disabledReason).toBeNull();
    expect(enabled.action?.(graph).node(1)).toBeUndefined();
  });
});

describe("API synchronization", () => {
  test("loads viewport entities through the service boundary", async () => {
    const api: EditorApiService = {
      ...unusedAuth,
      loadViewport: () =>
        Effect.succeed({
          ...emptyViewport,
          nodes: [
            {
              id: 7,
              geom: { x: 1, y: 2, z: 3 },
              featureType: "landmark",
              tags: {},
              version: 4,
              createdAt: 1,
              updatedAt: 1,
              createdBy: "test",
              updatedBy: "test",
              deletedAt: null,
              changesetId: 1,
            },
          ],
        }),
      save: () => Effect.die("not used"),
    };

    const viewport = await Effect.runPromise(loadViewportEntities(api, [0, 0, 10, 10]));
    expect(viewport.entities).toHaveLength(1);
    expect(viewport.entities[0]?.id).toBe(7);
  });

  test("uploads a graph and applies returned ids and versions", async () => {
    let uploadedNodeId: number | undefined;
    const api: EditorApiService = {
      ...unusedAuth,
      loadViewport: () => Effect.succeed(emptyViewport),
      save: (payload) => {
        uploadedNodeId = payload.create.nodes[0]?.id;
        return Effect.succeed({
          nodes: [{ oldId: -1, newId: 101, newVersion: 1 }],
          ways: [{ oldId: -1, newId: 201, newVersion: 1 }],
          relations: [],
        });
      },
    };
    const base = new Graph();
    const current = new Graph([node(-1), line(-1, [-1, -1])]);

    const saved = await Effect.runPromise(saveGraph(api, base, current, "test"));
    expect(uploadedNodeId).toBe(-1);
    expect(saved.graph.node(101)?.version).toBe(1);
    expect(saved.graph.way(201)?.nodeIds).toEqual([101, 101]);
  });

  test("preserves typed conflict failures for the editor", async () => {
    const conflict = new EditorApiError("Version conflict", true, false, null);
    const api: EditorApiService = {
      ...unusedAuth,
      loadViewport: () => Effect.succeed(emptyViewport),
      save: () => Effect.fail(conflict),
    };

    const exit = await Effect.runPromiseExit(
      saveGraph(api, new Graph(), new Graph([node(-1)]), null),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = Cause.failureOption(exit.cause);
      expect(Option.isSome(failure)).toBe(true);
      if (Option.isSome(failure)) expect(failure.value).toBe(conflict);
    }
  });

  test("classifies unauthorized API failures", () => {
    const error = toEditorApiError({ _tag: "UnauthorizedError", message: "Session expired" });

    expect(error.unauthorized).toBe(true);
    expect(error.conflict).toBe(false);
    expect(error.message).toBe("Session expired");
  });
});
