export interface Position {
  readonly nodeNum: number;
  readonly latitudeI?: number;
  readonly longitudeI?: number;
  readonly altitude?: number;
  readonly time?: Date;
}
