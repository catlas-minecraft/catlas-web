import { useSyncExternalStore } from "react";
import type { CatlasEditor } from "../../lib/editor";

export const useEditorSnapshot = (editor: CatlasEditor) =>
  useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
