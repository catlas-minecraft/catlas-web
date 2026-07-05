import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { CatlasEditor, EditorSnapshot } from "@/lib/editor";
import { entityKey, geometryTypeForEntity } from "@/lib/editor/types";
import { EditorChangesReview } from "./editor-changes-review";
import { useEditorSnapshot } from "./use-editor-snapshot";

const CUSTOM_PRESET = "__custom__";

export function EditorInspector({ editor }: { readonly editor: CatlasEditor | null }) {
  if (!editor)
    return <aside className="inspector flex flex-col h-full min-h-0 min-w-0 bg-background" />;
  return <InspectorContent editor={editor} />;
}

function InspectorContent({ editor }: { readonly editor: CatlasEditor }) {
  const snapshot = useEditorSnapshot(editor);
  const key = snapshot.selection ? entityKey(snapshot.selection) : "empty";
  return <Inspector editor={editor} key={key} snapshot={snapshot} />;
}

function Inspector({ editor, snapshot }: { editor: CatlasEditor; snapshot: EditorSnapshot }) {
  const entity = snapshot.selectedEntity;
  const [newTagKey, setNewTagKey] = useState("");
  const [newTagValue, setNewTagValue] = useState("");

  const geometry = entity ? geometryTypeForEntity(entity) : null;
  const presets = geometry ? editor.presets.filter((preset) => preset.geometry === geometry) : [];
  const activePreset = entity
    ? presets.find((preset) => preset.featureType === entity.featureType)
    : undefined;

  if (!entity) {
    return <EditorChangesReview editor={editor} snapshot={snapshot} />;
  }

  const addTag = () => {
    const key = newTagKey.trim();
    if (!key) return;
    editor.updateTag(key, newTagValue);
    setNewTagKey("");
    setNewTagValue("");
  };

  return (
    <aside className="inspector flex flex-col h-full min-h-0 min-w-0 bg-background">
      <header className="inspector__header flex items-start justify-between gap-2 flex-[0_0_auto] min-h-16 border-b border-border p-3 [&>div]:min-w-0">
        <div>
          <span className="eyebrow text-muted-foreground text-[9px] font-[750] tracking-[0.12em] uppercase">
            {geometry}
          </span>
          <h2 className="text-sm font-[650] leading-tight mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
            {activePreset?.label ?? (entity.featureType || "Untyped feature")}
          </h2>
        </div>
        <Badge variant="outline">
          <code>
            {entity.type[0]}
            {entity.id}
          </code>
        </Badge>
      </header>

      <div className="inspector__body min-h-0 overflow-y-auto overscroll-contain">
        <InspectorSection title="Feature">
          <FieldGroup className="property-list gap-2">
            <Field
              className="property-row items-center grid gap-2 grid-cols-[minmax(64px,80px)_minmax(0,1fr)]"
              orientation="horizontal"
            >
              <FieldLabel
                className="text-muted-foreground text-[11px] min-w-0"
                htmlFor="feature-preset"
              >
                Preset
              </FieldLabel>
              <Select
                onValueChange={(presetId) => {
                  if (presetId !== CUSTOM_PRESET) editor.applyPreset(presetId);
                }}
                value={activePreset?.id ?? CUSTOM_PRESET}
              >
                <SelectTrigger className="w-full h-7 min-w-0" id="feature-preset" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={CUSTOM_PRESET}>Custom</SelectItem>
                    {presets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field
              className="property-row items-center grid gap-2 grid-cols-[minmax(64px,80px)_minmax(0,1fr)]"
              orientation="horizontal"
            >
              <FieldLabel
                className="text-muted-foreground text-[11px] min-w-0"
                htmlFor="feature-type"
              >
                Type
              </FieldLabel>
              <Input
                className="h-7 min-w-0 w-full"
                defaultValue={entity.featureType}
                id="feature-type"
                key={`${entity.type}-${entity.id}-feature-${entity.featureType}`}
                onBlur={(event) => editor.updateFeatureType(event.target.value.trim())}
              />
            </Field>
            {entity.type === "node" ? (
              <Field
                className="property-row items-center grid gap-2 grid-cols-[minmax(64px,80px)_minmax(0,1fr)]"
                orientation="horizontal"
              >
                <FieldLabel
                  className="text-muted-foreground text-[11px] min-w-0"
                  htmlFor="node-height"
                >
                  Height
                </FieldLabel>
                <Input
                  className="h-7 min-w-0 w-full"
                  defaultValue={entity.geom.y}
                  id="node-height"
                  key={`node-${entity.id}-y-${entity.geom.y}`}
                  onBlur={(event) => editor.updateSelectedY(Number(event.target.value))}
                  step="0.5"
                  type="number"
                />
              </Field>
            ) : null}
          </FieldGroup>
        </InspectorSection>

        {activePreset?.fields.length ? (
          <>
            <Separator />
            <InspectorSection title="Details">
              <FieldGroup className="property-list gap-2">
                {activePreset.fields.map((field) => (
                  <Field
                    className="property-row items-center grid gap-2 grid-cols-[minmax(64px,80px)_minmax(0,1fr)]"
                    key={field.key}
                    orientation="horizontal"
                  >
                    <FieldLabel
                      className="text-muted-foreground text-[11px] min-w-0"
                      htmlFor={`preset-field-${field.key}`}
                    >
                      {field.label}
                    </FieldLabel>
                    <Input
                      className="h-7 min-w-0 w-full"
                      defaultValue={entity.tags[field.key] ?? ""}
                      id={`preset-field-${field.key}`}
                      key={`${entityKey(entity)}-${field.key}-${entity.tags[field.key] ?? ""}`}
                      onBlur={(event) => editor.updateTag(field.key, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  </Field>
                ))}
              </FieldGroup>
            </InspectorSection>
          </>
        ) : null}

        <Separator />
        <InspectorSection title="All tags">
          <div className="tag-list grid gap-[6px]">
            {Object.entries(entity.tags).map(([key, value]) => (
              <div
                className="tag-row items-center grid gap-[5px] grid-cols-[minmax(54px,72px)_minmax(0,1fr)_24px]"
                key={key}
              >
                <code
                  className="text-muted-foreground text-[10px] overflow-hidden text-ellipsis whitespace-nowrap"
                  title={key}
                >
                  {key}
                </code>
                <Input
                  className="h-7 min-w-0 w-full"
                  aria-label={`${key} value`}
                  defaultValue={value}
                  key={`${entityKey(entity)}-${key}-${value}`}
                  onBlur={(event) => editor.updateTag(key, event.target.value)}
                />
                <Button
                  aria-label={`Remove ${key}`}
                  onClick={() => editor.removeTag(key)}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </div>
            ))}
            {Object.keys(entity.tags).length === 0 ? (
              <Empty className="tag-list__empty flex-none min-h-[52px] p-3 border-0">
                <EmptyHeader>
                  <EmptyDescription>No tags yet.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
          </div>
          <FieldGroup className="tag-add items-end grid gap-[5px] grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] mt-2">
            <Field className="gap-0 min-w-0">
              <FieldLabel className="sr-only" htmlFor="new-tag-key">
                New tag key
              </FieldLabel>
              <Input
                className="h-7 min-w-0 w-full"
                id="new-tag-key"
                onChange={(event) => setNewTagKey(event.target.value)}
                placeholder="key"
                value={newTagKey}
              />
            </Field>
            <Field className="gap-0 min-w-0">
              <FieldLabel className="sr-only" htmlFor="new-tag-value">
                New tag value
              </FieldLabel>
              <Input
                className="h-7 min-w-0 w-full"
                id="new-tag-value"
                onChange={(event) => setNewTagValue(event.target.value)}
                placeholder="value"
                value={newTagValue}
              />
            </Field>
            <Button disabled={!newTagKey.trim()} onClick={addTag} size="sm" type="button">
              <PlusIcon data-icon="inline-start" />
              Add
            </Button>
          </FieldGroup>
        </InspectorSection>
      </div>
    </aside>
  );
}

function InspectorSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="form-section p-3">
      <h3 className="text-[11px] font-[650] mb-2.5 mt-0">{title}</h3>
      {children}
    </section>
  );
}
