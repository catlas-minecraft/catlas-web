import type { ProjectedRenderedWay, ProjectedViewportData } from "./viewport-projector";
import type { ProjectedRenderedNode } from "./viewport-projector";

export type ViewportDiff = {
  nodes: {
    added: ProjectedRenderedNode[];
    updated: ProjectedRenderedNode[];
    removed: number[];
  };
  ways: {
    added: ProjectedRenderedWay[];
    updated: ProjectedRenderedWay[];
    removed: number[];
  };
};

const emptyRenderData = (): ProjectedViewportData => ({
  nodes: new Map(),
  renderedWays: new Map(),
});

const didNodeChange = (previousNode: ProjectedRenderedNode, nextNode: ProjectedRenderedNode) => {
  return (
    previousNode.node.geom.x !== nextNode.node.geom.x ||
    previousNode.node.geom.y !== nextNode.node.geom.y ||
    previousNode.node.geom.z !== nextNode.node.geom.z ||
    previousNode.selected !== nextNode.selected
  );
};

const didWayChange = (previousWay: ProjectedRenderedWay, nextWay: ProjectedRenderedWay) => {
  if (previousWay.kind !== nextWay.kind) {
    return true;
  }

  if (previousWay.selected !== nextWay.selected) {
    return true;
  }

  if (previousWay.coordinates.length !== nextWay.coordinates.length) {
    return true;
  }

  return previousWay.coordinates.some((coordinate, index) => {
    const nextCoordinate = nextWay.coordinates[index];
    return (
      !nextCoordinate || coordinate[0] !== nextCoordinate[0] || coordinate[1] !== nextCoordinate[1]
    );
  });
};

export const diffViewportData = (
  previousData: ProjectedViewportData | null,
  nextData: ProjectedViewportData,
): ViewportDiff => {
  const previous = previousData ?? emptyRenderData();
  const diff: ViewportDiff = {
    nodes: {
      added: [],
      updated: [],
      removed: [],
    },
    ways: {
      added: [],
      updated: [],
      removed: [],
    },
  };

  for (const nodeId of previous.nodes.keys()) {
    if (!nextData.nodes.has(nodeId)) {
      diff.nodes.removed.push(nodeId);
    }
  }

  for (const [nodeId, nextNode] of nextData.nodes) {
    const previousNode = previous.nodes.get(nodeId);

    if (!previousNode) {
      diff.nodes.added.push(nextNode);
      continue;
    }

    if (didNodeChange(previousNode, nextNode)) {
      diff.nodes.updated.push(nextNode);
    }
  }

  for (const wayId of previous.renderedWays.keys()) {
    if (!nextData.renderedWays.has(wayId)) {
      diff.ways.removed.push(wayId);
    }
  }

  for (const [wayId, nextWay] of nextData.renderedWays) {
    const previousWay = previous.renderedWays.get(wayId);

    if (!previousWay) {
      diff.ways.added.push(nextWay);
      continue;
    }

    if (didWayChange(previousWay, nextWay)) {
      diff.ways.updated.push(nextWay);
    }
  }

  return diff;
};
