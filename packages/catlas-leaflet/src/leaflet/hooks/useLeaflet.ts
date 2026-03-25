import { useEffect, useRef, useState } from "react";
import { map as lMap } from "leaflet";

export const useLeafletMap = ({ options }: { options?: L.MapOptions } = {}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || map) return;

    const instance = lMap(mapRef.current, options);

    setMap(instance);

    return () => {
      instance.remove();
      setMap(null);
    };
  }, []);

  return { mapRef, map };
};
