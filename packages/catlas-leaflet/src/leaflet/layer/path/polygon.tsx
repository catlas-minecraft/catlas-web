import {
  type LatLngExpression,
  type LeafletEventHandlerFnMap,
  polygon,
  type PolylineOptions,
} from "leaflet";
import { useEffect } from "react";
import { useLayerLifecycleRef } from "../hooks/useLayerLifeCycle.tsx";

export interface CPolygonProps extends PolylineOptions {
  eventHandlers?: LeafletEventHandlerFnMap;
  positions: LatLngExpression[] | LatLngExpression[][] | LatLngExpression[][][];
}

export const Polygon = ({ eventHandlers, positions, ...options }: CPolygonProps): null => {
  const polygonRef = useLayerLifecycleRef(() => polygon(positions, options));

  useEffect(() => {
    if (polygonRef.current) {
      polygonRef.current.setLatLngs(positions);
      polygonRef.current.setStyle(options);
    }
  }, [options, positions]);

  useEffect(() => {
    if (!polygonRef.current || !eventHandlers) {
      return;
    }

    polygonRef.current.on(eventHandlers);

    return () => {
      polygonRef.current?.off(eventHandlers);
    };
  }, [eventHandlers]);

  return null;
};
