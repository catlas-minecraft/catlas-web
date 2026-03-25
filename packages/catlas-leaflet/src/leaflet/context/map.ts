import { createContext, useContext } from "react";
import L from "leaflet";

export const LeafletContext = createContext<{
  map: L.Map;
} | null>(null);

export const useLeaflet = () => {
  const context = useContext(LeafletContext);

  if (!context) {
    throw new Error("useLeaflet must be used within a MapProvider");
  }

  return context;
};
