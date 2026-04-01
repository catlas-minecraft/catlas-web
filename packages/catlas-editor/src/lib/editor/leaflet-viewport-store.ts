import type { NodeSnapshot } from "@catlas/domain";
import {
  Marker,
  Polygon,
  Polyline,
  divIcon,
  layerGroup,
  marker,
  polygon,
  polyline,
  type LayerGroup,
  type Map as LeafletMap,
} from "leaflet";
import type { RenderedWay } from "./viewport-normalizer";

const LINE_STYLE = {
  color: "#f97316",
  weight: 5,
  opacity: 0.95,
};

const LINE_SELECTED_STYLE = {
  color: "#fb7185",
  weight: 6,
  opacity: 1,
};

const AREA_STYLE = {
  color: "#f97316",
  weight: 4,
  opacity: 1,
  fillColor: "#fb923c",
  fillOpacity: 0.2,
};

const AREA_SELECTED_STYLE = {
  color: "#fb7185",
  weight: 5,
  opacity: 1,
  fillColor: "#fb7185",
  fillOpacity: 0.22,
};

const toLatLng = (node: { geom: { x: number; z: number } }) =>
  [node.geom.z, node.geom.x] as [number, number];

const createNodeIcon = (selected: boolean) =>
  divIcon({
    className: "catlas-editor-node-marker",
    html: `<div style="width:${selected ? 12 : 8}px;height:${selected ? 12 : 8}px;border-radius:999px;border:${selected ? 2 : 1}px solid ${selected ? "#f8fafc" : "#0f172a"};background:${selected ? "#10b981" : "#22c55e"};opacity:1;box-shadow:0 0 0 1px rgba(15,23,42,0.16);"></div>`,
    iconSize: selected ? [12, 12] : [8, 8],
    iconAnchor: selected ? [6, 6] : [4, 4],
  });

const createNodeLayer = (
  node: NodeSnapshot,
  selected: boolean,
  options?: {
    onNodeSelect?: (id: number) => void;
    onNodeDragStart?: (id: number) => void;
    onNodeDragMove?: (id: number, coordinate: { x: number; z: number }) => void;
    onNodeDragEnd?: (id: number, coordinate: { x: number; z: number }) => void;
  },
) => {
  const nodeLayer = marker(toLatLng(node), {
    icon: createNodeIcon(selected),
    draggable: true,
    autoPan: true,
    keyboard: false,
    bubblingMouseEvents: false,
    zIndexOffset: 1000,
  });

  nodeLayer.on("click", () => options?.onNodeSelect?.(node.id));
  nodeLayer.on("dragstart", () => options?.onNodeDragStart?.(node.id));
  nodeLayer.on("drag", () => {
    const latLng = nodeLayer.getLatLng();
    options?.onNodeDragMove?.(node.id, toCoordinate(latLng.lat, latLng.lng));
  });
  nodeLayer.on("dragend", () => {
    const latLng = nodeLayer.getLatLng();
    options?.onNodeDragEnd?.(node.id, toCoordinate(latLng.lat, latLng.lng));
  });

  return nodeLayer;
};

const createWayLayer = (renderedWay: RenderedWay, selected: boolean, onWaySelect?: (id: number) => void) => {
  if (renderedWay.kind === "polygon") {
    return polygon(renderedWay.coordinates, {
      ...(selected ? AREA_SELECTED_STYLE : AREA_STYLE),
      bubblingMouseEvents: false,
    }).on("click", () => onWaySelect?.(renderedWay.way.id));
  }

  return polyline(renderedWay.coordinates, {
    ...(selected ? LINE_SELECTED_STYLE : LINE_STYLE),
    bubblingMouseEvents: false,
  }).on("click", () => onWaySelect?.(renderedWay.way.id));
};

const isPolygonLayer = (layer: Polyline | Polygon): layer is Polygon => layer instanceof Polygon;

const updateNodeLayer = (layer: Marker, node: NodeSnapshot, selected: boolean) => {
  layer.setLatLng(toLatLng(node));
  layer.setIcon(createNodeIcon(selected));
};

