import {
  MapPinIcon,
  ListChecksIcon,
  MonitorIcon,
  MoonIcon,
  MousePointer2Icon,
  PentagonIcon,
  Redo2Icon,
  RouteIcon,
  SunIcon,
  Trash2Icon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react";
import { AuthControl } from "@/components/editor/auth-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CatlasEditor, EditorMode } from "@/lib/editor";
import { EditorSavePanel } from "./editor-save-panel";
import { type ThemeMode, useTheme } from "./editor-theme";
import { useEditorSnapshot } from "./use-editor-snapshot";

const MODE_BUTTONS: readonly {
  mode: EditorMode;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}[] = [
  { mode: "browse", label: "Browse", shortcut: "Esc", icon: MousePointer2Icon },
  { mode: "add-point", label: "Point", shortcut: "1", icon: MapPinIcon },
  { mode: "draw-line", label: "Line", shortcut: "2", icon: RouteIcon },
  { mode: "draw-area", label: "Area", shortcut: "3", icon: PentagonIcon },
];

const THEME_OPTIONS: readonly {
  value: ThemeMode;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

export function EditorTopBar({ editor }: { readonly editor: CatlasEditor | null }) {
  return (
    <header className="topbar" aria-label="Editor controls">
      <div className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true">
          C
        </span>
        <span className="topbar__title">Catlas Editor</span>
      </div>
      <Separator className="topbar__separator" orientation="vertical" />
      {editor ? <TopBarContent editor={editor} /> : <TopBarLoading />}
    </header>
  );
}

function TopBarLoading() {
  return (
    <div className="topbar__loading text-muted-foreground">
      <Spinner />
      <span>Starting editor</span>
    </div>
  );
}

function TopBarContent({ editor }: { readonly editor: CatlasEditor }) {
  const snapshot = useEditorSnapshot(editor);
  const review = editor.getChangesetReview();

  return (
    <>
      <ButtonGroup aria-label="History controls">
        <Button
          aria-label="Undo"
          disabled={!snapshot.canUndo}
          onClick={() => editor.undo()}
          size="icon-sm"
          title="Undo"
          type="button"
          variant="ghost"
        >
          <Undo2Icon data-icon="inline-start" />
        </Button>
        <Button
          aria-label="Redo"
          disabled={!snapshot.canRedo}
          onClick={() => editor.redo()}
          size="icon-sm"
          title="Redo"
          type="button"
          variant="ghost"
        >
          <Redo2Icon data-icon="inline-start" />
        </Button>
      </ButtonGroup>

      <Button
        aria-label={`Review ${review.counts.total} pending changes`}
        disabled={review.counts.total === 0}
        onClick={() => editor.select(null)}
        size="sm"
        type="button"
        variant={snapshot.selection ? "ghost" : "secondary"}
      >
        <ListChecksIcon data-icon="inline-start" />
        <span className="topbar__changes-label">Changes</span>
        <Badge variant="outline">{review.counts.total}</Badge>
      </Button>

      <div className="topbar__spacer" />
      <Badge className="topbar__status" variant={snapshot.dirty ? "secondary" : "outline"}>
        {snapshot.loading ? <Spinner /> : <span className="status-dot" />}
        {snapshot.loading ? "Loading viewport" : snapshot.dirty ? "Unsaved changes" : "Up to date"}
      </Badge>
      <ThemeMenu />
      <AuthControl editor={editor} snapshot={snapshot} />
      <EditorSavePanel editor={editor} />
    </>
  );
}

function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const ActiveThemeIcon =
    THEME_OPTIONS.find((option) => option.value === theme)?.icon ?? MonitorIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Choose theme"
          size="icon-sm"
          title="Theme"
          type="button"
          variant="ghost"
        >
          <ActiveThemeIcon data-icon="inline-start" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          onValueChange={(value) => setTheme(value as ThemeMode)}
          value={theme}
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EditorToolRail({ editor }: { readonly editor: CatlasEditor | null }) {
  if (!editor) return <nav className="tool-rail" aria-label="Editing tools" />;
  return <ToolRailContent editor={editor} />;
}

function ToolRailContent({ editor }: { readonly editor: CatlasEditor }) {
  const snapshot = useEditorSnapshot(editor);
  const deleteOperation = editor.operation("delete");

  return (
    <nav className="tool-rail" aria-label="Editing tools">
      <ToggleGroup
        aria-label="Editor mode"
        className="tool-rail__modes"
        onValueChange={(mode) => {
          if (mode) editor.setMode(mode as EditorMode);
        }}
        orientation="vertical"
        spacing={2}
        type="single"
        value={snapshot.mode}
      >
        {MODE_BUTTONS.map(({ mode, label, shortcut, icon: Icon }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <span className="tool-rail__tooltip-trigger">
                <ToggleGroupItem aria-label={`${label} mode`} value={mode}>
                  <Icon />
                </ToggleGroupItem>
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <span>{label}</span>
              <kbd data-slot="kbd">{shortcut}</kbd>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>

      <Separator />

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="tool-rail__tooltip-trigger">
            <Button
              aria-label="Delete selected feature"
              disabled={!deleteOperation.available}
              onClick={deleteOperation.execute}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2Icon data-icon="inline-start" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <span>{deleteOperation.disabledReason ?? "Delete"}</span>
          <kbd data-slot="kbd">⌫</kbd>
        </TooltipContent>
      </Tooltip>
    </nav>
  );
}
