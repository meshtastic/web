import { LatLon } from "geodesy/mgrs.js";

export const toMGRS = (lat?: number, lng?: number) => {
  if (lat && lng && lat !== 0 && lng !== 0) {
    return new LatLon(lat / 1e7, lng / 1e7).toUtm().toMgrs().toString();
  }
  return "No Fix.";
};
