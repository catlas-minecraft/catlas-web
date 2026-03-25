import { LayerGroup as LLayerGroup } from "leaflet";
import { type ReactNode } from "react";
import { ParentContext } from "../context/parent.ts";
import { useLayerLifecycleState } from "./hooks/useLayerLifeCycle.tsx";
import { LayerGroupContext } from "./context/layerGroup.ts";

export const LayerGroup = ({ children }: { children: ReactNode }) => {
  const layerGroup = useLayerLifecycleState(() => new LLayerGroup(), []);

  return (
    layerGroup && (
      <ParentContext.Provider value={{ parent: layerGroup }}>
        <LayerGroupContext.Provider value={{ layerGroup }}>{children}</LayerGroupContext.Provider>
      </ParentContext.Provider>
    )
  );
};
