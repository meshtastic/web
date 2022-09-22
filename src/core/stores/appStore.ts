import create from 'zustand';

interface AppState {
  selectedDevice: number;
  devices: {
    id: number;
    num: number;
  }[];

  setSelectedDevice: (deviceId: number) => void;
  addDevice: (device: { id: number; num: number }) => void;
  removeDevice: (deviceId: number) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedDevice: 0,
  devices: [],
  currentPage: "messages",

  setSelectedDevice: (deviceId) =>
    set(() => ({
      selectedDevice: deviceId,
    })),
  addDevice: (device) =>
    set((state) => ({
      devices: [...state.devices, device],
    })),
  removeDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.filter((device) => device.id !== deviceId),
    })),
}));
