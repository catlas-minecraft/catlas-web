import type {
  NodeDetailSnapshot,
  NodeSnapshot,
  ViewportSnapshot,
  WayDetailSnapshot,
  WayNodeSnapshot,
  WaySnapshot,
} from "@catlas/domain";
import type { LatLngBounds, LatLngTuple } from "leaflet";

export type SelectedEntity =
  | {
      type: "node";
      id: number;
    }
  | {
      type: "way";
      id: number;
    };

export type ActiveDrag =
  | {
      type: "node";
      entityId: number;
      x: number;
      z: number;
    }
  | {
      type: "way-vertex";
      wayId: number;
      vertexIndex: number;
      x: number;
      z: number;
    };

export type TagRow = {
  id: string;
  key: string;
  value: string;
};

export type NodeDraft = {
  type: "node";
  id: number;
  version: number;
  featureType: string;
  x: number;
  y: number;
  z: number;
  tags: TagRow[];
  source: NodeSnapshot;
};

export type WayVertexDraft = {
  id: string;
  nodeId: number | null;
  version: number | null;
  featureType: string;
  x: number;
  y: number;
  z: number;
  tags: Record<string, string>;
  isNew: boolean;
};

export type WayDraft = {
  type: "way";
  id: number;
  version: number;
  featureType: string;
  geometryKind: "line" | "area";
  isClosed: boolean;
  tags: TagRow[];
  vertices: WayVertexDraft[];
  source: WayDetailSnapshot;
};

export type EditorDraft = NodeDraft | WayDraft;

export type RenderedNode = NodeSnapshot & {
  coordinate: LatLngTuple;
};

export type RenderedWay = WaySnapshot & {
  nodeIds: number[];
  coordinates: LatLngTuple[];
};

export type NormalizedViewport = {
  nodesById: Map<number, NodeSnapshot>;
  waysById: Map<number, WaySnapshot>;
  renderedNodes: RenderedNode[];
  renderedWays: RenderedWay[];
};

type ApiError = Error & {
  status?: number;
};

const createTagId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
};

const createSyntheticTimestamp = () => Date.now();

const toCoordinate = (node: { geom: { x: number; z: number } }): LatLngTuple => [
  node.geom.z,
  node.geom.x,
];

