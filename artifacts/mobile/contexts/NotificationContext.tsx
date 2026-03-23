import React, { createContext, useContext, useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export interface NotificationSettings {
  permissionGranted: boolean;
  killZoneLondon: boolean;
  killZoneNY: boolean;
  killZoneAsian: boolean;
  morningReminder: boolean;
  morningTime: string;
  eveningReminder: boolean;
  eveningTime: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  permissionGranted: false,
  killZoneLondon: false,
  killZoneNY: false,
  killZoneAsian: false,
  morningReminder: false,
  morningTime: "07:00",
  eveningReminder: false,
  eveningTime: "20:00",
};

export type NotificationScreen = "(tabs)/index" | "(tabs)/journal";

interface NotificationContextType {
  settings: NotificationSettings;
  loading: boolean;
  requestPermission: () => Promise<boolean>;
  updateSettings: (patch: Partial<NotificationSettings>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  }, []);

  const value: NotificationContextType = {
    settings: DEFAULT_SETTINGS,
    loading: false,
    requestPermission: async () => false,
    updateSettings: async () => {},
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
