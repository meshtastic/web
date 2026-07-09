import { useCallback, useEffect, useRef, useState } from "react";
import { STRICT_PACKET_SIGNATURE_POLICY_KEY } from "./packetAuthenticityPolicy.ts";

export const usePacketAuthenticityConfirmation = (hasXeddsa: boolean) => {
  const [strictDialogOpen, setStrictDialogOpen] = useState(false);
  const pendingResolution = useRef<((approved: boolean) => void) | null>(null);
  const capability = useRef(hasXeddsa);
  capability.current = hasXeddsa;

  const resolvePending = useCallback((approved: boolean) => {
    const resolve = pendingResolution.current;
    pendingResolution.current = null;
    setStrictDialogOpen(false);
    resolve?.(approved && capability.current);
  }, []);

  const validateSelection = useCallback(
    (policyKey: string): Promise<boolean> => {
      if (!hasXeddsa) {
        return Promise.resolve(false);
      }

      if (policyKey !== STRICT_PACKET_SIGNATURE_POLICY_KEY) {
        return Promise.resolve(true);
      }

      pendingResolution.current?.(false);
      setStrictDialogOpen(true);

      return new Promise((resolve) => {
        pendingResolution.current = resolve;
      });
    },
    [hasXeddsa],
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resolvePending(false);
      }
    },
    [resolvePending],
  );

  useEffect(() => {
    if (!hasXeddsa) {
      resolvePending(false);
    }
  }, [hasXeddsa, resolvePending]);

  useEffect(
    () => () => {
      pendingResolution.current?.(false);
      pendingResolution.current = null;
    },
    [],
  );

  return {
    strictDialogOpen,
    validateSelection,
    confirmStrict: () => resolvePending(true),
    cancelStrict: () => resolvePending(false),
    handleDialogOpenChange,
  };
};
