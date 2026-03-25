import type { Layer } from "leaflet";
import { createContext, useContext } from "react";

export const LayerContext = createContext<{
  layer: Layer;
} | null>(null);

export const useLayer = () => {
  const context = useContext(LayerContext);

  if (!context) {
    throw new Error("useLayer must be used within a LayerContext");
  }

  return context;
};