const updateWayLayer = (layer: Polyline | Polygon, renderedWay: RenderedWay, selected: boolean) => {
  layer.setLatLngs(renderedWay.coordinates);
  layer.setStyle(
    renderedWay.kind === "polygon"
      ? selected
        ? AREA_SELECTED_STYLE
        : AREA_STYLE
      : selected
        ? LINE_SELECTED_STYLE
        : LINE_STYLE,
  );
};

const toCoordinate = (lat: number, lng: number) => ({
  x: lng,
  z: lat,
});

export class LeafletViewportStore {
  private readonly nodeLayers = new Map<number, Marker>();
  private readonly wayLayers = new Map<number, Polyline | Polygon>();
  private readonly wayLayerGroup: LayerGroup;
  private readonly nodeLayerGroup: LayerGroup;
  private readonly onNodeSelect?: (id: number) => void;
  private readonly onWaySelect?: (id: number) => void;
  private readonly onNodeDragStart?: (id: number) => void;
  private readonly onNodeDragMove?: (id: number, coordinate: { x: number; z: number }) => void;
  private readonly onNodeDragEnd?: (id: number, coordinate: { x: number; z: number }) => void;

  constructor(
    leafletMap: LeafletMap,
    options?: {
      onNodeSelect?: (id: number) => void;
      onWaySelect?: (id: number) => void;
      onNodeDragStart?: (id: number) => void;
      onNodeDragMove?: (id: number, coordinate: { x: number; z: number }) => void;
      onNodeDragEnd?: (id: number, coordinate: { x: number; z: number }) => void;
    },
  ) {
    this.wayLayerGroup = layerGroup().addTo(leafletMap);
    this.nodeLayerGroup = layerGroup().addTo(leafletMap);
    this.onNodeSelect = options?.onNodeSelect;
    this.onWaySelect = options?.onWaySelect;
    this.onNodeDragStart = options?.onNodeDragStart;
    this.onNodeDragMove = options?.onNodeDragMove;
    this.onNodeDragEnd = options?.onNodeDragEnd;
  }

  removeNode(nodeId: number) {
    const layer = this.nodeLayers.get(nodeId);

    if (!layer) {
      return;
    }

    this.nodeLayerGroup.removeLayer(layer);
    this.nodeLayers.delete(nodeId);
  }

  removeWay(wayId: number) {
    const layer = this.wayLayers.get(wayId);

    if (!layer) {
      return;
    }

    this.wayLayerGroup.removeLayer(layer);
    this.wayLayers.delete(wayId);
  }

  upsertNode(node: NodeSnapshot, selected: boolean) {
    const existingLayer = this.nodeLayers.get(node.id);

    if (!existingLayer) {
      const createdLayer = createNodeLayer(node, selected, {
        onNodeSelect: this.onNodeSelect,
        onNodeDragStart: this.onNodeDragStart,
        onNodeDragMove: this.onNodeDragMove,
        onNodeDragEnd: this.onNodeDragEnd,
      }).addTo(this.nodeLayerGroup);
      this.nodeLayers.set(node.id, createdLayer);
      return;
    }

    updateNodeLayer(existingLayer, node, selected);
  }

  upsertWay(renderedWay: RenderedWay, selected: boolean) {
    const existingLayer = this.wayLayers.get(renderedWay.way.id);

    if (!existingLayer) {
      const createdLayer = createWayLayer(renderedWay, selected, this.onWaySelect).addTo(this.wayLayerGroup);
      this.wayLayers.set(renderedWay.way.id, createdLayer);
      return;
    }

    const needsRecreate =
      (renderedWay.kind === "polygon" && !isPolygonLayer(existingLayer)) ||
      (renderedWay.kind === "polyline" && isPolygonLayer(existingLayer));

    if (needsRecreate) {
      this.wayLayerGroup.removeLayer(existingLayer);
      const recreatedLayer = createWayLayer(renderedWay, selected, this.onWaySelect).addTo(this.wayLayerGroup);
      this.wayLayers.set(renderedWay.way.id, recreatedLayer);
      return;
    }

    updateWayLayer(existingLayer, renderedWay, selected);
  }

  destroy() {
    this.nodeLayerGroup.clearLayers();
    this.wayLayerGroup.clearLayers();
    this.nodeLayerGroup.remove();
    this.wayLayerGroup.remove();
    this.nodeLayers.clear();
    this.wayLayers.clear();
  }
}
