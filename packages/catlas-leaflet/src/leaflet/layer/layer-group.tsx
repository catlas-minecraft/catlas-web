import { LayerGroup as LLayerGroup, type LayerOptions } from "leaflet";
import { type ReactNode } from "react";
import { ParentContext } from "../context/parent.ts";
import { useLayerLifecycleState } from "./hooks/useLayerLifeCycle.tsx";
import { LayerGroupContext } from "./context/layerGroup.ts";

interface LayerGroupProps extends LayerOptions {
  children: ReactNode;
}

export const LayerGroup = ({ children }: LayerGroupProps) => {
  const layerGroup = useLayerLifecycleState(() => new LLayerGroup());

  return (
    layerGroup && (
      <ParentContext.Provider value={{ parent: layerGroup }}>
        <LayerGroupContext.Provider value={{ layerGroup }}>{children}</LayerGroupContext.Provider>
      </ParentContext.Provider>
    )
  );
};
