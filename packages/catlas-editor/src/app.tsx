import { useEffect, useRef, useState } from "react";
import type { Layout } from "react-resizable-panels";
import "./App.css";
import { EditorInspector } from "./components/editor/editor-inspector";
import { EditorMapOverlays } from "./components/editor/editor-map-overlays";
import { EditorToolRail, EditorTopBar } from "./components/editor/editor-toolbar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
import { CatlasEditor } from "./lib/editor";

const INSPECTOR_LAYOUT_STORAGE_KEY = "catlas-editor:inspector-layout";
const CANVAS_PANEL_ID = "canvas";
const INSPECTOR_PANEL_ID = "inspector";

const readStoredLayout = (): Layout | undefined => {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(INSPECTOR_LAYOUT_STORAGE_KEY) ?? "null",
    );
    if (
      !value ||
      typeof value !== "object" ||
      !(CANVAS_PANEL_ID in value) ||
      !(INSPECTOR_PANEL_ID in value)
    ) {
      return undefined;
    }

    const layout = value as Layout;
    return Number.isFinite(layout[CANVAS_PANEL_ID]) && Number.isFinite(layout[INSPECTOR_PANEL_ID])
      ? layout
      : undefined;
  } catch {
    return undefined;
  }
};

const storeLayout = (layout: Layout) => {
  try {
    window.localStorage.setItem(INSPECTOR_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Resizing should still work when storage is unavailable.
  }
};

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<CatlasEditor | null>(null);
  const [defaultLayout] = useState(readStoredLayout);

  useEffect(() => {
    if (!mapRef.current) return;
    const nextEditor = new CatlasEditor(mapRef.current);
    setEditor(nextEditor);
    return () => {
      setEditor(null);
      nextEditor.dispose();
    };
  }, []);

  return (
    <div className="editor-shell grid grid-rows-[44px_minmax(0,1fr)] h-dvh w-screen overflow-hidden bg-background text-foreground">
      <EditorTopBar editor={editor} />
      <div className="editor-body grid grid-cols-[48px_minmax(0,1fr)] min-h-0 min-w-0">
        <EditorToolRail editor={editor} />
        <ResizablePanelGroup
          defaultLayout={defaultLayout}
          id="catlas-editor-workspace"
          onLayoutChanged={storeLayout}
          orientation="horizontal"
        >
          <ResizablePanel id={CANVAS_PANEL_ID} minSize={360}>
            <main className="workspace relative h-full min-h-0 min-w-0 overflow-hidden">
              <div className="map-frame relative h-full min-h-0 min-w-0 overflow-hidden">
                <div
                  className="map-pane absolute inset-0 overflow-hidden bg-editor-canvas"
                  ref={mapRef}
                />
                <EditorMapOverlays editor={editor} />
              </div>
            </main>
          </ResizablePanel>
          <ResizableHandle className="inspector-resize-handle bg-border transition-colors duration-150 ease z-[11] hover:bg-editor-selection focus-visible:bg-editor-selection" />
          <ResizablePanel
            defaultSize={300}
            groupResizeBehavior="preserve-pixel-size"
            id={INSPECTOR_PANEL_ID}
            maxSize={420}
            minSize={240}
          >
            <EditorInspector editor={editor} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
