import type { Layer } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useParent } from "../../context/parent.ts";

export function useLayerLifecycleState<T extends Layer>(createLayer: () => T) {
  const [layer, setLayer] = useState<T | null>(null);
  const { parent } = useParent();

  useEffect(() => {
    const newLayer = createLayer();
    newLayer.addTo(parent);
    setLayer(newLayer);

    return () => {
      newLayer.remove();
    };
  }, [parent]);

  return layer;
}

export function useLayerLifecycleRef<T extends Layer>(createLayer: () => T) {
  const ref = useRef<T | null>(null);
  const { parent } = useParent();

  useEffect(() => {
    const layer = createLayer();
    layer.addTo(parent);
    ref.current = layer;

    return () => {
      layer.remove();
      ref.current = null;
    };
  }, [parent]);

  return ref;
}
