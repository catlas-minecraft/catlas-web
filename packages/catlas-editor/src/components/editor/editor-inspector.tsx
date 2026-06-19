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
  if (!editor) return <aside className="inspector" />;
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
    <aside className="inspector">
      <header className="inspector__header">
        <div>
          <span className="eyebrow">{geometry}</span>
          <h2>{activePreset?.label ?? (entity.featureType || "Untyped feature")}</h2>
        </div>
        <Badge variant="outline">
          <code>
            {entity.type[0]}
            {entity.id}
          </code>
        </Badge>
      </header>

      <div className="inspector__body">
        <InspectorSection title="Feature">
          <FieldGroup className="property-list">
            <Field className="property-row" orientation="horizontal">
              <FieldLabel htmlFor="feature-preset">Preset</FieldLabel>
              <Select
                onValueChange={(presetId) => {
                  if (presetId !== CUSTOM_PRESET) editor.applyPreset(presetId);
                }}
                value={activePreset?.id ?? CUSTOM_PRESET}
              >
                <SelectTrigger className="w-full" id="feature-preset" size="sm">
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
            <Field className="property-row" orientation="horizontal">
              <FieldLabel htmlFor="feature-type">Type</FieldLabel>
              <Input
                defaultValue={entity.featureType}
                id="feature-type"
                key={`${entity.type}-${entity.id}-feature-${entity.featureType}`}
                onBlur={(event) => editor.updateFeatureType(event.target.value.trim())}
              />
            </Field>
            {entity.type === "node" ? (
              <Field className="property-row" orientation="horizontal">
                <FieldLabel htmlFor="node-height">Height</FieldLabel>
                <Input
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
              <FieldGroup className="property-list">
                {activePreset.fields.map((field) => (
                  <Field className="property-row" key={field.key} orientation="horizontal">
                    <FieldLabel htmlFor={`preset-field-${field.key}`}>{field.label}</FieldLabel>
                    <Input
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
          <div className="tag-list">
            {Object.entries(entity.tags).map(([key, value]) => (
              <div className="tag-row" key={key}>
                <code title={key}>{key}</code>
                <Input
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
              <Empty className="tag-list__empty border-0">
                <EmptyHeader>
                  <EmptyDescription>No tags yet.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
          </div>
          <FieldGroup className="tag-add">
            <Field>
              <FieldLabel className="sr-only" htmlFor="new-tag-key">
                New tag key
              </FieldLabel>
              <Input
                id="new-tag-key"
                onChange={(event) => setNewTagKey(event.target.value)}
                placeholder="key"
                value={newTagKey}
              />
            </Field>
            <Field>
              <FieldLabel className="sr-only" htmlFor="new-tag-value">
                New tag value
              </FieldLabel>
              <Input
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
    <section className="form-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
