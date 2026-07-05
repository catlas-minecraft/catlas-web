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
      <div className="editor-loading absolute inset-0 flex flex-col items-center justify-center gap-3">
        <span className="loading-mark inline-flex items-center justify-center bg-foreground text-background rounded-sm font-extrabold h-10 w-10">
          C
        </span>
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
      <div className="coordinate-hint absolute bottom-2.5 right-2.5 z-[8] px-1.5 py-1 rounded-sm bg-foreground/82 text-background font-mono text-[10px]">
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
      className="editor-context-menu flex flex-col gap-2 absolute min-w-29 p-[7px_8px] z-18 rounded-sm border border-border bg-popover/98 text-popover-foreground shadow-[0_12px_30px_color-mix(in_oklab,var(--foreground)_16%,transparent)] select-none translate-x-0.5 translate-y-0.5"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {targetEntity ? (
        <div className="editor-context-menu__target mb-0.5 min-w-0">
          <div className="editor-context-menu__title text-xs font-[650] leading-tight">
            {formatEntityKind(targetEntity)}
          </div>
          <div className="editor-context-menu__meta flex items-center gap-1.25 text-muted-foreground text-[10px] leading-[1.35] mt-0.5 min-w-0">
            <code className="font-mono">{entityKey(targetEntity)}</code>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {targetEntity.featureType || "Untyped feature"}
            </span>
          </div>
        </div>
      ) : (
        <div className="editor-context-menu__title text-xs font-[650] leading-tight">
          Nothing here
        </div>
      )}
      <Separator />

      {joinOperation ? (
        <Button
          className="editor-context-menu__item h-7 justify-start mt-1 px-1.5 w-full"
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
          className="editor-context-menu__item h-7 justify-start mt-1 px-1.5 w-full"
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
      <div className="editor-context-menu__coords text-muted-foreground font-mono text-[10px] leading-[1.4] mt-0.75 whitespace-nowrap">
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
    <Alert className="draft-controls absolute top-3 left-1/2 z-15 max-w-[min(480px,calc(100%-28px))] w-max -translate-x-1/2 pr-36 bg-popover/96 border border-border shadow-[0_10px_30px_color-mix(in_oklab,var(--foreground)_14%,transparent)]">
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
    <Alert
      className="notice absolute bottom-3.5 left-3.5 z-15 max-w-[min(420px,calc(100%-28px))] bg-popover/96 border border-border shadow-[0_10px_30px_color-mix(in_oklab,var(--foreground)_14%,transparent)]"
      variant={isError ? "destructive" : "default"}
    >
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
