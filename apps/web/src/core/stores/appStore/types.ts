export interface RasterSource {
  enabled: boolean;
  title: string;
  tiles: string;
  tileSize: number;
}

/** Which screen the Connections drawer shows. */
export type ConnectionsView = "list" | "add";

export interface ConnectionsDrawerState {
  open: boolean;
  view: ConnectionsView;
}
