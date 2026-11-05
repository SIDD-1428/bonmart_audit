import React, { createContext, useContext, useState } from "react";

type NotificationData = {
  title: string;
  body: string;
  orderId?: string;
};

type NotificationContextType = {
  notification: NotificationData | null;
  showNotification: (data: NotificationData) => void;
  hideNotification: () => void;
};

const NotificationContext = createContext<NotificationContextType>(null!);

let notificationHandler:
  | ((data: NotificationData) => void)
  | null = null;

export function showNotification(data: NotificationData) {
  notificationHandler?.(data);
}

export function NotificationProvider({ children }: any) {
  const [notification, setNotification] =
    useState<NotificationData | null>(null);

  const showNotificationInternal = (data: NotificationData) => {
  setNotification(data);

  setTimeout(() => {
    setNotification(null);
  }, 4000);
};

  const hideNotification = () => {
    setNotification(null);
  };
notificationHandler = showNotificationInternal;
  return (
    <NotificationContext.Provider
      value={{
        notification,
        showNotification: showNotificationInternal,
        hideNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () =>
  useContext(NotificationContext);