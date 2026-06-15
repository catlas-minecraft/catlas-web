import { CloudUploadIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { CatlasEditor } from "@/lib/editor";
import { useEditorSnapshot } from "./use-editor-snapshot";

export function EditorSavePanel({ editor }: { readonly editor: CatlasEditor | null }) {
  if (!editor) return <div className="save-panel" />;
  return <SavePanelContent editor={editor} />;
}

function SavePanelContent({ editor }: { readonly editor: CatlasEditor }) {
  const snapshot = useEditorSnapshot(editor);
  const [comment, setComment] = useState("");
  const blockingIssues = snapshot.issues.filter((issue) => issue.severity === "error");
  const isSaving = snapshot.save.status === "saving";
  const isAuthenticated = snapshot.auth.status === "authenticated";

  return (
    <div className="save-panel">
      <div className="save-panel__summary">
        <strong>
          {snapshot.issues.length ? `${snapshot.issues.length} checks` : "Ready to publish"}
        </strong>
        <span>
          {blockingIssues.length
            ? `${blockingIssues.length} errors block saving`
            : isAuthenticated
              ? "No blocking errors"
              : "Sign in to publish"}
        </span>
      </div>
      <Input
        aria-label="Changeset comment"
        onChange={(event) => setComment(event.target.value)}
        placeholder="Describe your changes"
        value={comment}
      />
      <Button
        disabled={!snapshot.dirty || blockingIssues.length > 0 || isSaving || !isAuthenticated}
        onClick={() => void editor.save(comment.trim() || null)}
        size="lg"
        type="button"
      >
        {isSaving ? <Spinner /> : <CloudUploadIcon data-icon="inline-start" />}
        {isSaving ? "Publishing..." : isAuthenticated ? "Publish changes" : "Sign in to publish"}
      </Button>
    </div>
  );
}
