import { useAppStore } from "@core/stores/appStore.ts";

const notificationSound = new Audio("/notification.wav"); //change sound if needed

let isPlaying = false;

export const playNotificationSound = () => {
  const { notifications } = useAppStore.getState();
  if (notifications && !isPlaying) {
    isPlaying = true;
    notificationSound.play();

    notificationSound.onended = () => {
      isPlaying = false;
    };
  }
};
