import {
  AlertCircleIcon,
  CheckCircle2Icon,
  GitMergeIcon,
  PencilLineIcon,
  RotateCwIcon,
  Trash2Icon,
} from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Spinner } from "@/components/ui/spinner";
import type { CatlasEditor, EditorSnapshot } from "@/lib/editor";
import { entityKey } from "@/lib/editor/types";
import { useEditorSnapshot } from "./use-editor-snapshot";
import { Separator } from "../ui/separator";

export function EditorMapOverlays({ editor }: { readonly editor: CatlasEditor | null }) {
  if (!editor) {
    return (
      <div className="editor-loading">
        <span className="loading-mark">C</span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Starting editor
        </div>
      </div>
    );
  }
  return <MapOverlayContent editor={editor} />;
}

function MapOverlayContent({ editor }: { readonly editor: CatlasEditor }) {
  const snapshot = useEditorSnapshot(editor);
  return (
    <>
      <DraftControls editor={editor} snapshot={snapshot} />
      <StatusOverlay editor={editor} snapshot={snapshot} />
      <EditorContextMenu editor={editor} snapshot={snapshot} />
      <div className="coordinate-hint">
        {snapshot.cursor
          ? `X ${formatCoordinate(snapshot.cursor.x)}  Z ${formatCoordinate(snapshot.cursor.z)}`
          : "X --  Z --"}
      </div>
    </>
  );
}

const formatCoordinate = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

function EditorContextMenu({
  editor,
  snapshot,
}: {
  editor: CatlasEditor;
  snapshot: EditorSnapshot;
}) {
  const contextMenu = snapshot.contextMenu;
  if (!contextMenu) return null;

  const targetEntity = contextMenu.targetEntity;
  const deleteOperation = contextMenu.target
    ? editor.operation("delete", contextMenu.target)
    : null;
  const joinOperation =
    targetEntity?.type === "way" &&
    targetEntity.geometryKind === "line" &&
    snapshot.selectedEntity?.type === "way" &&
    snapshot.selectedEntity.geometryKind === "line"
      ? editor.operation("join", contextMenu.target)
      : null;

  return (
    <div
      aria-label="Editor context menu"
      className="editor-context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {targetEntity ? (
        <div className="editor-context-menu__target">
          <div className="editor-context-menu__title">{formatEntityKind(targetEntity)}</div>
          <div className="editor-context-menu__meta">
            <code>{entityKey(targetEntity)}</code>
            <span>{targetEntity.featureType || "Untyped feature"}</span>
          </div>
        </div>
      ) : (
        <div className="editor-context-menu__title">Nothing here</div>
      )}
      <Separator />
      {joinOperation ? (
        <Button
          className="editor-context-menu__item"
          disabled={!joinOperation.available}
          onClick={joinOperation.execute}
          size="sm"
          title={joinOperation.disabledReason ?? joinOperation.label}
          type="button"
          variant="ghost"
        >
          <GitMergeIcon data-icon="inline-start" />
          {joinOperation.label}
        </Button>
      ) : null}
      {deleteOperation ? (
        <Button
          className="editor-context-menu__item "
          disabled={!deleteOperation.available}
          onClick={deleteOperation.execute}
          size="sm"
          title={deleteOperation.disabledReason ?? deleteOperation.label}
          type="button"
          variant="destructive"
        >
          <Trash2Icon data-icon="inline-start" />
          {deleteOperation.label}
        </Button>
      ) : null}
      <Separator />
      <div className="editor-context-menu__coords">
        X {formatCoordinate(contextMenu.world.x)}&nbsp;&nbsp; Z{" "}
        {formatCoordinate(contextMenu.world.z)}
      </div>
    </div>
  );
}

const formatEntityKind = (entity: NonNullable<EditorSnapshot["contextMenu"]>["targetEntity"]) => {
  if (!entity) return "Feature";
  if (entity.type === "node") return "Node";
  return entity.geometryKind === "line" ? "Line" : "Area";
};

function DraftControls({ editor, snapshot }: { editor: CatlasEditor; snapshot: EditorSnapshot }) {
  if (!snapshot.drawing) return null;
  const minimum = snapshot.drawing.geometryKind === "area" ? 3 : 2;
  const canFinish = snapshot.drawing.vertices.length >= minimum;

  return (
    <Alert className="draft-controls pr-36">
      <PencilLineIcon />
      <AlertTitle>Drawing {snapshot.drawing.geometryKind}</AlertTitle>
      <AlertDescription>{snapshot.drawing.vertices.length} vertices</AlertDescription>
      <AlertAction>
        <ButtonGroup>
          <Button
            disabled={!canFinish}
            onClick={() => editor.finishDrawing()}
            size="sm"
            type="button"
          >
            Finish
          </Button>
          <Button onClick={() => editor.cancelDrawing()} size="sm" type="button" variant="outline">
            Cancel
          </Button>
        </ButtonGroup>
      </AlertAction>
    </Alert>
  );
}

function StatusOverlay({ editor, snapshot }: { editor: CatlasEditor; snapshot: EditorSnapshot }) {
  const message = snapshot.loadError
    ? snapshot.loadError
    : snapshot.save.status === "error" || snapshot.save.status === "saved"
      ? snapshot.save.message
      : null;
  const issue = snapshot.issues[0];

  if (!message && !issue) return null;
  const isError =
    Boolean(snapshot.loadError) || snapshot.save.status === "error" || issue?.severity === "error";

  return (
    <Alert className="notice" variant={isError ? "destructive" : "default"}>
      {isError ? <AlertCircleIcon /> : <CheckCircle2Icon />}
      <AlertTitle>
        {message ? (isError ? "Request needs attention" : "Saved") : issue?.severity}
      </AlertTitle>
      <AlertDescription>{message ?? issue?.message}</AlertDescription>
      {snapshot.loadError ? (
        <AlertAction>
          <Button onClick={() => editor.reload()} size="sm" type="button" variant="outline">
            <RotateCwIcon data-icon="inline-start" />
            Retry
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}
