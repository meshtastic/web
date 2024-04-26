import { useAppStore } from '@core/stores/appStore.js';

const notificationSound = new Audio("/notification.mp3");

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
