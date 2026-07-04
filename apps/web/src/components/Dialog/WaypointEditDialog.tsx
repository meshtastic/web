import { clone, create } from "@bufbuild/protobuf";
import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice, type WaypointWithMetadata } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import type { LngLat } from "@core/utils/geo.ts";
import {
  coordToDeg,
  degToCoordI,
  displayToMeters,
  metersToDisplay,
  unitSystemFromLocale,
} from "@core/utils/geofence.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MapRef } from "react-map-gl/maplibre";

const DEFAULT_ICON_CODEPOINT = 0x1f4cd; // 📍
const WAYPOINT_NAME_MAX = 30;
const WAYPOINT_DESC_MAX = 100;

const METRIC_RADIUS_PRESETS_M = [0, 100, 500, 1_000, 5_000];
const IMPERIAL_RADIUS_PRESETS_M = [
  0,
  Math.round(0.1 * 1609.344),
  Math.round(0.5 * 1609.344),
  Math.round(1 * 1609.344),
  Math.round(5 * 1609.344),
  Math.round(10 * 1609.344),
];

interface WaypointEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waypoint: WaypointWithMetadata | undefined;
  initialLngLat: LngLat | undefined;
  channel: number;
  mapRef: MapRef | undefined;
  onRequestBoundingBoxDraw: () => Promise<
    { west: number; south: number; east: number; north: number } | undefined
  >;
}

interface FormState {
  name: string;
  description: string;
  icon: string;
  latitude: string;
  longitude: string;
  expireEnabled: boolean;
  expireIso: string;
  radiusValue: string;
  useLargeUnit: boolean;
  west: string;
  south: string;
  east: string;
  north: string;
  hasBox: boolean;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
  notifyFavoritesOnly: boolean;
}

