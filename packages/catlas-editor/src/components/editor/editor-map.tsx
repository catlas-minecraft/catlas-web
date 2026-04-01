import { CircleMarker, LayerGroup, Marker, Polygon, Polyline, useLeaflet } from "@catlas/leaflet";
import type { LeafletEventHandlerFnMap, LeafletMouseEvent } from "leaflet";
import { divIcon, type DragEndEvent } from "leaflet";
import { useEffect, useMemo } from "react";
import {
  geometryFromDraft,
  getVisibleWayVertices,
  type EditorDraft,
  type NormalizedViewport,
  type SelectedEntity,
  type WayDraft,
} from "@/lib/editor";

type EditorMapProps = {
  viewport: NormalizedViewport;
  selectedEntity: SelectedEntity | null;
  draft: EditorDraft | null;
  onSelectEntity: (selection: SelectedEntity | null) => void;
  onViewportChange: (bounds: L.LatLngBounds) => void;
  onNodeDragStart: () => void;
  onNodeDragMove: (coordinate: { x: number; z: number }) => void;
  onNodeDragEnd: (coordinate: { x: number; z: number }) => void;
  onWayVertexDragStart: (index: number) => void;
  onWayVertexDragMove: (index: number, coordinate: { x: number; z: number }) => void;
  onWayVertexDragEnd: (index: number, coordinate: { x: number; z: number }) => void;
  onWayVertexInsert: (index: number, coordinate: { x: number; z: number }) => void;
};

const toPosition = (coordinate: { x: number; z: number }) => [coordinate.z, coordinate.x] as [number, number];

