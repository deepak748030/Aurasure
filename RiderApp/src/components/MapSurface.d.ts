import type { ReactElement } from "react";
export type MapStop = {
  latitude: number;
  longitude: number;
  label: string;
  type: "pickup" | "drop" | "rider";
};
export function MapSurface(props: {
  stops?: MapStop[];
  height?: number;
  interactive?: boolean;
  onLocate?: () => void;
  onMapPress?: () => void;
  showLabels?: boolean;
}): ReactElement;
