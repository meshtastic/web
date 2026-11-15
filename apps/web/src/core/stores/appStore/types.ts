export interface RasterSource {
  enabled: boolean;
  title: string;
  tiles: string;
  tileSize: number;
}

/** Which screen the Connections drawer shows; `edit` carries the connection id. */
export type ConnectionsView = "list" | "add" | { edit: string };

export interface ConnectionsDrawerState {
  open: boolean;
  view: ConnectionsView;
}
