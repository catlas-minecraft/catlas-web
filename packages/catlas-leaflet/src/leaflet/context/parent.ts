import { createContext, useContext } from "react";
import L, { LayerGroup } from "leaflet";

export const ParentContext = createContext<{
  parent: L.Map | LayerGroup;
} | null>(null);

export const useParent = () => {
  const context = useContext(ParentContext);

  if (!context) {
    throw new Error("useParent must be used within a ParentContext");
  }

  return context;
};
