import {
  UNSAFE_ROLES,
  useUnsafeRolesDialog,
} from "@shared/components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog.ts";
import { eventBus } from "@shared/utils/eventBus";
import { renderHook } from "@testing-library/react";
import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@shared/utils/eventBus", () => ({
  eventBus: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

const mockUIStore = {
  setDialogOpen: vi.fn(),
};

vi.mock("@state/index.ts", () => ({
  useUIStore: (
    selector: (state: {
      setDialogOpen: typeof mockUIStore.setDialogOpen;
    }) => unknown,
  ) => selector({ setDialogOpen: mockUIStore.setDialogOpen }),
}));

describe("useUnsafeRolesDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderUnsafeRolesHook = () => {
    return renderHook(() => useUnsafeRolesDialog());
  };

  describe("handleCloseDialog", () => {
    it("should call setDialogOpen with correct parameters when dialog is closed", () => {
      const { result } = renderUnsafeRolesHook();

      result.current.handleCloseDialog();

      expect(mockUIStore.setDialogOpen).toHaveBeenCalledWith(
        "unsafeRoles",
        false,
      );
    });
  });

  describe("validateRoleSelection", () => {
    it("should resolve with true for safe roles without opening dialog", async () => {
      const { result } = renderUnsafeRolesHook();
      const safeRole = "SAFE_ROLE";

      const validationResult =
        await result.current.validateRoleSelection(safeRole);

      expect(validationResult).toBe(true);
      expect(mockUIStore.setDialogOpen).not.toHaveBeenCalled();
    });

    it("should open dialog for unsafe roles and resolve with true when confirmed", async () => {
      const { result } = renderUnsafeRolesHook();

      const validationPromise = result.current.validateRoleSelection(
        UNSAFE_ROLES[0]!,
      );

      expect(mockUIStore.setDialogOpen).toHaveBeenCalledWith(
        "unsafeRoles",
        true,
      );
      expect(eventBus.on).toHaveBeenCalledWith(
        "dialog:unsafeRoles",
        expect.any(Function),
      );

      const onHandler = (eventBus.on as Mock).mock.calls[0]![1];
      onHandler({ action: "confirm" });
      const validationResult = await validationPromise;

      expect(validationResult).toBe(true);
      expect(eventBus.off).toHaveBeenCalledWith(
        "dialog:unsafeRoles",
        onHandler,
      );
    });

    it("should resolve with false when user dismisses the dialog", async () => {
      const { result } = renderUnsafeRolesHook();
      const validationPromise = result.current.validateRoleSelection(
        UNSAFE_ROLES[0]!,
      );
      const onHandler = (eventBus.on as Mock).mock.calls[0]![1];
      onHandler({ action: "dismiss" });

      const validationResult = await validationPromise;
      expect(validationResult).toBe(false);
      expect(eventBus.off).toHaveBeenCalledWith(
        "dialog:unsafeRoles",
        onHandler,
      );
    });

    it("should clean up event listener after response", async () => {
      const { result } = renderUnsafeRolesHook();

      const validationPromise = result.current.validateRoleSelection(
        UNSAFE_ROLES[1]!,
      );
      const onHandler = (eventBus.on as Mock).mock.calls[0]![1];

      onHandler({ action: "confirm" });
      await validationPromise;

      expect(eventBus.off).toHaveBeenCalledWith(
        "dialog:unsafeRoles",
        onHandler,
      );
    });
  });

  it("should work with all unsafe roles", async () => {
    const { result } = renderUnsafeRolesHook();

    for (const unsafeRole of UNSAFE_ROLES) {
      mockUIStore.setDialogOpen.mockClear();
      (eventBus.on as Mock).mockClear();

      const validationPromise =
        result.current.validateRoleSelection(unsafeRole);

      expect(mockUIStore.setDialogOpen).toHaveBeenCalledWith(
        "unsafeRoles",
        true,
      );

      const onHandler = (eventBus.on as Mock).mock.calls[0]![1];
      onHandler({ action: "confirm" });

      const validationResult = await validationPromise;

      expect(validationResult).toBe(true);
    }
  });
});
