import { Map, CTileLayer, ViewportLayer, Coordinator } from "@catlas/leaflet";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { CRS as lCrs, extend as lExtend, transformation as lTransformation } from "leaflet";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const zoom = 3;
  const mapOptions = useRef<L.MapOptions>({
    center: [0, 0],
    zoom: 0,
    minZoom: 0,
    preferCanvas: true,
    crs: lExtend({}, lCrs.Simple, {
      transformation: lTransformation(-1 / 2 ** zoom, 0, 1 / 2 ** zoom, 0),
    }),
    zoomControl: false,
    attributionControl: false,
  });

  return (
    <Map className="w-full h-screen" initialOptions={mapOptions.current}>
      <CTileLayer
        urlTemplate="/tiles/{x}.{y}.gif"
        tileSize={512}
        bounds={[
          [-Infinity, -Infinity],
          [Infinity, Infinity],
        ]}
        minNativeZoom={zoom}
        maxNativeZoom={zoom}
        noWrap={true}
        className="pixel-map"
      />
      <ViewportLayer url={"/viewport"} />
      <Coordinator />
    </Map>
  );
}
