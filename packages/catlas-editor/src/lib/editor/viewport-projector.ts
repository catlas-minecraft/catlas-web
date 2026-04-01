import type { NodeSnapshot } from "@catlas/domain";
import type { LatLngTuple } from "leaflet";
import type { NormalizedViewportData } from "./viewport-normalizer";

export type SelectedEntity =
  | {
      type: "node";
      id: number;
    }
  | {
      type: "way";
      id: number;
    }
  | null;

export type ProjectedRenderedNode = {
  coordinate: LatLngTuple;
  node: NodeSnapshot;
  selected: boolean;
};

export type ProjectedRenderedWay = {
  kind: "polygon" | "polyline";
  coordinates: LatLngTuple[];
  selected: boolean;
  way: {
    id: number;
  };
};

export type ProjectedViewportData = {
  nodes: Map<number, ProjectedRenderedNode>;
  renderedWays: Map<number, ProjectedRenderedWay>;
};

const toLatLng = (node: { geom: { x: number; z: number } }): LatLngTuple => [
  node.geom.z,
  node.geom.x,
];

export const projectViewportData = (
  data: NormalizedViewportData,
  selectedEntity: SelectedEntity,
): ProjectedViewportData => {
  const visibleNodeIds = new Set<number>(data.standaloneNodeIds);

  if (selectedEntity?.type === "node") {
    visibleNodeIds.add(selectedEntity.id);
  }

  if (selectedEntity?.type === "way") {
    const selectedWay = data.renderedWays.get(selectedEntity.id);

    if (selectedWay) {
      for (const nodeId of selectedWay.nodeIds) {
        visibleNodeIds.add(nodeId);
      }
    }
  }

  const nodes = new Map<number, ProjectedRenderedNode>();

  for (const nodeId of visibleNodeIds) {
    const node = data.nodesById.get(nodeId);

    if (!node) {
      continue;
    }

    nodes.set(nodeId, {
      coordinate: toLatLng(node),
      node,
      selected: selectedEntity?.type === "node" && selectedEntity.id === nodeId,
    });
  }

  return {
    nodes,
    renderedWays: new Map(
      [...data.renderedWays.entries()].map(([wayId, renderedWay]) => [
        wayId,
        {
          kind: renderedWay.kind,
          coordinates: renderedWay.coordinates,
          selected: selectedEntity?.type === "way" && selectedEntity.id === wayId,
          way: {
            id: renderedWay.way.id,
          },
        },
      ]),
    ),
  };
};
