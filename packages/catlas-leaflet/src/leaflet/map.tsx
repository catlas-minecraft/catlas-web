import { cn } from "../lib/util.ts";
import { LeafletContext } from "./context/map.ts";
import { ParentContext } from "./context/parent.ts";
import { useLeafletMap } from "./hooks/useLeaflet.ts";
import type { ReactNode } from "react";

export const Map = ({
  children,
  initialOptions,
  className,
}: {
  children?: ReactNode;
  initialOptions: L.MapOptions;
  className: string;
}) => {
  const { mapRef, map } = useLeafletMap({ options: initialOptions });

  return (
    <div className={cn(className, "c-map")} ref={mapRef}>
      {map && (
        <ParentContext.Provider value={{ parent: map }}>
          <LeafletContext.Provider value={{ map }}>{children}</LeafletContext.Provider>
        </ParentContext.Provider>
      )}
    </div>
  );
};
