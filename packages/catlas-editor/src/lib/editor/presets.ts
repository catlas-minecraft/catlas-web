import type { GeometryType, Point3D, PresetDefinition, SnapPolicy } from "./types";

const commonFields = [
  { key: "name", label: "Name", placeholder: "Display name" },
  { key: "description", label: "Description", placeholder: "Optional details" },
] as const;

export const DEFAULT_PRESETS: readonly PresetDefinition[] = [
  {
    id: "landmark",
    label: "Landmark",
    geometry: "point",
    featureType: "landmark",
    defaultTags: {},
    snapPolicy: "half",
    fields: commonFields,
  },
  {
    id: "spawn",
    label: "Spawn point",
    geometry: "point",
    featureType: "spawn",
    defaultTags: {},
    snapPolicy: "integer",
    fields: commonFields,
  },
  {
    id: "route",
    label: "Route",
    geometry: "line",
    featureType: "route",
    defaultTags: {},
    snapPolicy: "half",
    fields: commonFields,
  },
  {
    id: "boundary",
    label: "Boundary",
    geometry: "line",
    featureType: "boundary",
    defaultTags: {},
    snapPolicy: "integer",
    fields: commonFields,
  },
  {
    id: "zone",
    label: "Zone",
    geometry: "area",
    featureType: "zone",
    defaultTags: {},
    snapPolicy: "integer",
    fields: commonFields,
  },
] as const;

export const presetsForGeometry = (presets: readonly PresetDefinition[], geometry: GeometryType) =>
  presets.filter((preset) => preset.geometry === geometry);

export const defaultPresetForGeometry = (
  presets: readonly PresetDefinition[],
  geometry: GeometryType,
) => presetsForGeometry(presets, geometry)[0];

export const presetForFeature = (
  presets: readonly PresetDefinition[],
  geometry: GeometryType,
  featureType: string,
) => presets.find((preset) => preset.geometry === geometry && preset.featureType === featureType);

export const snapValue = (value: number, policy: SnapPolicy) => {
  if (policy === "integer") return Math.round(value);
  if (policy === "half") return Math.round(value * 2) / 2;
  return value;
};

export const snapPoint = (point: Point3D, policy: SnapPolicy): Point3D => ({
  x: snapValue(point.x, policy),
  y: snapValue(point.y, policy),
  z: snapValue(point.z, policy),
});
