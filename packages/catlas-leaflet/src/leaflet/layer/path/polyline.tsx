import {
  type LatLngExpression,
  type LeafletEventHandlerFnMap,
  polyline,
  type PolylineOptions,
} from "leaflet";
import { useEffect } from "react";
import { useLayerLifecycleRef } from "../hooks/useLayerLifeCycle.tsx";

export interface CPolylineProps extends PolylineOptions {
  eventHandlers?: LeafletEventHandlerFnMap;
  positions: LatLngExpression[] | LatLngExpression[][];
}

export const Polyline = ({ eventHandlers, positions, ...options }: CPolylineProps): null => {
  const polylineRef = useLayerLifecycleRef(() => polyline(positions, options));

  useEffect(() => {
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(positions);
      polylineRef.current.setStyle(options);
    }
  }, [options, positions]);

  useEffect(() => {
    if (!polylineRef.current || !eventHandlers) {
      return;
    }

    polylineRef.current.on(eventHandlers);

    return () => {
      polylineRef.current?.off(eventHandlers);
    };
  }, [eventHandlers]);

  return null;
};
