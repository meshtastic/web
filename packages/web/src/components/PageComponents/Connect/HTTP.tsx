import type { TabElementProps } from "@components/Dialog/NewDeviceDialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { Link } from "@components/UI/Typography/Link.tsx";
import { useAppStore, useDeviceStore, useMessageStore } from "@core/stores";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { MeshDevice } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useController, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface FormData {
  ip: string;
  tls: boolean;
}

export const HTTP = ({ closeDialog }: TabElementProps) => {
  const { t } = useTranslation("dialog");
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const isURLHTTPS = location.protocol === "https:";

  const { addDevice } = useDeviceStore();
  const messageStore = useMessageStore();
  const { setSelectedDevice } = useAppStore();

  const { control, handleSubmit, register } = useForm<FormData>({
    defaultValues: {
      ip: ["client.meshtastic.org", "localhost"].includes(
        globalThis.location.hostname,
      )
        ? "meshtastic.local"
        : globalThis.location.host,
      tls: !!isURLHTTPS,
    },
  });

  const {
    field: { value: tlsValue, onChange: setTLS },
  } = useController({ name: "tls", control });

  const [connectionError, setConnectionError] = useState<{
    host: string;
    secure: boolean;
  } | null>(null);

  const onSubmit = handleSubmit(async (data) => {
    setConnectionInProgress(true);
    setConnectionError(null);

    try {
      const id = randId();
      const transport = await TransportHTTP.create(data.ip, data.tls);
      const device = addDevice(id);
      const connection = new MeshDevice(transport, id);
      connection.configure();
      setSelectedDevice(id);
      device.addConnection(connection);
      subscribeAll(device, connection, messageStore);
      closeDialog();
    } catch (error) {
      if (error instanceof Error) {
        console.error("Connection error:", error);
      }
      // Capture all connection errors regardless of type
      setConnectionError({ host: data.ip, secure: data.tls });
      setConnectionInProgress(false);
    }
  });

  return (
    <form className="flex w-full flex-col gap-2 p-4" onSubmit={onSubmit}>
      <fieldset
        className="flex flex-col gap-2"
        style={{ minHeight: "12rem" }}
        disabled={connectionInProgress}
      >
        <div>
          <Label>{t("newDeviceDialog.httpConnection.label")}</Label>
          <Input
            prefix={
              tlsValue
                ? `${t("newDeviceDialog.https")}://`
                : `${t("newDeviceDialog.http")}://`
            }
            placeholder={t("newDeviceDialog.httpConnection.placeholder")}
            className="text-slate-900 dark:text-slate-100"
            {...register("ip")}
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Switch
            onCheckedChange={setTLS}
            disabled={isURLHTTPS}
            checked={isURLHTTPS || tlsValue}
            {...register("tls")}
          />
          <Label>{t("newDeviceDialog.useHttps")}</Label>
        </div>

        {connectionError && (
          <div className="mt-2 mb-2 p-3 rounded-md bg-amber-100 border border-amber-300 dark:bg-amber-100 dark:border-amber-300">
            <div className="flex gap-2 items-start">
              <AlertTriangle
                className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-600"
                size={20}
              />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-800">
                  {t("newDeviceDialog.connectionFailedAlert.title")}
                </p>
                <p className="text-xs mt-1 text-amber-700 dark:text-amber-700">
                  {t("newDeviceDialog.connectionFailedAlert.descriptionPrefix")}
                  {connectionError.secure &&
                    t("newDeviceDialog.connectionFailedAlert.httpsHint")}
                  {t("newDeviceDialog.connectionFailedAlert.openLinkPrefix")}
                  <Link
                    href={`${
                      connectionError.secure
                        ? t("newDeviceDialog.https")
                        : t("newDeviceDialog.http")
                    }://${connectionError.host}`}
                    className="underline font-medium text-amber-800 dark:text-amber-800"
                  >
                    {`${
                      connectionError.secure
                        ? t("newDeviceDialog.https")
                        : t("newDeviceDialog.http")
                    }://${connectionError.host}`}
                  </Link>{" "}
                  {t("newDeviceDialog.connectionFailedAlert.openLinkSuffix")}
                  {connectionError.secure
                    ? t(
                        "newDeviceDialog.connectionFailedAlert.acceptTlsWarningSuffix",
                      )
                    : ""}
                  .{" "}
                  <Link
                    href="https://meshtastic.org/docs/software/web-client/#http"
                    className="underline font-medium text-amber-800 dark:text-amber-800"
                  >
                    {t("newDeviceDialog.connectionFailedAlert.learnMoreLink")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </fieldset>
      <Button type="submit" variant="default">
        <span>
          {connectionInProgress
            ? t("newDeviceDialog.connecting")
            : t("newDeviceDialog.connect")}
        </span>
      </Button>
    </form>
  );
};
