import type { NodeSnapshot, ViewportSnapshot, WayNodeSnapshot, WaySnapshot } from "@catlas/domain";
import type { LatLngTuple } from "leaflet";

export type RenderedWay = {
  kind: "polygon" | "polyline";
  nodeIds: number[];
  way: WaySnapshot;
  coordinates: LatLngTuple[];
};

export type NormalizedViewportData = {
  nodesById: Map<number, NodeSnapshot>;
  renderedWays: Map<number, RenderedWay>;
  standaloneNodeIds: Set<number>;
  wayIdsByNodeId: Map<number, number[]>;
};

const toLatLng = (node: { geom: { x: number; z: number } }): LatLngTuple => [
  node.geom.z,
  node.geom.x,
];

export const normalizeViewportData = (snapshot: ViewportSnapshot): NormalizedViewportData => {
  const visibleNodes = snapshot.nodes.filter((node) => node.deletedAt === null);
  const visibleWays = snapshot.ways.filter((way) => way.deletedAt === null);
  const nodesById = new Map(visibleNodes.map((node) => [node.id, node]));
  const wayNodesByWayId = new Map<number, WayNodeSnapshot[]>();
  const nodeIdsUsedByWays = new Set<number>();
  const wayIdsByNodeId = new Map<number, number[]>();

  for (const wayNode of snapshot.wayNodes) {
    const current = wayNodesByWayId.get(wayNode.wayId) ?? [];
    current.push(wayNode);
    wayNodesByWayId.set(wayNode.wayId, current);
  }

  const renderedWays = new Map<number, RenderedWay>();

  for (const way of visibleWays) {
    const orderedWayNodes = [...(wayNodesByWayId.get(way.id) ?? [])].sort((left, right) => {
      return left.seq - right.seq;
    });
    const nodeIds = orderedWayNodes.map((wayNode) => wayNode.nodeId);

    const coordinates = orderedWayNodes.flatMap((wayNode) => {
      const node = nodesById.get(wayNode.nodeId);
      return node ? [toLatLng(node)] : [];
    });

    if (coordinates.length < 2) {
      continue;
    }

    renderedWays.set(way.id, {
      kind: way.geometryKind === "area" && coordinates.length >= 3 ? "polygon" : "polyline",
      nodeIds,
      way,
      coordinates,
    });

    for (const nodeId of nodeIds) {
      nodeIdsUsedByWays.add(nodeId);
      const currentWayIds = wayIdsByNodeId.get(nodeId) ?? [];
      currentWayIds.push(way.id);
      wayIdsByNodeId.set(nodeId, currentWayIds);
    }
  }

  return {
    nodesById,
    renderedWays,
    standaloneNodeIds: new Set(
      visibleNodes.filter((node) => !nodeIdsUsedByWays.has(node.id)).map((node) => node.id),
    ),
    wayIdsByNodeId,
  };
};
