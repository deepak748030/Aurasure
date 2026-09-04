import type React from 'react';
export declare function MapSurface(props: {
  lat?: number | null;
  lng?: number | null;
  editable?: boolean;
  onChange?: (lat: number, lng: number) => void;
  height?: number;
}): React.ReactElement;
