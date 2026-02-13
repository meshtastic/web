import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUIStore } from "./store.ts";

describe("useUIStore", () => {
  beforeEach(() => {
    // Reset store state between tests
    useUIStore.setState({
      pendingFieldReset: null,
      dialogs: {
        import: false,
        QR: false,
        shutdown: false,
        reboot: false,
        deviceName: false,
        deviceShare: false,
        nodeRemoval: false,
        nodeDetails: false,
        unsafeRoles: false,
        refreshKeys: false,
        deleteMessages: false,
        managedMode: false,
        clientNotification: false,
        resetNodeDb: false,
        factoryResetDevice: false,
        factoryResetConfig: false,
        tracerouteResponse: false,
        deviceReboot: false,
        deviceDisconnect: false,
      },
      messageTabs: [],
      activeMessageTabId: null,
      secondaryMessageTabId: null,
      messageSplitMode: "none",
    });
  });

  describe("pendingFieldReset actions", () => {
    it("resetField sets pendingFieldReset state", () => {
      const reset = {
        changeType: "user",
        fieldPath: "longName",
        value: "Original Name",
      };

      useUIStore.getState().resetField(reset);

      expect(useUIStore.getState().pendingFieldReset).toEqual(reset);
    });

    it("resetField with variant sets full reset state", () => {
      const reset = {
        changeType: "config",
        variant: "lora",
        fieldPath: "region",
        value: 1,
      };

      useUIStore.getState().resetField(reset);

      expect(useUIStore.getState().pendingFieldReset).toEqual(reset);
    });

    it("clearPendingReset clears the pendingFieldReset state", () => {
      // Set a reset first
      useUIStore.getState().resetField({
        changeType: "user",
        fieldPath: "longName",
        value: "Test",
      });

      expect(useUIStore.getState().pendingFieldReset).not.toBeNull();

      // Clear it
      useUIStore.getState().clearPendingReset();

      expect(useUIStore.getState().pendingFieldReset).toBeNull();
    });

    it("resetField overwrites previous pending reset", () => {
      useUIStore.getState().resetField({
        changeType: "user",
        fieldPath: "longName",
        value: "First",
      });

      useUIStore.getState().resetField({
        changeType: "config",
        variant: "device",
        fieldPath: "role",
        value: 2,
      });

      const state = useUIStore.getState().pendingFieldReset;
      expect(state?.changeType).toBe("config");
      expect(state?.variant).toBe("device");
      expect(state?.fieldPath).toBe("role");
      expect(state?.value).toBe(2);
    });
  });

  describe("dialog actions", () => {
    it("setDialogOpen opens a dialog", () => {
      useUIStore.getState().setDialogOpen("QR", true);
      expect(useUIStore.getState().dialogs.QR).toBe(true);
    });

    it("setDialogOpen closes a dialog", () => {
      useUIStore.getState().setDialogOpen("QR", true);
      useUIStore.getState().setDialogOpen("QR", false);
      expect(useUIStore.getState().dialogs.QR).toBe(false);
    });

    it("getDialogOpen returns dialog state", () => {
      useUIStore.getState().setDialogOpen("shutdown", true);
      expect(useUIStore.getState().getDialogOpen("shutdown")).toBe(true);
      expect(useUIStore.getState().getDialogOpen("reboot")).toBe(false);
    });
  });

  describe("message tab actions", () => {
    let mockTime = 1000;

    beforeEach(() => {
      mockTime = 1000;
      vi.spyOn(Date, "now").mockImplementation(() => mockTime++);
    });

    it("openMessageTab creates a new tab", () => {
      useUIStore.getState().openMessageTab(123, "direct");

      const state = useUIStore.getState();
      expect(state.messageTabs.length).toBe(1);
      const tab = state.messageTabs[0];
      expect(tab).toBeDefined();
      expect(tab?.contactId).toBe(123);
      expect(tab?.type).toBe("direct");
      expect(state.activeMessageTabId).toBe(tab?.id);
    });

    it("openMessageTab reuses existing tab for same contact", () => {
      useUIStore.getState().openMessageTab(123, "direct");
      const firstTabId = useUIStore.getState().activeMessageTabId;

      useUIStore.getState().openMessageTab(123, "direct");

      expect(useUIStore.getState().messageTabs.length).toBe(1);
      expect(useUIStore.getState().activeMessageTabId).toBe(firstTabId);
    });

    it("closeMessageTab removes tab and updates active", () => {
      useUIStore.getState().openMessageTab(1, "direct");
      useUIStore.getState().openMessageTab(2, "direct");

      const tabs = useUIStore.getState().messageTabs;
      const firstTab = tabs[0];
      const secondTab = tabs[1];
      expect(firstTab).toBeDefined();
      expect(secondTab).toBeDefined();

      useUIStore.getState().closeMessageTab(secondTab!.id);

      expect(useUIStore.getState().messageTabs.length).toBe(1);
      expect(useUIStore.getState().activeMessageTabId).toBe(firstTab!.id);
    });

    it("closeAllMessageTabs clears all tabs", () => {
      useUIStore.getState().openMessageTab(1, "direct");
      useUIStore.getState().openMessageTab(2, "channel");

      useUIStore.getState().closeAllMessageTabs();

      expect(useUIStore.getState().messageTabs.length).toBe(0);
      expect(useUIStore.getState().activeMessageTabId).toBeNull();
    });
  });
});
