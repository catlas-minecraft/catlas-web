import { Graph } from "../graph";
import { deleteEntity } from "./actions";
import type { GraphAction } from "./history";
import type { EntityRef } from "./types";

export type OperationId = "delete";

export type Operation = {
  readonly id: OperationId;
  readonly label: string;
  readonly available: boolean;
  readonly disabledReason: string | null;
  readonly execute: () => void;
};

export type OperationDefinition = Omit<Operation, "execute"> & {
  readonly annotation: string;
  readonly action: GraphAction | null;
};

export const getOperation = (
  id: OperationId,
  graph: Graph,
  selection: EntityRef | null,
): OperationDefinition => {
  if (id === "delete") {
    const available = selection !== null && graph.has(selection);
    return {
      id,
      label: "Delete",
      available,
      disabledReason: available ? null : "Select a feature to delete it.",
      annotation: "Delete feature",
      action: available && selection ? deleteEntity(selection) : null,
    };
  }

  return id;
};
