export interface TraceRoute {
  readonly destination: number;
  readonly route: ReadonlyArray<number>;
  readonly snr?: ReadonlyArray<number>;
  readonly time: Date;
}
