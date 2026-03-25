import { useState } from "react";
import { useLeafletMapEvent } from "./hooks/useLeafletEvent.ts";
import { Control } from "./control.tsx";

export const Coordinator = () => {
  const [coords, setCoords] = useState([0, 0]);

  useLeafletMapEvent(
    {
      mousemove: (event) => {
        setCoords([event.latlng.lng, event.latlng.lat]);
      },
    },
    [],
  );

  return (
    <Control position="topright">
      <div>
        x: {coords[0].toFixed(2)}, z: {coords[1].toFixed(2)}
      </div>
    </Control>
  );
};
