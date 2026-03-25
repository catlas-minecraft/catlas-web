import type { LayerGroup } from "leaflet";
import { createContext, useContext } from "react";

export const LayerGroupContext = createContext<{
  layerGroup: LayerGroup;
} | null>(null);

export const useLayerGroup = () => {
  const context = useContext(LayerGroupContext);

  if (!context) {
    throw new Error("useLayerGroup must be used within a LayerGroupContext");
  }

  return context;
};
