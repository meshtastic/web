import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Device } from "@components/PageComponents/Config/Device/index.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useUnsafeRolesDialog } from "@components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog.ts";
import { Protobuf } from "@meshtastic/core";

vi.mock("@core/stores/deviceStore.ts", () => ({
  useDevice: vi.fn(),
}));

vi.mock("@components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog.ts", () => ({
  useUnsafeRolesDialog: vi.fn(),
}));

// Mock the DynamicForm component since we're testing the Device component,
// not the DynamicForm implementation
vi.mock("@components/Form/DynamicForm", () => ({
  DynamicForm: vi.fn(({ onSubmit }) => {
    // Render a simplified version of the form for testing
    return (
      <div data-testid="dynamic-form">
        <select
          data-testid="role-select"
          onChange={(e) => {
            // Simulate the validation and submission process
            const mockData = { role: e.target.value };
            onSubmit(mockData);
          }}
        >
          {Object.entries(Protobuf.Config.Config_DeviceConfig_Role).map((
            [key, value],
          ) => (
            <option key={key} value={value}>
              {key}
            </option>
          ))}
        </select>
        <button
          type="submit"
          data-testid="submit-button"
          onClick={() => onSubmit({ role: "CLIENT" })}
        >
          Submit
        </button>
      </div>
    );
  }),
}));

describe("Device component", () => {
  const setWorkingConfigMock = vi.fn();
  const validateRoleSelectionMock = vi.fn();
  const mockDeviceConfig = {
    role: "CLIENT",
    buttonGpio: 0,
    buzzerGpio: 0,
    rebroadcastMode: "ALL",
    nodeInfoBroadcastSecs: 300,
    doubleTapAsButtonPress: false,
    disableTripleClick: false,
    ledHeartbeatDisabled: false,
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock the useDevice hook
    useDevice.mockReturnValue({
      config: {
        device: mockDeviceConfig,
      },
      setWorkingConfig: setWorkingConfigMock,
    });

    // Mock the useUnsafeRolesDialog hook
    validateRoleSelectionMock.mockResolvedValue(true);
    useUnsafeRolesDialog.mockReturnValue({
      validateRoleSelection: validateRoleSelectionMock,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render the Device form", () => {
    render(<Device />);
    expect(screen.getByTestId("dynamic-form")).toBeInTheDocument();
  });

  it("should use the validateRoleSelection from the unsafe roles hook", () => {
    render(<Device />);
    expect(useUnsafeRolesDialog).toHaveBeenCalled();
  });

  it("should call setWorkingConfig when form is submitted", async () => {
    render(<Device />);

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(setWorkingConfigMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payloadVariant: {
            case: "device",
            value: expect.objectContaining({ role: "CLIENT" }),
          },
        }),
      );
    });
  });

  it("should create config with proper structure", async () => {
    render(<Device />);

    // Simulate form submission
    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(setWorkingConfigMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payloadVariant: {
            case: "device",
            value: expect.any(Object),
          },
        }),
      );
    });
  });
});
