import { tileLayer, type TileLayerOptions } from "leaflet";
import { useLayerLifecycleRef } from "./hooks/useLayerLifeCycle.tsx";

export interface CTileLayerProps extends TileLayerOptions {
  urlTemplate: string;
}

export const CTileLayer = ({ urlTemplate, ...options }: CTileLayerProps): null => {
  useLayerLifecycleRef(() => tileLayer(urlTemplate, options));

  return null;
};
