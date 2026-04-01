import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  getVisibleWayVertices,
  toFixedCoordinate,
  type EditorDraft,
  type SelectedEntity,
  type TagRow,
  type WayDraft,
} from "@/lib/editor";
import { cn } from "@/lib/utils";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty";

type EditorSidebarProps = {
  draft: EditorDraft | null;
  isLoading: boolean;
  selectedEntity: SelectedEntity | null;
  onFeatureTypeChange: (value: string) => void;
  onGeometryKindChange: (value: "line" | "area") => void;
  onNodeCoordinateChange: (axis: "x" | "z", value: number) => void;
  onTagChange: (tagId: string, field: "key" | "value", value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tagId: string) => void;
  onReset: () => void;
  onWayVertexDelete: (vertexIndex: number) => void;
  onWayVertexMove: (vertexIndex: number, direction: -1 | 1) => void;
};

const buttonClassName =
  "inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

const secondaryButtonClassName = cn(buttonClassName, "bg-muted text-foreground hover:bg-accent");
const destructiveButtonClassName = cn(
  buttonClassName,
  "border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25",
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-4">
    <header className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {title}
    </header>
    {children}
  </section>
);

const Label = ({ children }: { children: ReactNode }) => (
  <label className="space-y-1.5">
    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </div>
  </label>
);

const TagEditor = ({
  tags,
  onTagChange,
  onAddTag,
  onRemoveTag,
}: {
  tags: TagRow[];
  onTagChange: (tagId: string, field: "key" | "value", value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tagId: string) => void;
}) => {
  return (
    <div className="space-y-3">
      {tags.map((tag) => (
        <div key={tag.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            value={tag.key}
            placeholder="key"
            onChange={(event) => onTagChange(tag.id, "key", event.target.value)}
          />
          <Input
            value={tag.value}
            placeholder="value"
            onChange={(event) => onTagChange(tag.id, "value", event.target.value)}
          />
          <button
            className={destructiveButtonClassName}
            type="button"
            onClick={() => onRemoveTag(tag.id)}
          >
            削除
          </button>
        </div>
      ))}
      <button className={secondaryButtonClassName} type="button" onClick={onAddTag}>
        Tag を追加
      </button>
    </div>
  );
};

const Metadata = ({ draft }: { draft: EditorDraft }) => {
  if (draft.type === "node") {
    return (
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Entity</dt>
        <dd>node/{draft.id}</dd>
        <dt className="text-muted-foreground">Version</dt>
        <dd>{draft.version}</dd>
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Entity</dt>
      <dd>way/{draft.id}</dd>
      <dt className="text-muted-foreground">Version</dt>
      <dd>{draft.version}</dd>
      <dt className="text-muted-foreground">Geometry</dt>
      <dd>{draft.geometryKind}</dd>
    </dl>
  );
};

const WayVerticesSection = ({
  draft,
  onWayVertexDelete,
  onWayVertexMove,
}: {
  draft: WayDraft;
  onWayVertexDelete: (vertexIndex: number) => void;
  onWayVertexMove: (vertexIndex: number, direction: -1 | 1) => void;
}) => {
  const vertices = getVisibleWayVertices(draft);
  const minimumVertices = draft.geometryKind === "area" ? 3 : 2;

  return (
    <Section title="Vertices">
      <div className="space-y-2">
        {vertices.map((vertex, index) => (
          <div
            key={vertex.id}
            className="rounded-lg border border-border/70 bg-background/80 p-3 text-sm shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">
                  #{index + 1} {vertex.nodeId === null ? "new node" : `node/${vertex.nodeId}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  x {toFixedCoordinate(vertex.x)} / z {toFixedCoordinate(vertex.z)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className={secondaryButtonClassName}
                  type="button"
                  disabled={index === 0}
                  onClick={() => onWayVertexMove(index, -1)}
                >
                  ↑
                </button>
                <button
                  className={secondaryButtonClassName}
                  type="button"
                  disabled={index === vertices.length - 1}
                  onClick={() => onWayVertexMove(index, 1)}
                >
                  ↓
                </button>
                <button
                  className={destructiveButtonClassName}
                  type="button"
                  disabled={vertices.length <= minimumVertices}
                  onClick={() => onWayVertexDelete(index)}
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
        頂点をドラッグして移動し、線分を押すとその位置に頂点を追加します。
      </div>
    </Section>
  );
};

export const EditorSidebar = ({
  draft,
  isLoading,
  selectedEntity,
  onFeatureTypeChange,
  onGeometryKindChange,
  onNodeCoordinateChange,
  onTagChange,
  onAddTag,
  onRemoveTag,
  onReset,
  onWayVertexDelete,
  onWayVertexMove,
}: EditorSidebarProps) => {
  if (!selectedEntity) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <Empty className="border-border/70 bg-card/50">
          <EmptyHeader>
            <EmptyTitle>地図から node または way を選択してください。</EmptyTitle>
            <EmptyDescription>選択した要素だけを直接編集します。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (isLoading || !draft) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <Empty className="border-border/70 bg-card/50">
          <EmptyHeader>
            <EmptyTitle>Loading {selectedEntity.type}...</EmptyTitle>
            <EmptyDescription>詳細スナップショットを取得しています。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-4">
        <div className="text-xs uppercase tracking-[0.2em] text-sidebar-foreground/60">Editor</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {draft.type === "node" ? "Node" : "Way"} Inspector
        </h1>
        <p className="mt-1 text-sm text-sidebar-foreground/70">
          render は常に fetched data と local draft の merge 結果を使います。
        </p>
      </div>

      <div className="flex-1 space-y-4 px-5 py-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          node はドラッグ、way は頂点ドラッグと線分クリックで編集できます。
        </div>

        <Section title="Metadata">
          <Metadata draft={draft} />
        </Section>

        <Section title="Basics">
          <div className="space-y-3">
            <Label>Feature Type</Label>
            <Input
              value={draft.featureType}
              onChange={(event) => onFeatureTypeChange(event.target.value)}
            />

            {draft.type === "way" ? (
              <div className="space-y-1.5">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Geometry
                </div>
                <div className="flex gap-2">
                  <button
                    className={cn(
                      secondaryButtonClassName,
                      draft.geometryKind === "line" && "border-primary bg-primary/15 text-primary",
                    )}
                    type="button"
                    onClick={() => onGeometryKindChange("line")}
                  >
                    line
                  </button>
                  <button
                    className={cn(
                      secondaryButtonClassName,
                      draft.geometryKind === "area" && "border-primary bg-primary/15 text-primary",
                    )}
                    type="button"
                    onClick={() => onGeometryKindChange("area")}
                  >
                    area
                  </button>
                </div>
              </div>
            ) : null}

            {draft.type === "node" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    x
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.x}
                    onChange={(event) => onNodeCoordinateChange("x", Number(event.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    z
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.z}
                    onChange={(event) => onNodeCoordinateChange("z", Number(event.target.value))}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </Section>

        {draft.type === "way" ? (
          <WayVerticesSection
            draft={draft}
            onWayVertexDelete={onWayVertexDelete}
            onWayVertexMove={onWayVertexMove}
          />
        ) : null}

        <Section title="Tags">
          <TagEditor
            tags={draft.tags}
            onTagChange={onTagChange}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
          />
        </Section>
      </div>

      <div className="border-t border-sidebar-border px-5 py-4">
        <button className={secondaryButtonClassName} type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </aside>
  );
};
