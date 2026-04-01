import type { ViewportSnapshot } from "@catlas/domain";
import { useLeaflet } from "@catlas/leaflet";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapEditor, type EditorChanges } from "@/lib/editor/editor";
import type { SelectedEntity } from "@/lib/editor/viewport-projector";

type ViewportMapEditorProps = {
  onStatusChange?: (status: {
    bbox: readonly [number, number, number, number];
    isFetching: boolean;
    error: string | null;
    selectedEntity: SelectedEntity;
    changes: EditorChanges;
  }) => void;
  onRerenderReady?: (rerender: (() => void) | null) => void;
};

const formatBbox = (map: L.Map) => {
  const bounds = map.getBounds();
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as const;
};

const fetchViewport = async (bbox: readonly [number, number, number, number]) => {
  const parsedUrl = new URL("/viewport", window.location.href);
  parsedUrl.searchParams.set("bbox", bbox.join(","));

  const response = await fetch(parsedUrl, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Viewport request failed: ${response.status}`);
  }

  return (await response.json()) as ViewportSnapshot;
};

export const ViewportMapEditor = ({ onStatusChange, onRerenderReady }: ViewportMapEditorProps) => {
  const { map } = useLeaflet();
  const editorRef = useRef<MapEditor | null>(null);
  const [bbox, setBbox] = useState<readonly [number, number, number, number]>(() => formatBbox(map));
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [changes, setChanges] = useState<EditorChanges>({
    dirtyNodes: [],
    dirtyWays: [],
  });

  useEffect(() => {
    const editor = new MapEditor(map, {
      onSelectionChange: setSelectedEntity,
      onChangesChange: setChanges,
    });
    editorRef.current = editor;
    onRerenderReady?.(() => editor.rerender());

    return () => {
      onRerenderReady?.(null);
      editor.destroy();
      editorRef.current = null;
    };
  }, [map, onRerenderReady]);

  useEffect(() => {
    const handleViewportChange = () => {
      setBbox(formatBbox(map));
    };
    const handleMapClick = () => {
      editorRef.current?.clearSelection();
    };

    map.on({
      click: handleMapClick,
      moveend: handleViewportChange,
      resize: handleViewportChange,
    });

    return () => {
      map.off({
        click: handleMapClick,
        moveend: handleViewportChange,
        resize: handleViewportChange,
      });
    };
  }, [map]);

  const viewportQuery = useQuery({
    queryKey: ["editor-viewport", bbox],
    queryFn: () => fetchViewport(bbox),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (!viewportQuery.data || !editorRef.current) {
      return;
    }

    editorRef.current.patchViewportData(viewportQuery.data);
  }, [viewportQuery.data]);

  const status = useMemo(
    () => ({
      bbox,
      isFetching: viewportQuery.isFetching,
      error: viewportQuery.error instanceof Error ? viewportQuery.error.message : null,
      selectedEntity,
      changes,
    }),
    [bbox, changes, selectedEntity, viewportQuery.error, viewportQuery.isFetching],
  );

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  return null;
};
