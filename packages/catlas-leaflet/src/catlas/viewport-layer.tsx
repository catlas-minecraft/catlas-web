import { useLeaflet } from "../leaflet/context/map.ts";
import { Control } from "../leaflet/control.tsx";
import { circleMarker, polygon, polyline, type LatLngTuple } from "leaflet";
import { useCallback, useEffect, useState } from "react";
import { useLeafletMapEvent } from "../leaflet/hooks/useLeafletEvent.ts";
import { useQuery } from "@tanstack/react-query";

import { LayerGroup } from "../leaflet/layer/layer-group.tsx";
import { useLayerGroup } from "../leaflet/layer/context/layerGroup.ts";

type Point3D = {
  x: number;
  y: number;
  z: number;
};

type NodeSnapshot = {
  id: number;
  geom: Point3D;
  featureType: string;
  tags: Record<string, string>;
  deletedAt: number | null;
};

type WaySnapshot = {
  id: number;
  featureType: string;
  geometryKind: "line" | "area";
  isClosed: boolean;
  tags: Record<string, string>;
  deletedAt: number | null;
};

type WayNodeSnapshot = {
  id: number;
  wayId: number;
  nodeId: number;
  seq: number;
};

type RelationSnapshot = {
  id: number;
  deletedAt: number | null;
};

type ViewportSnapshot = {
  nodes: NodeSnapshot[];
  ways: WaySnapshot[];
  wayNodes: WayNodeSnapshot[];
  relations: RelationSnapshot[];
};

type ViewportLayerProps = {
  includeRelations?: boolean;
  url?: string | URL;
};

const formatBbox = (map: L.Map) => {
  const bounds = map.getBounds();
  const minX = bounds.getWest();
  const minZ = bounds.getSouth();
  const maxX = bounds.getEast();
  const maxZ = bounds.getNorth();

  return [minX, minZ, maxX, maxZ] as const;
};

const toLatLng = (geom: Point3D): LatLngTuple => [geom.z, geom.x];

const toFeatureLabel = (featureType: string, id: number) => `${featureType} #${id}`;

export const ViewportLayer = (props: ViewportLayerProps) => {
  return (
    <LayerGroup>
      <ViewportLayerInner {...props} />
    </LayerGroup>
  );
};

const ViewportLayerInner = ({
  includeRelations = false,
  url = "//viewport",
}: ViewportLayerProps) => {
  const { map } = useLeaflet();
  const { layerGroup: vectorLayer } = useLayerGroup();
  const [currentBbox, setCurrentBbox] = useState<readonly [number, number, number, number]>(() =>
    formatBbox(map),
  );

  const snapshot = useQuery({
    queryKey: ["viewport"],
    queryFn: async () => {
      const parsedUrl = new URL(url, window.location.href);
      parsedUrl.searchParams.set("bbox", currentBbox.join(","));

      if (includeRelations) {
        parsedUrl.searchParams.set("includeRelations", "true");
      }

      const response = await fetch(parsedUrl);

      if (!response.ok) {
        throw new Error(`Viewport request failed: ${response.status}`);
      }

      return (await response.json()) as ViewportSnapshot;
    },
  });

  const handleMoveEnd = useCallback(() => {
    const bbox = formatBbox(map);
    setCurrentBbox(bbox);
  }, []);

  useLeafletMapEvent(
    {
      moveend: handleMoveEnd,
    },
    [handleMoveEnd],
  );

  useEffect(() => {
    void snapshot.refetch().then(({ data: snapshot }) => {
      if (snapshot === undefined) return;

      vectorLayer.clearLayers();

      const visibleNodes = snapshot.nodes.filter((node) => node.deletedAt === null);
      const visibleWays = snapshot.ways.filter((way) => way.deletedAt === null);

      const nodesById = new Map(visibleNodes.map((node) => [node.id, node]));
      const wayNodesByWayId = new Map<number, WayNodeSnapshot[]>();
      const usedNodeIds = new Set<number>();

      for (const wayNode of snapshot.wayNodes) {
        const current = wayNodesByWayId.get(wayNode.wayId) ?? [];
        current.push(wayNode);
        wayNodesByWayId.set(wayNode.wayId, current);
      }

      for (const way of visibleWays) {
        const orderedWayNodes = (wayNodesByWayId.get(way.id) ?? []).sort((a, b) => a.seq - b.seq);
        const coordinates = orderedWayNodes.flatMap((wayNode) => {
          const node = nodesById.get(wayNode.nodeId);

          if (!node) {
            return [];
          }

          usedNodeIds.add(node.id);
          return [toLatLng(node.geom)];
        });

        if (coordinates.length < 2) {
          continue;
        }

        const layer =
          way.geometryKind === "area" && coordinates.length >= 3
            ? polygon(coordinates, {
                color: "#f97316",
                weight: 2,
                fillColor: "#fb923c",
                fillOpacity: 0.2,
              })
            : polyline(coordinates, {
                color: "#f97316",
                weight: 3,
                opacity: 0.95,
              });

        layer.bindTooltip(toFeatureLabel(way.featureType, way.id));
        layer.addTo(vectorLayer);
      }

      for (const node of visibleNodes) {
        const marker = circleMarker(toLatLng(node.geom), {
          radius: usedNodeIds.has(node.id) ? 3 : 5,
          color: "#0f172a",
          weight: 1,
          fillColor: usedNodeIds.has(node.id) ? "#38bdf8" : "#22c55e",
          fillOpacity: 0.95,
        });

        marker.bindTooltip(toFeatureLabel(node.featureType, node.id));
        marker.addTo(vectorLayer);
      }
    });
  }, [vectorLayer, currentBbox]);

  const relationCount =
    snapshot.data?.relations.filter((relation) => relation.deletedAt === null).length ?? 0;

  return (
    <Control position="topleft">
      <div className="rounded-md border border-slate-300/80 bg-white/90 px-3 py-2 text-xs text-slate-900 shadow-sm backdrop-blur">
        <div className="font-medium">Viewport Layer</div>
        <div>
          {snapshot.isPending ? "loading..." : "ready"}
          {snapshot.error ? ` / ${snapshot.error}` : ""}
        </div>
        <div>
          nodes: {snapshot.data?.nodes.length ?? 0} / ways: {snapshot.data?.ways.length ?? 0} /
          relations: {relationCount}
        </div>
        <div className="max-w-72 truncate text-slate-600">bbox: {currentBbox || "-"}</div>
      </div>
    </Control>
  );
};
