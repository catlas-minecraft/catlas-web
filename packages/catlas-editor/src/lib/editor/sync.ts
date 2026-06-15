import { Effect } from "effect";
import type { Graph } from "../graph";
import type { EditorApiService } from "./api-client";
import { diffResultToRemaps, toChangesetUpload } from "./changeset";
import { viewportToEntities } from "./types";

export const loadViewportEntities = (
  api: EditorApiService,
  bbox: readonly [number, number, number, number],
) => api.loadViewport(bbox).pipe(Effect.map(viewportToEntities));

export const saveGraph = (
  api: EditorApiService,
  base: Graph,
  current: Graph,
  comment: string | null,
) =>
  api.save(toChangesetUpload(base, current), comment).pipe(
    Effect.map((result) => {
      const remaps = diffResultToRemaps(result);
      return {
        graph: current.remapIds(remaps),
        remaps,
      };
    }),
  );
