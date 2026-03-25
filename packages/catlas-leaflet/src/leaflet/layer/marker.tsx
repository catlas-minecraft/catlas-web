import { type LatLngExpression, marker, type MarkerOptions } from "leaflet";
import { useEffect } from "react";
import { useLayerLifecycleRef } from "./hooks/useLayerLifeCycle.tsx";

export interface CMarkerProps extends MarkerOptions {
  position: LatLngExpression;
}

export const Marker = ({ position, ...options }: CMarkerProps): null => {
  const markerRef = useLayerLifecycleRef(() => marker(position, options), [position, options]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  return null;
};
