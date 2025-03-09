import { useState, useCallback } from "react";
import { useDevice } from "@core/stores/deviceStore.ts";
import useLocalStorage from "@core/hooks/useLocalStorage.ts";

export const useUnsafeRoles = () => {
  const [agreedToUnSafeRoles, setAgreedToUnsafeRoles] = useLocalStorage("agreeToUnsafeRole", false);
  const [_confirmState, _setConfirmState] = useState(false);
  const { setDialogOpen } = useDevice();

  const toggleConfirmState = useCallback(() => {
    setConfirmState(!_confirmState);
  }, [_confirmState]);

  const setConfirmState = useCallback((state: boolean) => {
    _setConfirmState(state);
  }, [_setConfirmState]);

  const getConfirmState = useCallback(() => {
    return _confirmState;
  }, [_confirmState]);

  const handleCloseDialog = useCallback((closeState: "dismiss" | "confirm") => {
    if (closeState === "dismiss") {
      setAgreedToUnsafeRoles(false);
      setConfirmState(false);
    }
    if (closeState === "confirm") {
      setAgreedToUnsafeRoles(true);
      setConfirmState(false);
    }
    setDialogOpen("unsafeRoles", false);
  }, [setDialogOpen, setAgreedToUnsafeRoles]);

  return {
    getConfirmState,
    toggleConfirmState,
    handleCloseDialog,
    agreedToUnSafeRoles
  };
};
