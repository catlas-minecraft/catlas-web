import {
  type LatLngExpression,
  type LeafletEventHandlerFnMap,
  marker,
  type MarkerOptions,
} from "leaflet";
import { useEffect } from "react";
import { useLayerLifecycleRef } from "./hooks/useLayerLifeCycle.tsx";

export interface CMarkerProps extends MarkerOptions {
  eventHandlers?: LeafletEventHandlerFnMap;
  position: LatLngExpression;
}

export const Marker = ({ eventHandlers, position, ...options }: CMarkerProps): null => {
  const markerRef = useLayerLifecycleRef(() => marker(position, options));

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  useEffect(() => {
    if (!markerRef.current || !eventHandlers) {
      return;
    }

    markerRef.current.on(eventHandlers);

    return () => {
      markerRef.current?.off(eventHandlers);
    };
  }, [eventHandlers]);

  return null;
};