const nodeHandleIcon = divIcon({
  className: "editor-handle editor-handle-node",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const vertexHandleIcon = divIcon({
  className: "editor-handle editor-handle-vertex",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const selectedNodeStyle = {
  radius: 7,
  color: "#f8fafc",
  weight: 2,
  fillColor: "#10b981",
  fillOpacity: 1,
};

const baseNodeStyle = {
  radius: 5,
  color: "#0f172a",
  weight: 1,
  fillColor: "#22c55e",
  fillOpacity: 0.95,
};

const wayEventHandlers = (onClick: () => void): LeafletEventHandlerFnMap => ({
  click: onClick,
});

const renderWay = (
  way: NormalizedViewport["renderedWays"][number],
  isSelected: boolean,
  onSelect: () => void,
) => {
  if (way.geometryKind === "area" && way.coordinates.length >= 3) {
    return (
      <Polygon
        key={`way-${way.id}`}
        positions={way.coordinates}
        color={isSelected ? "#fb7185" : "#f97316"}
        weight={isSelected ? 4 : 3}
        opacity={1}
        fillColor={isSelected ? "#fb7185" : "#fb923c"}
        fillOpacity={isSelected ? 0.22 : 0.18}
        eventHandlers={wayEventHandlers(onSelect)}
      />
    );
  }

  return (
    <Polyline
      key={`way-${way.id}`}
      positions={way.coordinates}
      color={isSelected ? "#fb7185" : "#f97316"}
      weight={isSelected ? 4 : 3}
      opacity={0.95}
      eventHandlers={wayEventHandlers(onSelect)}
    />
  );
};

const getSegmentPositions = (draft: WayDraft) => {
  const vertices = getVisibleWayVertices(draft);
  const positions = vertices.map((vertex) => toPosition(vertex));
  const segmentCount = draft.isClosed ? positions.length : positions.length - 1;

  return Array.from({ length: Math.max(segmentCount, 0) }, (_, index) => ({
    index,
    positions: [positions[index]!, positions[(index + 1) % positions.length]!] as [
      [number, number],
      [number, number],
    ],
  }));
};

export const EditorMap = ({
  viewport,
  selectedEntity,
  draft,
  onSelectEntity,
  onViewportChange,
  onNodeDragStart,
  onNodeDragMove,
  onNodeDragEnd,
  onWayVertexDragStart,
  onWayVertexDragMove,
  onWayVertexDragEnd,
  onWayVertexInsert,
}: EditorMapProps) => {
  const { map } = useLeaflet();

  useEffect(() => {
    const handleViewportUpdate = () => {
      onViewportChange(map.getBounds());
    };

    handleViewportUpdate();
    map.on({
      moveend: handleViewportUpdate,
      resize: handleViewportUpdate,
    });

    return () => {
      map.off({
        moveend: handleViewportUpdate,
        resize: handleViewportUpdate,
      });
    };
  }, [map, onViewportChange]);

  const selectedWayDraft = useMemo(() => (draft?.type === "way" ? draft : null), [draft]);

  return (
    <>
      <LayerGroup>
        {viewport.renderedWays.map((way) =>
          renderWay(
            way,
            selectedEntity?.type === "way" && selectedEntity.id === way.id,
            () => onSelectEntity({ type: "way", id: way.id }),
          ),
        )}

        {viewport.renderedNodes.map((node) => (
          <CircleMarker
            key={`node-${node.id}`}
            position={node.coordinate}
            {...(selectedEntity?.type === "node" && selectedEntity.id === node.id
              ? selectedNodeStyle
              : baseNodeStyle)}
            eventHandlers={{
              click: () => onSelectEntity({ type: "node", id: node.id }),
            }}
          />
        ))}
      </LayerGroup>

      {draft?.type === "node" ? (
        <LayerGroup>
          <Marker
            position={toPosition(draft)}
            draggable={true}
            icon={nodeHandleIcon}
            zIndexOffset={700}
            eventHandlers={{
              dragstart: () => onNodeDragStart(),
              drag: (event) => {
                const marker = (event as DragEndEvent).target;
                const latlng = marker.getLatLng();
                onNodeDragMove({ x: latlng.lng, z: latlng.lat });
              },
              dragend: (event) => {
                const marker = (event as DragEndEvent).target;
                const latlng = marker.getLatLng();
                onNodeDragEnd({ x: latlng.lng, z: latlng.lat });
              },
            }}
          />
        </LayerGroup>
      ) : null}

      {selectedWayDraft ? (
        <LayerGroup>
          <Polyline
            positions={geometryFromDraft(selectedWayDraft)}
            color="#38bdf8"
            weight={2}
            opacity={0.85}
            dashArray="6 6"
            interactive={false}
          />

          {getVisibleWayVertices(selectedWayDraft).map((vertex, index) => (
            <Marker
              key={`way-handle-${selectedWayDraft.id}-${vertex.id}`}
              position={toPosition(vertex)}
              draggable={true}
              icon={vertex.isNew ? nodeHandleIcon : vertexHandleIcon}
              zIndexOffset={700}
              eventHandlers={{
                dragstart: () => onWayVertexDragStart(index),
                drag: (event) => {
                  const marker = (event as DragEndEvent).target;
                  const latlng = marker.getLatLng();
                  onWayVertexDragMove(index, { x: latlng.lng, z: latlng.lat });
                },
                dragend: (event) => {
                  const marker = (event as DragEndEvent).target;
                  const latlng = marker.getLatLng();
                  onWayVertexDragEnd(index, { x: latlng.lng, z: latlng.lat });
                },
              }}
            />
          ))}

          {getSegmentPositions(selectedWayDraft).map((segment) => (
            <Polyline
              key={`way-hit-${selectedWayDraft.id}-${segment.index}`}
              positions={segment.positions}
              color="#000000"
              opacity={0}
              weight={22}
              eventHandlers={{
                click: (event) => {
                  const mouseEvent = event as LeafletMouseEvent;
                  onWayVertexInsert(segment.index + 1, {
                    x: mouseEvent.latlng.lng,
                    z: mouseEvent.latlng.lat,
                  });
                },
              }}
            />
          ))}
        </LayerGroup>
      ) : null}
    </>
  );
};
