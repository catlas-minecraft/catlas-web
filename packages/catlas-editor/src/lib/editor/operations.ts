import { Graph } from "../graph";
import {
  deleteEntity,
  joinedLineNodeIds,
  joinWays,
  splitLineNodeIds,
  splitWayAtNode,
} from "./actions";
import type { GraphAction } from "./history";
import type { EntityRef } from "./types";

export type OperationId = "delete" | "join" | "split";

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
  readonly selection: EntityRef | null;
};

export const getOperation = (
  id: OperationId,
  graph: Graph,
  selection: EntityRef | null,
  target: EntityRef | null = null,
  nextLocalWayId = -1,
): OperationDefinition => {
  if (id === "delete") {
    const deleteTarget = target ?? selection;
    const available = deleteTarget !== null && graph.has(deleteTarget);
    return {
      id,
      label: "Delete",
      available,
      disabledReason: available ? null : "Select a feature to delete it.",
      annotation: "Delete feature",
      action: available && deleteTarget ? deleteEntity(deleteTarget) : null,
      selection: null,
    };
  }

  if (id === "join") {
    const selectedWay = selection?.type === "way" ? graph.way(selection.id) : undefined;
    const targetWay = target?.type === "way" ? graph.way(target.id) : undefined;
    const selectedLine = selectedWay?.geometryKind === "line" ? selectedWay : null;
    const targetLine = targetWay?.geometryKind === "line" ? targetWay : null;
    const joinedNodeIds =
      selectedLine && targetLine ? joinedLineNodeIds(selectedLine, targetLine) : null;
    const available = joinedNodeIds !== null;

    let disabledReason: string | null = null;
    if (!selection || !selectedWay) disabledReason = "Select a line to join from.";
    else if (selectedWay.geometryKind !== "line") disabledReason = "Only lines can be joined.";
    else if (!target || !targetWay) disabledReason = "Right-click a line to join it.";
    else if (selection.type === target.type && selection.id === target.id) {
      disabledReason = "Choose another line to join.";
    } else if (targetWay.geometryKind !== "line") disabledReason = "Only lines can be joined.";
    else if (!available) disabledReason = "Lines must share exactly one endpoint.";

    return {
      id,
      label: "Join with selected",
      available,
      disabledReason,
      annotation: "Join lines",
      action:
        available && selectedLine && targetLine ? joinWays(selectedLine.id, targetLine.id) : null,
      selection: selectedLine ? { type: "way", id: selectedLine.id } : null,
    };
  }

  if (id === "split") {
    const selectedWay = selection?.type === "way" ? graph.way(selection.id) : undefined;
    const targetNode = target?.type === "node" ? graph.node(target.id) : undefined;
    const selectedLine = selectedWay?.geometryKind === "line" ? selectedWay : null;
    const splitNodeIds =
      selectedLine && targetNode ? splitLineNodeIds(selectedLine, targetNode.id) : null;
    const localWayIdAvailable = !graph.has({ type: "way", id: nextLocalWayId });
    const available = splitNodeIds !== null && localWayIdAvailable;

    let disabledReason: string | null = null;
    if (!selection || !selectedWay) disabledReason = "Select a line to split.";
    else if (selectedWay.geometryKind !== "line") disabledReason = "Only lines can be split.";
    else if (!target || !targetNode) {
      disabledReason = "Right-click a vertex to split the selected line.";
    } else if (!selectedWay.nodeIds.includes(targetNode.id)) {
      disabledReason = "The vertex must belong to the selected line.";
    } else if (
      selectedWay.nodeIds[0] === targetNode.id ||
      selectedWay.nodeIds.at(-1) === targetNode.id
    ) {
      disabledReason = "Endpoints cannot split a line.";
    } else if (!splitNodeIds) {
      disabledReason = "Choose a vertex that occurs once in the line.";
    } else if (!localWayIdAvailable) {
      disabledReason = "No local Way ID is available.";
    }

    return {
      id,
      label: "Split way",
      available,
      disabledReason,
      annotation: "Split way",
      action:
        available && selectedLine && targetNode
          ? splitWayAtNode(selectedLine.id, targetNode.id, nextLocalWayId)
          : null,
      selection: selectedLine ? { type: "way", id: selectedLine.id } : null,
    };
  }

  return id;
};
