import { useDevice } from "@core/stores";
import { eventBus } from "@core/utils/eventBus.ts";
import { useCallback } from "react";

export const UNSAFE_ROLES = ["ROUTER", "ROUTER_LATE", "REPEATER"];
export type UnsafeRole = (typeof UNSAFE_ROLES)[number];

export const useUnsafeRolesDialog = () => {
  const { setDialogOpen } = useDevice();

  const handleCloseDialog = useCallback(() => {
    setDialogOpen("unsafeRoles", false);
  }, [setDialogOpen]);

  const validateRoleSelection = useCallback(
    (newRoleKey: string): Promise<boolean> => {
      if (!UNSAFE_ROLES.includes(newRoleKey as UnsafeRole)) {
        return Promise.resolve(true);
      }

      setDialogOpen("unsafeRoles", true);

      return new Promise((resolve) => {
        const handleResponse = ({
          action,
        }: {
          action: "confirm" | "dismiss";
        }) => {
          eventBus.off("dialog:unsafeRoles", handleResponse);
          resolve(action === "confirm");
        };

        eventBus.on("dialog:unsafeRoles", handleResponse);
      });
    },
    [setDialogOpen],
  );

  return {
    handleCloseDialog,
    validateRoleSelection,
  };
};
