import { CatlasMap, CTileLayer } from "@catlas/leaflet";
import { useState } from "react";
import { ViewportMapEditor } from "./components/editor/viewport-map-editor";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";

export const App = () => {
  const [status, setStatus] = useState<{
    bbox: readonly [number, number, number, number];
    isFetching: boolean;
    error: string | null;
    selectedEntity: { type: "node" | "way"; id: number } | null;
    changes: {
      dirtyNodes: Array<{
        id: number;
        x: number;
        z: number;
      }>;
      dirtyWays: Array<{
        id: number;
        nodeIds: number[];
      }>;
    };
  } | null>(null);
  const [rerenderMap, setRerenderMap] = useState<(() => void) | null>(null);

  return (
    <ResizablePanelGroup className="h-dvh w-full overflow-hidden">
      <ResizablePanel className="min-h-0 overflow-hidden" defaultSize={30} minSize={22}>
        <aside className="flex h-full min-h-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground">
          <div className="border-b border-sidebar-border px-5 py-4">
            <div className="text-xs uppercase tracking-[0.2em] text-sidebar-foreground/60">
              Editor
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Viewport Patch Test</h1>
            <p className="mt-1 text-sm text-sidebar-foreground/70">
              `MapEditor` が viewport 差分を Leaflet に直接適用して描画します。
            </p>
          </div>

          <div className="flex-1 space-y-4 px-5 py-4 text-sm">
            <section className="space-y-2 rounded-xl border border-border/70 bg-card/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </div>
              <button
                type="button"
                onClick={() => rerenderMap?.()}
                disabled={!rerenderMap}
                className="inline-flex rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Re-render
              </button>
              <div>fetching: {status?.isFetching ? "yes" : "no"}</div>
              <div>bbox: {status ? status.bbox.join(", ") : "-"}</div>
              <div>
                selected:{" "}
                {status?.selectedEntity
                  ? `${status.selectedEntity.type}/${status.selectedEntity.id}`
                  : "-"}
              </div>
              <div>error: {status?.error ?? "-"}</div>
            </section>

            <section className="space-y-2 rounded-xl border border-border/70 bg-card/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Notes
              </div>
              <p className="text-sidebar-foreground/70">
                way に属する node は、対応する way が選択されている間だけ表示します。
              </p>
            </section>

            <section className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Changes
              </div>
              {status && status.changes.dirtyNodes.length === 0 && status.changes.dirtyWays.length === 0 ? (
                <p className="text-sidebar-foreground/70">変更はまだありません。</p>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Nodes ({status?.changes.dirtyNodes.length ?? 0})
                    </div>
                    {status?.changes.dirtyNodes.length ? (
                      <ul className="space-y-1 text-sidebar-foreground/80">
                        {status.changes.dirtyNodes.map((node) => (
                          <li key={node.id} className="rounded-md bg-background/70 px-2 py-1">
                            node/{node.id} x={node.x.toFixed(2)} z={node.z.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sidebar-foreground/70">変更された node はありません。</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Ways ({status?.changes.dirtyWays.length ?? 0})
                    </div>
                    {status?.changes.dirtyWays.length ? (
                      <ul className="space-y-1 text-sidebar-foreground/80">
                        {status.changes.dirtyWays.map((way) => (
                          <li key={way.id} className="rounded-md bg-background/70 px-2 py-1">
                            way/{way.id} nodes=[{way.nodeIds.join(", ")}]
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sidebar-foreground/70">変更された way はありません。</p>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </aside>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="min-h-0 overflow-hidden">
        <CatlasMap>
          <CTileLayer
            urlTemplate="/tiles/{x}.{y}.gif"
            tileSize={512}
            bounds={[
              [-Infinity, -Infinity],
              [Infinity, Infinity],
            ]}
            minNativeZoom={3}
            maxNativeZoom={3}
            noWrap={true}
            className="pixel-map"
          />
          <ViewportMapEditor onStatusChange={setStatus} onRerenderReady={setRerenderMap} />
        </CatlasMap>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
