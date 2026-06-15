import { useEffect, useRef, useState } from "react";
import "./App.css";
import { EditorInspector } from "./components/editor/editor-inspector";
import { EditorMapOverlays } from "./components/editor/editor-map-overlays";
import { EditorSavePanel } from "./components/editor/editor-save-panel";
import { EditorToolbar } from "./components/editor/editor-toolbar";
import { CatlasEditor } from "./lib/editor";

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<CatlasEditor | null>(null);

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
    <div className="editor-shell">
      <EditorToolbar editor={editor} />
      <main className="workspace">
        <EditorInspector editor={editor} />
        <div className="map-frame">
          <div className="map-pane" ref={mapRef} />
          <EditorMapOverlays editor={editor} />
        </div>
      </main>
      <EditorSavePanel editor={editor} />
    </div>
  );
}
