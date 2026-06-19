import {
  ArrowRightIcon,
  BracesIcon,
  CircleCheckIcon,
  CirclePlusIcon,
  PencilIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CatlasEditor, ChangesetReview, EditorSnapshot } from "@/lib/editor";
import type { ChangesetReviewEntry, ChangesetReviewValue } from "@/lib/editor/changeset";
import { entityKey } from "@/lib/editor/types";

const KIND_DETAILS: Record<
  ChangesetReviewEntry["kind"],
  { readonly label: string; readonly heading: string; readonly icon: LucideIcon }
> = {
  create: { label: "Created", heading: "Created", icon: CirclePlusIcon },
  modify: { label: "Modified", heading: "Modified", icon: PencilIcon },
  delete: { label: "Deleted", heading: "Deleted", icon: Trash2Icon },
};

const KINDS: readonly ChangesetReviewEntry["kind"][] = ["create", "modify", "delete"];

const formatValue = (value: ChangesetReviewValue) => {
  if (value === null) return "Not set";
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (value === "") return '""';
  return String(value);
};

export function EditorChangesReview({
  editor,
  snapshot,
}: {
  readonly editor: CatlasEditor;
  readonly snapshot: EditorSnapshot;
}) {
  const review = editor.getChangesetReview();
  const previewedKey = snapshot.changePreview ? entityKey(snapshot.changePreview) : null;
  const blockingIssues = snapshot.issues.filter((issue) => issue.severity === "error").length;

  const clearPreview = () => {
    editor.previewChange(null);
  };

  const selectEntry = (entry: ChangesetReviewEntry) => {
    if (entry.kind === "delete") {
      const nextKey = previewedKey === entry.key ? null : entry.key;
      editor.previewChange(nextKey ? entry.ref : null);
      return;
    }

    clearPreview();
    editor.select(entry.ref);
  };

  return (
    <aside className="inspector changes-review">
      <header className="changes-review__header">
        <div>
          <span className="eyebrow">Changeset</span>
          <h2>Changes</h2>
          <p>
            {review.counts.total === 1
              ? "1 pending change"
              : `${review.counts.total} pending changes`}
          </p>
        </div>
        {blockingIssues ? (
          <Badge variant="destructive">{blockingIssues} blocking</Badge>
        ) : snapshot.issues.length ? (
          <Badge variant="outline">{snapshot.issues.length} warnings</Badge>
        ) : null}
      </header>

      <Tabs
        className="changes-review__tabs"
        defaultValue="review"
        onValueChange={(value) => {
          if (value !== "review") clearPreview();
        }}
      >
        <TabsList className="changes-review__tab-list" variant="line">
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="payload">
            <BracesIcon data-icon="inline-start" />
            Payload
          </TabsTrigger>
        </TabsList>

        <TabsContent className="changes-review__content" value="review">
          <ReviewSummary review={review} />
          {review.counts.total === 0 ? (
            <Empty className="changes-review__empty border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleCheckIcon />
                </EmptyMedia>
                <EmptyTitle>No pending changes</EmptyTitle>
                <EmptyDescription>Your map is up to date.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="changes-review__groups">
              {KINDS.map((kind) => (
                <ChangeGroup
                  entries={review.entries.filter((entry) => entry.kind === kind)}
                  key={kind}
                  kind={kind}
                  onSelect={selectEntry}
                  previewedKey={previewedKey}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent className="changes-review__content" value="payload">
          <div className="changes-review__payload-header">
            <span>Upload payload</span>
            <Badge variant="outline">JSON</Badge>
          </div>
          <pre className="changes-review__payload">
            <code>{JSON.stringify(review.payload, null, 2)}</code>
          </pre>
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function ReviewSummary({ review }: { readonly review: ChangesetReview }) {
  return (
    <div className="changes-review__summary" aria-label="Change counts">
      <Badge variant="secondary">{review.counts.created} created</Badge>
      <Badge variant="secondary">{review.counts.modified} modified</Badge>
      <Badge variant={review.counts.deleted ? "destructive" : "secondary"}>
        {review.counts.deleted} deleted
      </Badge>
    </div>
  );
}

function ChangeGroup({
  entries,
  kind,
  onSelect,
  previewedKey,
}: {
  readonly entries: readonly ChangesetReviewEntry[];
  readonly kind: ChangesetReviewEntry["kind"];
  readonly onSelect: (entry: ChangesetReviewEntry) => void;
  readonly previewedKey: string | null;
}) {
  if (entries.length === 0) return null;
  const details = KIND_DETAILS[kind];

  return (
    <section className="change-group">
      <header className="change-group__header">
        <h3>{details.heading}</h3>
        <Badge variant="outline">{entries.length}</Badge>
      </header>
      <ItemGroup>
        {entries.map((entry) => (
          <ChangeItem
            active={previewedKey === entry.key}
            entry={entry}
            key={`${entry.kind}-${entry.key}`}
            onSelect={onSelect}
          />
        ))}
      </ItemGroup>
    </section>
  );
}

function ChangeItem({
  active,
  entry,
  onSelect,
}: {
  readonly active: boolean;
  readonly entry: ChangesetReviewEntry;
  readonly onSelect: (entry: ChangesetReviewEntry) => void;
}) {
  const details = KIND_DETAILS[entry.kind];
  const Icon = details.icon;

  return (
    <Item asChild size="xs" variant={active ? "muted" : "outline"}>
      <button
        aria-pressed={entry.kind === "delete" ? active : undefined}
        className="change-item"
        onClick={() => onSelect(entry)}
        type="button"
      >
        <ItemHeader>
          <ItemContent>
            <ItemTitle>
              <Icon />
              {entry.featureType || `Untyped ${entry.ref.type}`}
            </ItemTitle>
            <ItemDescription>
              {entry.geometry} · {entry.key}
              {entry.expectedVersion === null ? "" : ` · v${entry.expectedVersion}`}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Badge variant={entry.kind === "delete" ? "destructive" : "outline"}>
              {details.label}
            </Badge>
          </ItemActions>
        </ItemHeader>

        <div className="change-item__fields">
          {entry.fields.map((field) => (
            <div className="change-field" key={field.key}>
              <span>{field.label}</span>
              <div className="change-field__values">
                {entry.kind !== "create" ? <code>{formatValue(field.before)}</code> : null}
                {entry.kind === "modify" ? <ArrowRightIcon aria-hidden="true" /> : null}
                {entry.kind !== "delete" ? <code>{formatValue(field.after)}</code> : null}
              </div>
            </div>
          ))}
        </div>
      </button>
    </Item>
  );
}
