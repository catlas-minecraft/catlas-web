import { Graph } from "../graph";
import type { GraphAction } from "./history";
import type { EditorEntity, EntityRef, NodeEntity, Point3D, WayEntity } from "./types";

export const replaceEntity =
  (entity: EditorEntity): GraphAction =>
  (graph) =>
    graph.replace(entity);

export const moveNode =
  (id: number, geom: Point3D): GraphAction =>
  (graph) => {
    const node = graph.node(id);
    return node ? graph.replace({ ...node, geom: { ...geom } }) : graph;
  };

export const updateEntityProperties =
  (
    ref: EntityRef,
    properties: {
      readonly featureType?: string;
      readonly tags?: Readonly<Record<string, string>>;
      readonly y?: number;
    },
  ): GraphAction =>
  (graph) => {
    const entity = graph.entity(ref);
    if (!entity) return graph;

    if (entity.type === "node") {
      return graph.replace({
        ...entity,
        featureType: properties.featureType ?? entity.featureType,
        tags: properties.tags ? { ...properties.tags } : entity.tags,
        geom: properties.y === undefined ? entity.geom : { ...entity.geom, y: properties.y },
      });
    }

    return graph.replace({
      ...entity,
      featureType: properties.featureType ?? entity.featureType,
      tags: properties.tags ? { ...properties.tags } : entity.tags,
    });
  };

const removeNodeFromWay = (graph: Graph, way: WayEntity, nodeId: number) => {
  if (way.geometryKind === "area") {
    const ring = way.nodeIds.slice(0, -1).filter((id) => id !== nodeId);
    if (new Set(ring).size < 3) return graph.remove({ type: "way", id: way.id });
    return graph.replace({ ...way, nodeIds: [...ring, ring[0]!] });
  }

  const nodeIds = way.nodeIds.filter((id) => id !== nodeId);
  return nodeIds.length < 2
    ? graph.remove({ type: "way", id: way.id })
    : graph.replace({ ...way, nodeIds });
};

export const deleteEntity =
  (ref: EntityRef): GraphAction =>
  (graph) => {
    const entity = graph.entity(ref);
    if (!entity) return graph;
    if (entity.type === "way") {
      let nextGraph = graph.remove(ref);
      for (const nodeId of new Set(entity.nodeIds)) {
        const node = graph.node(nodeId);
        const onlyUsedByDeletedWay = graph.parentWays(nodeId).length === 1;
        if (
          node &&
          onlyUsedByDeletedWay &&
          node.featureType.endsWith(":vertex") &&
          Object.keys(node.tags).length === 0
        ) {
          nextGraph = nextGraph.remove({ type: "node", id: nodeId });
        }
      }
      return nextGraph;
    }

    let nextGraph = graph;
    for (const parentWay of graph.parentWays(entity.id)) {
      nextGraph = removeNodeFromWay(nextGraph, parentWay, entity.id);
    }
    return nextGraph.remove(ref);
  };

export const insertNodeIntoWay =
  (wayId: number, index: number, node: NodeEntity): GraphAction =>
  (graph) => {
    const way = graph.way(wayId);
    if (!way) return graph;

    const nodeIds = [...way.nodeIds];
    nodeIds.splice(index, 0, node.id);
    return graph.replace(node).replace({ ...way, nodeIds });
  };

export const addEntities =
  (entities: readonly EditorEntity[]): GraphAction =>
  (graph) =>
    graph.replaceAll(entities);
