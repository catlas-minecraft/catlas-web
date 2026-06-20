import * as d3 from "d3";
import { Graph } from "../graph";
import type { DrawingState, EntityRef, NodeEntity, Point3D, WayEntity } from "./types";
import { entityKey } from "./types";
import { worldToScreen } from "./util";

type RendererOptions = {
  readonly onEntityPointerDown: (event: PointerEvent, entity: EntityRef) => void;
  readonly onMidpointPointerDown: (
    event: PointerEvent,
    wayId: number,
    insertionIndex: number,
    point: Point3D,
  ) => void;
};

type RenderState = {
  readonly graph: Graph;
  readonly selection: EntityRef | null;
  readonly preview: {
    readonly graph: Graph;
    readonly ref: EntityRef;
  } | null;
  readonly drawing: DrawingState | null;
  readonly transientNode: { readonly id: number; readonly geom: Point3D } | null;
  readonly transform: d3.ZoomTransform;
};

type NodeVisibilityOptions = {
  readonly showLineVertices?: boolean;
};

const pathForWay = (
  graph: Graph,
  way: WayEntity,
  transform: d3.ZoomTransform,
  transientNode: RenderState["transientNode"],
) => {
  const points = way.nodeIds.flatMap((nodeId) => {
    const node = graph.node(nodeId);
    if (!node) return [];
    const geom = transientNode?.id === nodeId ? transientNode.geom : node.geom;
    return [worldToScreen(transform, geom)];
  });
  if (points.length === 0) return "";
  return `M${points.map(([x, y]) => `${x},${y}`).join("L")}${way.geometryKind === "area" ? "Z" : ""}`;
};

export const visibleNodesForSelection = (
  graph: Graph,
  selection: EntityRef | null,
  options: NodeVisibilityOptions = {},
): readonly NodeEntity[] => {
  const vertexNodeIds = new Set(graph.ways().flatMap((way) => way.nodeIds));
  const visibleVertexNodeIds = new Set<number>();

  if (options.showLineVertices) {
    for (const way of graph.ways()) {
      if (way.geometryKind !== "line") continue;
      for (const nodeId of way.nodeIds) visibleVertexNodeIds.add(nodeId);
    }
  }

  if (selection?.type === "way") {
    for (const nodeId of graph.way(selection.id)?.nodeIds ?? []) {
      visibleVertexNodeIds.add(nodeId);
    }
  } else if (selection?.type === "node") {
    for (const way of graph.parentWays(selection.id)) {
      for (const nodeId of way.nodeIds) visibleVertexNodeIds.add(nodeId);
    }
  }

  return graph
    .nodes()
    .filter((node) => !vertexNodeIds.has(node.id) || visibleVertexNodeIds.has(node.id));
};

export class EntitySvgLayer {
  readonly #root: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  readonly #areas: d3.Selection<SVGGElement, unknown, null, undefined>;
  readonly #lines: d3.Selection<SVGGElement, unknown, null, undefined>;
  readonly #hitAreas: d3.Selection<SVGGElement, unknown, null, undefined>;
  readonly #nodes: d3.Selection<SVGGElement, unknown, null, undefined>;
  readonly #midpoints: d3.Selection<SVGGElement, unknown, null, undefined>;
  readonly #preview: d3.Selection<SVGGElement, unknown, null, undefined>;
  readonly #draft: d3.Selection<SVGGElement, unknown, null, undefined>;
  readonly #options: RendererOptions;

  constructor(svg: SVGSVGElement, options: RendererOptions) {
    this.#root = d3.select(svg);
    this.#areas = this.#root.append("g").attr("class", "entity-layer entity-layer--areas");
    this.#lines = this.#root.append("g").attr("class", "entity-layer entity-layer--lines");
    this.#hitAreas = this.#root.append("g").attr("class", "entity-layer entity-layer--hits");
    this.#nodes = this.#root.append("g").attr("class", "entity-layer entity-layer--nodes");
    this.#midpoints = this.#root.append("g").attr("class", "entity-layer entity-layer--midpoints");
    this.#preview = this.#root.append("g").attr("class", "entity-layer entity-layer--preview");
    this.#draft = this.#root.append("g").attr("class", "entity-layer entity-layer--draft");
    this.#options = options;
  }

