import { Control as LControl, type ControlPosition } from "leaflet";
import { useEffect, useMemo } from "react";
import { useLeaflet } from "./context/map.ts";
import { createPortal } from "react-dom";

export const Control = ({
  children,
  position,
}: {
  children: React.ReactNode;
  position: ControlPosition;
}) => {
  const { map } = useLeaflet();
  const div = useMemo(() => document.createElement("div"), []);

  useEffect(() => {
    const control = new LControl({ position });

    control.onAdd = () => div;
    control.addTo(map);

    return () => {
      control.remove();
    };
  }, [position]);

  return createPortal(children, div);
};
