// import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// import { Network } from '@components/PageComponents/Config/Network/index.tsx';
// import { useDevice } from "@core/stores/deviceStore.ts";
// import { Protobuf } from "@meshtastic/core";

// vi.mock('@core/stores/deviceStore', () => ({
//   useDevice: vi.fn()
// }));

// vi.mock('@components/Form/DynamicForm', () => ({
//   DynamicForm: vi.fn(({ onSubmit }) => {
//     return (
//       <div data-testid="dynamic-form">
//         <select
//           data-testid="role-select"
//           onChange={(e) => {
//             const mockData = { role: e.target.value };
//             onSubmit(mockData);
//           }}
//         >
//           {Object.entries(Protobuf.Config.Config_DeviceConfig_Role).map(([key, value]) => (
//             <option key={key} value={value}>
//               {key}
//             </option>
//           ))}
//         </select>
//         <button type="submit"
//           data-testid="submit-button"
//           onClick={() => onSubmit({ role: "CLIENT" })}
//         >
//           Submit
//         </button>
//       </div>
//     );
//   })
// }));

// describe('Network component', () => {
//   const setWorkingConfigMock = vi.fn();
//   const mockDeviceConfig = {
//     role: "CLIENT",
//     buttonGpio: 0,
//     buzzerGpio: 0,
//     rebroadcastMode: "ALL",
//     nodeInfoBroadcastSecs: 300,
//     doubleTapAsButtonPress: false,
//     disableTripleClick: false,
//     ledHeartbeatDisabled: false,
//   };

//   beforeEach(() => {
//     vi.resetAllMocks();

//     (useDevice as any).mockReturnValue({
//       config: {
//         device: mockDeviceConfig
//       },
//       setWorkingConfig: setWorkingConfigMock
//     });

//   });

//   afterEach(() => {
//     vi.clearAllMocks();
//   });

//   it('should render the Network form', () => {
//     render(<Network />);
//     expect(screen.getByTestId('dynamic-form')).toBeInTheDocument();
//   });

//   it('should call setWorkingConfig when form is submitted', async () => {
//     render(<Network />);

//     fireEvent.click(screen.getByTestId('submit-button'));

//     await waitFor(() => {
//       expect(setWorkingConfigMock).toHaveBeenCalledWith(
//         expect.objectContaining({
//           payloadVariant: {
//             case: "device",
//             value: expect.objectContaining({ role: "CLIENT" })
//           }
//         })
//       );
//     });
//   });


//   it('should create config with proper structure', async () => {
//     render(<Network />);

//     // Simulate form submission
//     fireEvent.click(screen.getByTestId('submit-button'));

//     await waitFor(() => {
//       expect(setWorkingConfigMock).toHaveBeenCalledWith(
//         expect.objectContaining({
//           payloadVariant: {
//             case: "network",
//             value: expect.any(Object)
//           }
//         })
//       );
//     });
//   });
// });

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Network } from '@components/PageComponents/Config/Network/index.tsx';
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";

vi.mock('@core/stores/deviceStore', () => ({
  useDevice: vi.fn()
}));

vi.mock('@components/Form/DynamicForm', async () => {
  const React = await import('react');
  const { useState } = React;

  return {
    DynamicForm: ({ onSubmit, defaultValues }: any) => {
      const [wifiEnabled, setWifiEnabled] = useState(defaultValues.wifiEnabled ?? false);
      const [ssid, setSsid] = useState(defaultValues.wifiSsid ?? '');
      const [psk, setPsk] = useState(defaultValues.wifiPsk ?? '');

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              ...defaultValues,
              wifiEnabled,
              wifiSsid: ssid,
              wifiPsk: psk,
            });
          }}
          data-testid="dynamic-form"
        >
          <input
            type="checkbox"
            aria-label="WiFi Enabled"
            checked={wifiEnabled}
            onChange={(e) => setWifiEnabled(e.target.checked)}
          />
          <input
            aria-label="SSID"
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            disabled={!wifiEnabled}
          />
          <input
            aria-label="PSK"
            value={psk}
            onChange={(e) => setPsk(e.target.value)}
            disabled={!wifiEnabled}
          />
          <button type="submit" data-testid="submit-button">
            Submit
          </button>
        </form>
      );
    },
  };
});
;

describe('Network component', () => {
  const setWorkingConfigMock = vi.fn();
  const mockNetworkConfig = {
    wifiEnabled: false,
    wifiSsid: '',
    wifiPsk: '',
    ntpServer: '',
    ethEnabled: false,
    addressMode: Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
    ipv4Config: {
      ip: 0,
      gateway: 0,
      subnet: 0,
      dns: 0,
    },
    enabledProtocols:
      Protobuf.Config.Config_NetworkConfig_ProtocolFlags.NO_BROADCAST,
    rsyslogServer: '',
  };

  beforeEach(() => {
    vi.resetAllMocks();

    (useDevice as any).mockReturnValue({
      config: {
        network: mockNetworkConfig
      },
      setWorkingConfig: setWorkingConfigMock
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Network form', () => {
    render(<Network />);
    expect(screen.getByTestId('dynamic-form')).toBeInTheDocument();
  });

  it('should disable SSID and PSK fields when wifi is off', () => {
    render(<Network />);
    expect(screen.getByLabelText("SSID")).toBeDisabled();
    expect(screen.getByLabelText("PSK")).toBeDisabled();
  });

  it('should enable SSID and PSK when wifi is toggled on', async () => {
    render(<Network />);
    const toggle = screen.getByLabelText("WiFi Enabled");
    screen.debug()

    fireEvent.click(toggle); // turns wifiEnabled = true

    await waitFor(() => {
      expect(screen.getByLabelText("SSID")).not.toBeDisabled();
      expect(screen.getByLabelText("PSK")).not.toBeDisabled();
    });
  });

  it('should call setWorkingConfig with the right structure on submit', async () => {
    render(<Network />);

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(setWorkingConfigMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payloadVariant: {
            case: "network",
            value: expect.objectContaining({
              wifiEnabled: false,
              wifiSsid: '',
              wifiPsk: '',
              ntpServer: '',
              ethEnabled: false,
              rsyslogServer: '',
            })
          }
        })
      );
    });
  });

  it('should submit valid data after enabling wifi and entering SSID and PSK', async () => {
    render(<Network />);
    fireEvent.click(screen.getByLabelText("WiFi Enabled"));

    fireEvent.change(screen.getByLabelText("SSID"), {
      target: { value: "MySSID" }
    });

    fireEvent.change(screen.getByLabelText("PSK"), {
      target: { value: "MySecretPSK" }
    });

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(setWorkingConfigMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payloadVariant: {
            case: "network",
            value: expect.objectContaining({
              wifiEnabled: true,
              wifiSsid: "MySSID",
              wifiPsk: "MySecretPSK"
            })
          }
        })
      );
    });
  });
});
