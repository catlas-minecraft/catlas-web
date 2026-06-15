import { entityEqual, Graph } from "../graph";
import type { EditorEntity } from "./types";
import { entityKey } from "./types";

export type GraphAction = (graph: Graph) => Graph;

type HistoryEntry = {
  readonly graph: Graph;
  readonly annotation: string;
};

export class History {
  #base: Graph;
  #entries: HistoryEntry[];
  #index = 0;

  constructor(graph = new Graph()) {
    this.#base = graph;
    this.#entries = [{ graph, annotation: "Initial state" }];
  }

  get graph() {
    return this.#entries[this.#index]!.graph;
  }

  get base() {
    return this.#base;
  }

  get canUndo() {
    return this.#index > 0;
  }

  get canRedo() {
    return this.#index < this.#entries.length - 1;
  }

  perform(action: GraphAction, annotation: string) {
    const nextGraph = action(this.graph);
    if (nextGraph === this.graph) return false;

    this.#entries = [...this.#entries.slice(0, this.#index + 1), { graph: nextGraph, annotation }];
    this.#index += 1;
    return true;
  }

  undo() {
    if (!this.canUndo) return false;
    this.#index -= 1;
    return true;
  }

  redo() {
    if (!this.canRedo) return false;
    this.#index += 1;
    return true;
  }

  reset(graph: Graph) {
    this.#base = graph;
    this.#entries = [{ graph, annotation: "Initial state" }];
    this.#index = 0;
  }

  rebase(incoming: readonly EditorEntity[]) {
    const previousBase = this.#base;
    this.#base = previousBase.replaceAll(incoming);
    this.#entries = this.#entries.map((entry) => {
      let nextGraph = entry.graph;

      for (const entity of incoming) {
        const ref = { type: entity.type, id: entity.id } as const;
        const baseEntity = previousBase.entity(ref);
        const entryEntity = entry.graph.entity(ref);

        if (baseEntity === undefined || entityEqual(entryEntity, baseEntity)) {
          nextGraph = nextGraph.replace(entity);
        }
      }

      return { ...entry, graph: nextGraph };
    });

    if (this.#entries.length === 1) {
      this.#entries[0] = { graph: this.#base, annotation: "Initial state" };
    }
  }

  isDirty() {
    const keys = new Set([
      ...this.#base.entities().map(entityKey),
      ...this.graph.entities().map(entityKey),
    ]);

    for (const key of keys) {
      const type = key.startsWith("n") ? "node" : "way";
      const id = Number(key.slice(1));
      if (!entityEqual(this.#base.entity({ type, id }), this.graph.entity({ type, id }))) {
        return true;
      }
    }

    return false;
  }
}
