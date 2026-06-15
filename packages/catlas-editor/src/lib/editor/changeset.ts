import type { ChangesetUploadDiffResult, ChangesetUploadPayload } from "@catlas/domain";
import { entityEqual, Graph } from "../graph";
import { entityKey, type EditorEntity, type NodeEntity, type WayEntity } from "./types";

export type GraphDifference = {
  readonly created: readonly EditorEntity[];
  readonly modified: readonly EditorEntity[];
  readonly deleted: readonly EditorEntity[];
};

export const difference = (base: Graph, current: Graph): GraphDifference => {
  const created = current.entities().filter((entity) => !base.has(entity));
  const modified = current.entities().filter((entity) => {
    const baseEntity = base.entity(entity);
    return baseEntity !== undefined && !entityEqual(baseEntity, entity);
  });
  const deleted = base.entities().filter((entity) => !current.has(entity));
  return { created, modified, deleted };
};

const nodeCreate = (node: NodeEntity) => ({
  id: node.id,
  geom: node.geom,
  featureType: node.featureType,
  tags: { ...node.tags },
});

const nodeModify = (node: NodeEntity) => ({
  ...nodeCreate(node),
  expectedVersion: node.version,
});

const wayCreate = (way: WayEntity) => ({
  id: way.id,
  featureType: way.featureType,
  geometryKind: way.geometryKind,
  nodeRefs: [...way.nodeIds],
  tags: { ...way.tags },
});

const wayModify = (way: WayEntity) => ({
  ...wayCreate(way),
  expectedVersion: way.version,
});

export const toChangesetUpload = (base: Graph, current: Graph): ChangesetUploadPayload => {
  const diff = difference(base, current);
  const createdNodes = diff.created.filter(
    (entity): entity is NodeEntity => entity.type === "node",
  );
  const createdWays = diff.created.filter((entity): entity is WayEntity => entity.type === "way");
  const modifiedNodes = diff.modified.filter(
    (entity): entity is NodeEntity => entity.type === "node",
  );
  const modifiedWays = diff.modified.filter((entity): entity is WayEntity => entity.type === "way");
  const deletedNodes = diff.deleted.filter(
    (entity): entity is NodeEntity => entity.type === "node",
  );
  const deletedWays = diff.deleted.filter((entity): entity is WayEntity => entity.type === "way");

  return {
    create: {
      nodes: createdNodes.map(nodeCreate),
      ways: createdWays.map(wayCreate),
      relations: [],
    },
    modify: {
      nodes: modifiedNodes.map(nodeModify),
      ways: modifiedWays.map(wayModify),
      relations: [],
    },
    delete: {
      nodes: deletedNodes.map((node) => ({ id: node.id, expectedVersion: node.version })),
      ways: deletedWays.map((way) => ({ id: way.id, expectedVersion: way.version })),
      relations: [],
    },
  };
};

export const diffResultToRemaps = (result: ChangesetUploadDiffResult) =>
  new Map<string, { readonly id: number; readonly version: number }>([
    ...result.nodes.map(
      (entry) => [`n${entry.oldId}`, { id: entry.newId, version: entry.newVersion }] as const,
    ),
    ...result.ways.map(
      (entry) => [`w${entry.oldId}`, { id: entry.newId, version: entry.newVersion }] as const,
    ),
  ]);

export const countChanges = (base: Graph, current: Graph) => {
  const diff = difference(base, current);
  return diff.created.length + diff.modified.length + diff.deleted.length;
};

export const changedEntityKeys = (base: Graph, current: Graph) => {
  const diff = difference(base, current);
  return new Set([...diff.created, ...diff.modified, ...diff.deleted].map(entityKey));
};
