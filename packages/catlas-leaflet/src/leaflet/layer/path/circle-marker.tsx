import {
  circleMarker,
  type CircleMarkerOptions,
  type LatLngExpression,
  type LeafletEventHandlerFnMap,
} from "leaflet";
import { useEffect } from "react";
import { useLayerLifecycleRef } from "../hooks/useLayerLifeCycle.tsx";

export interface CCircleMarkerProps extends CircleMarkerOptions {
  eventHandlers?: LeafletEventHandlerFnMap;
  position: LatLngExpression;
}

export const CircleMarker = ({ eventHandlers, position, ...options }: CCircleMarkerProps): null => {
  const circleMarkerRef = useLayerLifecycleRef(() => circleMarker(position, options));

  useEffect(() => {
    if (circleMarkerRef.current) {
      circleMarkerRef.current.setLatLng(position);
      circleMarkerRef.current.setStyle(options);
    }
  }, [options, position]);

  useEffect(() => {
    if (!circleMarkerRef.current || !eventHandlers) {
      return;
    }

    circleMarkerRef.current.on(eventHandlers);

    return () => {
      circleMarkerRef.current?.off(eventHandlers);
    };
  }, [eventHandlers]);

  return null;
};