  render(state: RenderState) {
    const { graph, selection, drawing, transientNode, transform } = state;
    const areas = graph.ways().filter((way) => way.geometryKind === "area");
    const lines = graph.ways().filter((way) => way.geometryKind === "line");
    const selectedKey = selection ? entityKey(selection) : null;

    this.#areas
      .selectAll<SVGPathElement, WayEntity>("path.entity-area")
      .data(areas, (way) => way.id)
      .join("path")
      .attr("class", (way) => `entity-area${selectedKey === entityKey(way) ? " is-selected" : ""}`)
      .attr("d", (way) => pathForWay(graph, way, transform, transientNode));

    this.#lines
      .selectAll<SVGPathElement, WayEntity>("path.entity-line")
      .data(lines, (way) => way.id)
      .join("path")
      .attr("class", (way) => `entity-line${selectedKey === entityKey(way) ? " is-selected" : ""}`)
      .attr("d", (way) => pathForWay(graph, way, transform, transientNode));

    this.#hitAreas
      .selectAll<SVGPathElement, WayEntity>("path.entity-hit")
      .data([...areas, ...lines], (way) => way.id)
      .join("path")
      .attr("class", (way) => `entity-hit entity-hit--${way.geometryKind}`)
      .attr("data-interactive", "true")
      .attr("d", (way) => pathForWay(graph, way, transform, transientNode))
      .on("pointerdown", (event: PointerEvent, way) =>
        this.#options.onEntityPointerDown(event, { type: "way", id: way.id }),
      )
      .on("click", (event: MouseEvent) => event.stopPropagation());

    this.#nodes
      .selectAll<SVGCircleElement, ReturnType<Graph["nodes"]>[number]>("circle.entity-node")
      .data(
        visibleNodesForSelection(graph, selection, {
          showLineVertices: drawing?.geometryKind === "line",
        }),
        (node) => node.id,
      )
      .join("circle")
      .attr("class", (node) => {
        const selected = selectedKey === entityKey(node) ? " is-selected" : "";
        const vertex = graph.parentWays(node.id).length > 0 ? " is-vertex" : " is-point";
        return `entity-node${selected}${vertex}`;
      })
      .attr("data-interactive", "true")
      .attr(
        "cx",
        (node) =>
          worldToScreen(
            transform,
            transientNode?.id === node.id ? transientNode.geom : node.geom,
          )[0],
      )
      .attr(
        "cy",
        (node) =>
          worldToScreen(
            transform,
            transientNode?.id === node.id ? transientNode.geom : node.geom,
          )[1],
      )
      .attr("r", (node) => (selectedKey === entityKey(node) ? 7 : 5))
      .on("pointerdown", (event: PointerEvent, node) =>
        this.#options.onEntityPointerDown(event, { type: "node", id: node.id }),
      )
      .on("click", (event: MouseEvent) => event.stopPropagation());

    const selectedWay = selection?.type === "way" ? graph.way(selection.id) : undefined;
    const midpointData = selectedWay
      ? selectedWay.nodeIds.slice(1).flatMap((nodeId, edgeIndex) => {
          const previousNode = graph.node(selectedWay.nodeIds[edgeIndex]!);
          const nextNode = graph.node(nodeId);
          if (!previousNode || !nextNode) return [];
          return [
            {
              key: `${selectedWay.id}-${edgeIndex + 1}`,
              wayId: selectedWay.id,
              insertionIndex: edgeIndex + 1,
              point: {
                x: (previousNode.geom.x + nextNode.geom.x) / 2,
                y: (previousNode.geom.y + nextNode.geom.y) / 2,
                z: (previousNode.geom.z + nextNode.geom.z) / 2,
              },
            },
          ];
        })
      : [];

    this.#midpoints
      .selectAll<SVGCircleElement, (typeof midpointData)[number]>("circle.entity-midpoint")
      .data(midpointData, (midpoint) => midpoint.key)
      .join("circle")
      .attr("class", "entity-midpoint")
      .attr("data-interactive", "true")
      .attr("cx", (midpoint) => worldToScreen(transform, midpoint.point)[0])
      .attr("cy", (midpoint) => worldToScreen(transform, midpoint.point)[1])
      .attr("r", 4)
      .on("pointerdown", (event: PointerEvent, midpoint) =>
        this.#options.onMidpointPointerDown(
          event,
          midpoint.wayId,
          midpoint.insertionIndex,
          midpoint.point,
        ),
      )
      .on("click", (event: MouseEvent) => event.stopPropagation());

    const previewEntity = state.preview?.graph.entity(state.preview.ref);
    const previewWay = previewEntity?.type === "way" ? previewEntity : null;
    const previewNode = previewEntity?.type === "node" ? previewEntity : null;

    this.#preview
      .selectAll<SVGPathElement, WayEntity>("path.entity-preview--way")
      .data(previewWay ? [previewWay] : [], (way) => entityKey(way))
      .join("path")
      .attr("class", "entity-preview entity-preview--way is-deleted")
      .classed("entity-preview--line", (way) => way.geometryKind === "line")
      .attr("d", (way) => pathForWay(state.preview!.graph, way, transform, null));

    this.#preview
      .selectAll<SVGCircleElement, NodeEntity>("circle.entity-preview--node")
      .data(previewNode ? [previewNode] : [], (node) => entityKey(node))
      .join("circle")
      .attr("class", "entity-preview entity-preview--node is-deleted")
      .attr("cx", (node) => worldToScreen(transform, node.geom)[0])
      .attr("cy", (node) => worldToScreen(transform, node.geom)[1])
      .attr("r", 9);

    const draftPoints = drawing?.vertices.map((vertex) => vertex.point) ?? [];
    const draftPathPoints = drawing?.pointer ? [...draftPoints, drawing.pointer] : draftPoints;
    const draftPath = draftPathPoints.length
      ? `M${draftPathPoints.map((point) => worldToScreen(transform, point).join(",")).join("L")}${drawing?.geometryKind === "area" && draftPoints.length >= 3 ? "Z" : ""}`
      : "";

    this.#draft
      .selectAll<SVGPathElement, string>("path.draft-way")
      .data(draftPath ? [draftPath] : [])
      .join("path")
      .attr("class", `draft-way draft-way--${drawing?.geometryKind ?? "line"}`)
      .attr("d", (path) => path);

    this.#draft
      .selectAll<SVGCircleElement, Point3D>("circle.draft-node")
      .data(draftPoints)
      .join("circle")
      .attr("class", "draft-node")
      .attr("cx", (point) => worldToScreen(transform, point)[0])
      .attr("cy", (point) => worldToScreen(transform, point)[1])
      .attr("r", 5);
  }

  destroy() {
    this.#root.selectAll("*").remove();
  }
}