export const rowsToTags = (rows: TagRow[]) =>
  rows.reduce<Record<string, string>>((acc, row) => {
    const key = row.key.trim();
    const value = row.value.trim();

    if (key.length === 0) {
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});

const tagsToRows = (tags: Record<string, string>): TagRow[] => {
  const entries = Object.entries(tags).sort(([left], [right]) => left.localeCompare(right));

  if (entries.length === 0) {
    return [{ id: createTagId(), key: "", value: "" }];
  }

  return entries.map(([key, value]) => ({
    id: createTagId(),
    key,
    value,
  }));
};

export const createBlankTag = (): TagRow => ({
  id: createTagId(),
  key: "",
  value: "",
});

export const cloneNodeDraft = (draft: NodeDraft): NodeDraft => ({
  ...draft,
  tags: draft.tags.map((tag) => ({ ...tag })),
  source: {
    ...draft.source,
    geom: { ...draft.source.geom },
    tags: { ...draft.source.tags },
  },
});

export const cloneWayDraft = (draft: WayDraft): WayDraft => ({
  ...draft,
  tags: draft.tags.map((tag) => ({ ...tag })),
  vertices: draft.vertices.map((vertex) => ({
    ...vertex,
    tags: { ...vertex.tags },
  })),
  source: {
    ...draft.source,
    way: {
      ...draft.source.way,
      tags: { ...draft.source.way.tags },
    },
    nodes: draft.source.nodes.map((node) => ({
      ...node,
      geom: { ...node.geom },
      tags: { ...node.tags },
    })),
    wayNodes: draft.source.wayNodes.map((wayNode) => ({ ...wayNode })),
  },
});

export const createNodeSnapshot = ({
  id,
  version,
  featureType,
  x,
  y,
  z,
  tags,
  fallback,
}: {
  id: number;
  version: number;
  featureType: string;
  x: number;
  y: number;
  z: number;
  tags: Record<string, string>;
  fallback?: NodeSnapshot;
}): NodeSnapshot => ({
  id,
  version,
  featureType,
  geom: { x, y, z },
  tags,
  createdAt: fallback?.createdAt ?? createSyntheticTimestamp(),
  updatedAt: fallback?.updatedAt ?? createSyntheticTimestamp(),
  createdBy: fallback?.createdBy ?? "local",
  updatedBy: fallback?.updatedBy ?? "local",
  deletedAt: null,
  changesetId: fallback?.changesetId ?? 0,
});

export const createNodeDraft = (detail: NodeDetailSnapshot): NodeDraft => ({
  type: "node",
  id: detail.node.id,
  version: detail.node.version,
  featureType: detail.node.featureType,
  x: detail.node.geom.x,
  y: detail.node.geom.y,
  z: detail.node.geom.z,
  tags: tagsToRows(detail.node.tags),
  source: detail.node,
});

export const createWayDraft = (detail: WayDetailSnapshot): WayDraft => {
  const orderedWayNodes = [...detail.wayNodes].sort((left, right) => left.seq - right.seq);
  const nodeById = new Map(detail.nodes.map((node) => [node.id, node]));
  const vertices = orderedWayNodes.reduce<WayVertexDraft[]>((acc, wayNode, index) => {
    const node = nodeById.get(wayNode.nodeId);

    if (!node) {
      return acc;
    }

    acc.push({
      id: `${wayNode.id}-${index}`,
      nodeId: node.id,
      version: node.version,
      featureType: node.featureType,
      x: node.geom.x,
      y: node.geom.y,
      z: node.geom.z,
      tags: { ...node.tags },
      isNew: false,
    });

    return acc;
  }, []);

  return {
    type: "way",
    id: detail.way.id,
    version: detail.way.version,
    featureType: detail.way.featureType,
    geometryKind: detail.way.geometryKind,
    isClosed: detail.way.isClosed,
    tags: tagsToRows(detail.way.tags),
    vertices,
    source: detail,
  };
};

export const overlayNodeDraftsOnWayDetail = (
  detail: WayDetailSnapshot,
  nodeDraftsById: Map<number, NodeDraft>,
): WayDetailSnapshot => ({
  way: {
    ...detail.way,
    tags: { ...detail.way.tags },
  },
  nodes: detail.nodes.map((node) => {
    const overlay = nodeDraftsById.get(node.id);

    if (!overlay) {
      return {
        ...node,
        geom: { ...node.geom },
        tags: { ...node.tags },
      };
    }

    return createNodeSnapshot({
      id: overlay.id,
      version: overlay.version,
      featureType: overlay.featureType,
      x: overlay.x,
      y: overlay.y,
      z: overlay.z,
      tags: rowsToTags(overlay.tags),
      fallback: overlay.source,
    });
  }),
  wayNodes: detail.wayNodes.map((wayNode) => ({ ...wayNode })),
});

export const overlayNodeDraftsOnWayDraft = (
  draft: WayDraft,
  nodeDraftsById: Map<number, NodeDraft>,
): WayDraft => {
  const nextDraft = cloneWayDraft(draft);

  nextDraft.vertices = nextDraft.vertices.map((vertex) => {
    if (vertex.nodeId === null) {
      return vertex;
    }

    const overlay = nodeDraftsById.get(vertex.nodeId);

    if (!overlay) {
      return vertex;
    }

    return {
      ...vertex,
      featureType: overlay.featureType,
      x: overlay.x,
      y: overlay.y,
      z: overlay.z,
      tags: rowsToTags(overlay.tags),
    };
  });

  nextDraft.source = overlayNodeDraftsOnWayDetail(nextDraft.source, nodeDraftsById);

  return nextDraft;
};

export const getDraftKey = (selection: SelectedEntity | null) =>
  selection ? `${selection.type}:${selection.id}` : null;

export const getVisibleWayVertices = (draft: WayDraft) => {
  if (!draft.isClosed || draft.vertices.length <= 1) {
    return draft.vertices;
  }

  const first = draft.vertices[0];
  const last = draft.vertices[draft.vertices.length - 1];

  if (!first || !last || first.nodeId !== last.nodeId) {
    return draft.vertices;
  }

  return draft.vertices.slice(0, -1);
};

export const rebuildClosedVertices = (draft: WayDraft, visibleVertices: WayVertexDraft[]) => {
  if (!draft.isClosed) {
    return visibleVertices;
  }

  if (visibleVertices.length === 0) {
    return visibleVertices;
  }

  const first = visibleVertices[0]!;

  return [
    ...visibleVertices,
    {
      ...first,
      id: `${first.id}-closing`,
    },
  ];
};

const copyVertex = (vertex: WayVertexDraft): WayVertexDraft => ({
  ...vertex,
  tags: { ...vertex.tags },
});

export const applyWayVertexCoordinate = (
  draft: WayDraft,
  vertexIndex: number,
  coordinate: { x: number; z: number },
) => {
  const visible = getVisibleWayVertices(draft).map(copyVertex);
  const target = visible[vertexIndex];

  if (!target) {
    return draft;
  }

  const nextVisible = visible.map((vertex) => {
    if (target.nodeId !== null && vertex.nodeId === target.nodeId) {
      return {
        ...vertex,
        x: coordinate.x,
        z: coordinate.z,
      };
    }

    if (vertex.id === target.id) {
      return {
        ...vertex,
        x: coordinate.x,
        z: coordinate.z,
      };
    }

    return vertex;
  });

  return {
    ...draft,
    vertices: rebuildClosedVertices(draft, nextVisible),
  };
};

export const applyActiveDragToDraft = (
  draft: EditorDraft | null,
  activeDrag: ActiveDrag | null,
): EditorDraft | null => {
  if (!draft || !activeDrag) {
    return draft;
  }

  if (draft.type === "node" && activeDrag.type === "node" && activeDrag.entityId === draft.id) {
    return {
      ...draft,
      x: activeDrag.x,
      z: activeDrag.z,
    };
  }

  if (draft.type === "way" && activeDrag.type === "way-vertex" && activeDrag.wayId === draft.id) {
    return applyWayVertexCoordinate(draft, activeDrag.vertexIndex, {
      x: activeDrag.x,
      z: activeDrag.z,
    });
  }

  return draft;
};

export const geometryFromDraft = (draft: WayDraft): LatLngTuple[] => {
  const vertices = getVisibleWayVertices(draft).map(
    (vertex) => [vertex.z, vertex.x] as LatLngTuple,
  );

  if (!draft.isClosed || vertices.length === 0) {
    return vertices;
  }

  return [...vertices, vertices[0]!];
};

const coordinatesFromWayDraft = (
  way: WayDraft,
  nodesById: Map<number, NodeSnapshot>,
): LatLngTuple[] => {
  const coordinates = getVisibleWayVertices(way).map((vertex) => {
    if (vertex.nodeId !== null) {
      const node = nodesById.get(vertex.nodeId);

      if (node) {
        return toCoordinate(node);
      }
    }

    return [vertex.z, vertex.x] as LatLngTuple;
  });

  if (!way.isClosed || coordinates.length === 0) {
    return coordinates;
  }

  return [...coordinates, coordinates[0]!];
};

export const createRenderableViewport = (
  snapshot?: ViewportSnapshot,
  draft: EditorDraft | null = null,
): NormalizedViewport => {
  if (!snapshot) {
    return {
      nodesById: new Map(),
      waysById: new Map(),
      renderedNodes: [],
      renderedWays: [],
    };
  }

  const visibleNodes = snapshot.nodes.filter((node) => node.deletedAt === null);
  const visibleWays = snapshot.ways.filter((way) => way.deletedAt === null);
  const nodesById = new Map(visibleNodes.map((node) => [node.id, node]));

  if (draft?.type === "node") {
    nodesById.set(
      draft.id,
      createNodeSnapshot({
        id: draft.id,
        version: draft.version,
        featureType: draft.featureType,
        x: draft.x,
        y: draft.y,
        z: draft.z,
        tags: rowsToTags(draft.tags),
        fallback: draft.source,
      }),
    );
  }

  if (draft?.type === "way") {
    for (const vertex of draft.vertices) {
      if (vertex.nodeId === null) {
        continue;
      }

      nodesById.set(
        vertex.nodeId,
        createNodeSnapshot({
          id: vertex.nodeId,
          version: vertex.version ?? 0,
          featureType: vertex.featureType,
          x: vertex.x,
          y: vertex.y,
          z: vertex.z,
          tags: vertex.tags,
          fallback: nodesById.get(vertex.nodeId),
        }),
      );
    }
  }

  const wayNodesByWayId = new Map<number, WayNodeSnapshot[]>();

  for (const wayNode of snapshot.wayNodes) {
    const current = wayNodesByWayId.get(wayNode.wayId) ?? [];
    current.push(wayNode);
    wayNodesByWayId.set(wayNode.wayId, current);
  }

  const renderedWays: RenderedWay[] = [];

  for (const way of visibleWays) {
    if (draft?.type === "way" && way.id === draft.id) {
      renderedWays.push({
        ...way,
        featureType: draft.featureType,
        geometryKind: draft.geometryKind,
        isClosed: draft.isClosed,
        tags: rowsToTags(draft.tags),
        nodeIds: draft.vertices.flatMap((vertex) =>
          vertex.nodeId === null ? [] : [vertex.nodeId],
        ),
        coordinates: coordinatesFromWayDraft(draft, nodesById),
      });
      continue;
    }

    const orderedWayNodes = [...(wayNodesByWayId.get(way.id) ?? [])].sort((left, right) => {
      return left.seq - right.seq;
    });
    const nodes = orderedWayNodes
      .map((wayNode) => nodesById.get(wayNode.nodeId))
      .filter((node): node is NodeSnapshot => node !== undefined);
    const coordinates = nodes.map(toCoordinate);

    if (coordinates.length < 2) {
      continue;
    }

    renderedWays.push({
      ...way,
      nodeIds: nodes.map((node) => node.id),
      coordinates,
    });
  }

  return {
    nodesById,
    waysById: new Map(
      visibleWays.map((way) => [
        way.id,
        draft?.type === "way" && draft.id === way.id
          ? {
              ...way,
              featureType: draft.featureType,
              geometryKind: draft.geometryKind,
              isClosed: draft.isClosed,
              tags: rowsToTags(draft.tags),
            }
          : way,
      ]),
    ),
    renderedNodes: [...nodesById.values()].map((node) => ({
      ...node,
      coordinate: toCoordinate(node),
    })),
    renderedWays,
  };
};

const parseErrorMessage = async (response: Response) => {
  const fallback = `${response.status} ${response.statusText}`;

  try {
    const json = (await response.json()) as { message?: string; error?: string };
    return json.message ?? json.error ?? fallback;
  } catch {
    return fallback;
  }
};

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const error = new Error(await parseErrorMessage(response)) as ApiError;
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const formatBbox = (bounds: LatLngBounds) => {
  const minX = bounds.getWest();
  const minZ = bounds.getSouth();
  const maxX = bounds.getEast();
  const maxZ = bounds.getNorth();

  return [minX, minZ, maxX, maxZ] as const;
};

export const toFixedCoordinate = (value: number) => {
  if (!Number.isFinite(value)) {
    return "";
  }

  return value.toFixed(2);
};