function isoLocal(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialForm(
  wp: WaypointWithMetadata | undefined,
  initialLngLat: LngLat | undefined,
  system: "metric" | "imperial",
): FormState {
  if (wp) {
    const box = wp.boundingBox;
    const radiusMeters = wp.geofenceRadius ?? 0;
    const useLargeUnit =
      system === "imperial" ? radiusMeters >= 0.5 * 1609.344 : radiusMeters >= 1000;
    const displayed = radiusMeters > 0 ? metersToDisplay(radiusMeters, system) : 0;
    return {
      name: wp.name,
      description: wp.description,
      icon: String.fromCodePoint(wp.icon || DEFAULT_ICON_CODEPOINT),
      latitude: String(coordToDeg(wp.latitudeI)),
      longitude: String(coordToDeg(wp.longitudeI)),
      expireEnabled: wp.expire !== 0,
      expireIso: wp.expire !== 0 ? isoLocal(wp.expire) : "",
      radiusValue: radiusMeters > 0 ? String(Number(displayed.toFixed(2))) : "",
      useLargeUnit,
      hasBox: Boolean(box),
      west: box ? String(coordToDeg(box.longitudeWestI)) : "",
      south: box ? String(coordToDeg(box.latitudeSouthI)) : "",
      east: box ? String(coordToDeg(box.longitudeEastI)) : "",
      north: box ? String(coordToDeg(box.latitudeNorthI)) : "",
      notifyOnEnter: wp.notifyOnEnter,
      notifyOnExit: wp.notifyOnExit,
      notifyFavoritesOnly: wp.notifyFavoritesOnly,
    };
  }

  const [lng, lat] = initialLngLat ?? [0, 0];
  return {
    name: "",
    description: "",
    icon: String.fromCodePoint(DEFAULT_ICON_CODEPOINT),
    latitude: String(lat),
    longitude: String(lng),
    expireEnabled: false,
    expireIso: "",
    radiusValue: "",
    useLargeUnit: false,
    hasBox: false,
    west: "",
    south: "",
    east: "",
    north: "",
    notifyOnEnter: false,
    notifyOnExit: false,
    notifyFavoritesOnly: false,
  };
}

function parseIcon(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_ICON_CODEPOINT;
  return trimmed.codePointAt(0) ?? DEFAULT_ICON_CODEPOINT;
}

export const WaypointEditDialog = ({
  open,
  onOpenChange,
  waypoint,
  initialLngLat,
  channel,
  mapRef,
  onRequestBoundingBoxDraw,
}: WaypointEditDialogProps) => {
  const { t, i18n } = useTranslation("map");
  const { toast } = useToast();
  const device = useDevice();
  const unitSystem = useMemo(() => unitSystemFromLocale(i18n.language), [i18n.language]);
  const [form, setForm] = useState<FormState>(() =>
    initialForm(waypoint, initialLngLat, unitSystem),
  );
  const [saving, setSaving] = useState(false);
  const isCreating = waypoint === undefined;

  useEffect(() => {
    if (open) {
      setForm(initialForm(waypoint, initialLngLat, unitSystem));
    }
  }, [open, waypoint, initialLngLat, unitSystem]);

  const currentRadiusMeters = useMemo(() => {
    const parsed = Number.parseFloat(form.radiusValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(displayToMeters(parsed, unitSystem, form.useLargeUnit));
  }, [form.radiusValue, form.useLargeUnit, unitSystem]);

  const radiusPresets =
    unitSystem === "imperial" ? IMPERIAL_RADIUS_PRESETS_M : METRIC_RADIUS_PRESETS_M;

  const applyRadiusPreset = useCallback(
    (meters: number) => {
      if (meters === 0) {
        setForm((s) => ({ ...s, radiusValue: "", useLargeUnit: false }));
        return;
      }
      const useLargeUnit = unitSystem === "imperial" ? meters >= 1609.344 : meters >= 1000;
      const displayed = metersToDisplay(meters, unitSystem);
      setForm((s) => ({
        ...s,
        radiusValue: String(Number(displayed.toFixed(2))),
        useLargeUnit,
      }));
    },
    [unitSystem],
  );

  const requestDraw = useCallback(async () => {
    const box = await onRequestBoundingBoxDraw();
    if (!box) return;
    setForm((s) => ({
      ...s,
      hasBox: true,
      west: box.west.toFixed(6),
      south: box.south.toFixed(6),
      east: box.east.toFixed(6),
      north: box.north.toFixed(6),
    }));
  }, [onRequestBoundingBoxDraw]);

  const hasAnyGeofence = currentRadiusMeters > 0 || form.hasBox;
  const hasAnyNotifyOn = form.notifyOnEnter || form.notifyOnExit;

  const boxSummary = form.hasBox
    ? `${Number(form.south).toFixed(3)}, ${Number(form.west).toFixed(3)} → ${Number(form.north).toFixed(3)}, ${Number(form.east).toFixed(3)}`
    : "";

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const base: Protobuf.Mesh.Waypoint = waypoint
        ? clone(Protobuf.Mesh.WaypointSchema, waypoint)
        : create(Protobuf.Mesh.WaypointSchema, {});

      const trimmedName = form.name.trim().slice(0, WAYPOINT_NAME_MAX);
      if (!trimmedName) {
        toast({ title: t("waypointEdit.errorMissingName") });
        setSaving(false);
        return;
      }
      base.name = trimmedName;
      base.description = form.description.slice(0, WAYPOINT_DESC_MAX);
      base.icon = parseIcon(form.icon);

      const lat = Number.parseFloat(form.latitude);
      const lng = Number.parseFloat(form.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast({ title: t("waypointEdit.errorBadCoords") });
        setSaving(false);
        return;
      }
      base.latitudeI = degToCoordI(lat);
      base.longitudeI = degToCoordI(lng);

      if (form.expireEnabled && form.expireIso) {
        const epoch = Math.floor(new Date(form.expireIso).getTime() / 1000);
        base.expire = Number.isFinite(epoch) && epoch > 0 ? epoch : 0;
      } else {
        base.expire = 0;
      }

      const parsedRadius = Number.parseFloat(form.radiusValue);
      base.geofenceRadius =
        Number.isFinite(parsedRadius) && parsedRadius > 0
          ? Math.round(displayToMeters(parsedRadius, unitSystem, form.useLargeUnit))
          : 0;

      if (form.hasBox) {
        const [west, south, east, north] = [form.west, form.south, form.east, form.north].map((v) =>
          Number.parseFloat(v),
        );
        if ([west, south, east, north].every((n) => Number.isFinite(n))) {
          base.boundingBox = create(Protobuf.Mesh.BoundingBoxSchema, {
            longitudeWestI: degToCoordI(west!),
            latitudeSouthI: degToCoordI(south!),
            longitudeEastI: degToCoordI(east!),
            latitudeNorthI: degToCoordI(north!),
          });
        }
      } else {
        base.boundingBox = undefined;
      }
      base.notifyOnEnter = form.notifyOnEnter;
      base.notifyOnExit = form.notifyOnExit;
      base.notifyFavoritesOnly = form.notifyFavoritesOnly;

      if (isCreating && base.id === 0) {
        base.id = Math.floor(Math.random() * 0xffffffff);
      }

      const targetChannel = waypoint?.metadata.channel ?? channel;
      const fromNode = waypoint?.metadata.from ?? device.hardware.myNodeNum;
      device.addWaypoint(base, targetChannel, fromNode, new Date());
      if (device.connection) {
        await device.connection.sendWaypoint(base, "broadcast", targetChannel);
      }
      toast({
        title: isCreating
          ? t("waypointEdit.createdToast", { name: base.name })
          : t("waypointEdit.savedToast", { name: base.name }),
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: t("waypointEdit.errorToast"),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  }, [channel, device, form, isCreating, onOpenChange, t, toast, unitSystem, waypoint]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>
            {isCreating
              ? t("waypointEdit.titleCreate")
              : t("waypointEdit.title", { name: waypoint?.name ?? "" })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 text-sm">
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="wp-name">{t("waypointEdit.name")}</Label>
              <Input
                id="wp-name"
                type="text"
                maxLength={WAYPOINT_NAME_MAX}
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="wp-desc">{t("waypointEdit.description")}</Label>
              <Input
                id="wp-desc"
                type="text"
                maxLength={WAYPOINT_DESC_MAX}
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-[4rem_1fr_1fr] gap-2">
              <label className="text-xs flex flex-col gap-1">
                {t("waypointEdit.icon")}
                <Input
                  type="text"
                  maxLength={2}
                  value={form.icon}
                  onChange={(e) => setForm((s) => ({ ...s, icon: e.target.value }))}
                />
              </label>
              <label className="text-xs flex flex-col gap-1 min-w-0">
                {t("waypointEdit.latitude")}
                <Input
                  type="number"
                  step="0.000001"
                  className="w-full"
                  value={form.latitude}
                  onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))}
                />
              </label>
              <label className="text-xs flex flex-col gap-1 min-w-0">
                {t("waypointEdit.longitude")}
                <Input
                  type="number"
                  step="0.000001"
                  className="w-full"
                  value={form.longitude}
                  onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="wp-expire">{t("waypointEdit.expiresAt")}</Label>
                <Switch
                  id="wp-expire"
                  checked={form.expireEnabled}
                  onCheckedChange={(v) => setForm((s) => ({ ...s, expireEnabled: v }))}
                />
              </div>
              {form.expireEnabled && (
                <Input
                  type="datetime-local"
                  value={form.expireIso}
                  onChange={(e) => setForm((s) => ({ ...s, expireIso: e.target.value }))}
                />
              )}
            </div>
          </section>

          <section className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-600 pt-3">
            <Label>{t("waypointEdit.radius")}</Label>
            <div className="flex flex-wrap gap-1">
              {radiusPresets.map((meters) => {
                const label =
                  meters === 0
                    ? t("waypointEdit.radiusOff")
                    : unitSystem === "imperial"
                      ? meters >= 1609.344
                        ? `${(meters / 1609.344).toFixed(meters === 1609 ? 1 : 0)} ${t("unit.mile.plural")}`
                        : `${Math.round(meters / 0.3048)} ${t("unit.foot.plural")}`
                      : meters >= 1000
                        ? `${meters / 1000} ${t("unit.kilometer.plural")}`
                        : `${meters} ${t("unit.meter.plural")}`;
                const active = currentRadiusMeters === meters;
                return (
                  <button
                    key={meters}
                    type="button"
                    className={cn(
                      "text-xs px-2 py-1 rounded border",
                      active
                        ? "bg-blue-500 text-white border-blue-500"
                        : "border-slate-300 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
                    )}
                    onClick={() => applyRadiusPreset(meters)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>{t("waypointEdit.boundingBox")}</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={requestDraw}
                  disabled={!mapRef}
                >
                  {form.hasBox ? t("waypointEdit.editBox") : t("waypointEdit.drawBox")}
                </Button>
                {form.hasBox && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((s) => ({ ...s, hasBox: false }))}
                  >
                    {t("waypointEdit.removeBox")}
                  </Button>
                )}
              </div>
            </div>
            {form.hasBox && <p className="text-xs text-slate-500 truncate">{boxSummary}</p>}
          </section>

          {hasAnyGeofence && (
            <section className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-600 pt-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="wp-notify-enter">{t("waypointEdit.notifyOnEnter")}</Label>
                <Switch
                  id="wp-notify-enter"
                  checked={form.notifyOnEnter}
                  onCheckedChange={(v) => setForm((s) => ({ ...s, notifyOnEnter: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="wp-notify-exit">{t("waypointEdit.notifyOnExit")}</Label>
                <Switch
                  id="wp-notify-exit"
                  checked={form.notifyOnExit}
                  onCheckedChange={(v) => setForm((s) => ({ ...s, notifyOnExit: v }))}
                />
              </div>
              {hasAnyNotifyOn && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="wp-notify-fav">{t("waypointEdit.notifyFavoritesOnly")}</Label>
                  <Switch
                    id="wp-notify-fav"
                    checked={form.notifyFavoritesOnly}
                    onCheckedChange={(v) => setForm((s) => ({ ...s, notifyFavoritesOnly: v }))}
                  />
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("waypointEdit.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("waypointEdit.saving") : t("waypointEdit.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
