import { Redo2Icon, Trash2Icon, Undo2Icon } from "lucide-react";
import { AuthControl } from "@/components/editor/auth-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CatlasEditor, EditorMode } from "@/lib/editor";
import { useEditorSnapshot } from "./use-editor-snapshot";

const MODE_BUTTONS: readonly { mode: EditorMode; label: string; shortcut: string }[] = [
  { mode: "browse", label: "Browse", shortcut: "Esc" },
  { mode: "add-point", label: "Point", shortcut: "1" },
  { mode: "draw-line", label: "Line", shortcut: "2" },
  { mode: "draw-area", label: "Area", shortcut: "3" },
];

export function EditorToolbar({ editor }: { readonly editor: CatlasEditor | null }) {
  if (!editor) return <div className="toolbar toolbar--loading" />;
  return <ToolbarContent editor={editor} />;
}

function ToolbarContent({ editor }: { readonly editor: CatlasEditor }) {
  const snapshot = useEditorSnapshot(editor);
  const deleteOperation = editor.operation("delete");

  return (
    <div className="toolbar" aria-label="Editing tools">
      <div className="toolbar__brand">
        <span className="toolbar__mark">C</span>
        <span>Catlas Editor</span>
      </div>

      <ToggleGroup
        aria-label="Editor mode"
        onValueChange={(mode) => {
          if (mode) editor.setMode(mode as EditorMode);
        }}
        spacing={0}
        type="single"
        value={snapshot.mode}
        variant="outline"
      >
        {MODE_BUTTONS.map(({ mode, label, shortcut }) => (
          <ToggleGroupItem
            aria-label={`${label} mode`}
            key={mode}
            title={`${label} (${shortcut})`}
            value={mode}
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Separator className="h-7" orientation="vertical" />

      <ButtonGroup>
        <Button
          aria-label="Undo"
          disabled={!snapshot.canUndo}
          onClick={() => editor.undo()}
          size="icon"
          title="Undo"
          type="button"
          variant="outline"
        >
          <Undo2Icon data-icon="inline-start" />
        </Button>
        <Button
          aria-label="Redo"
          disabled={!snapshot.canRedo}
          onClick={() => editor.redo()}
          size="icon"
          title="Redo"
          type="button"
          variant="outline"
        >
          <Redo2Icon data-icon="inline-start" />
        </Button>
        <Button
          aria-label="Delete selected feature"
          disabled={!deleteOperation.available}
          onClick={deleteOperation.execute}
          size="icon"
          title={deleteOperation.disabledReason ?? deleteOperation.label}
          type="button"
          variant="destructive"
        >
          <Trash2Icon data-icon="inline-start" />
        </Button>
      </ButtonGroup>

      <div className="toolbar__spacer" />
      <Badge className="toolbar__status" variant={snapshot.dirty ? "secondary" : "outline"}>
        {snapshot.loading ? <Spinner /> : <span className="status-dot" />}
        {snapshot.loading ? "Loading viewport" : snapshot.dirty ? "Unsaved changes" : "Up to date"}
      </Badge>
      <AuthControl editor={editor} snapshot={snapshot} />
    </div>
  );
}
