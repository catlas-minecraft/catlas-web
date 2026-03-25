import type { LeafletEventHandlerFnMap } from "leaflet";
import { useLeaflet } from "../context/map.ts";
import { useEffect, useMemo } from "react";

/**
 *
 * @example
 * ```tsx
 * useLeafletMapEvent({
 *   click: (e) => {
 *     console.log(e.latlng);
 *   },
 * }, []);
 * ```
 */
export const useLeafletMapEvent = (
  eventMap: LeafletEventHandlerFnMap,
  deps: React.DependencyList,
) => {
  const { map } = useLeaflet();
  const eventMapMemo = useMemo(() => eventMap, deps);

  useEffect(() => {
    map.on(eventMapMemo);
    return () => {
      map.off(eventMapMemo);
    };
  }, [eventMapMemo]);
};
