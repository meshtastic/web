export const requestNotificationPermission = async (): Promise<void> => {
  if (window.Notification && Notification.permission !== 'denied') {
    await Notification.requestPermission();
  }
};

export const showNotification = (title: string, body: string): void => {
  new Notification(title, {
    body,
    icon: 'android-512.png',
  });
};
