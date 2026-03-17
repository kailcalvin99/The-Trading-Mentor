import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Platform,
  Alert,
  AppState,
  AppStateStatus,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

const STORAGE_KEY = "notification_settings_v1";
const LAST_SYNC_DATE_KEY = "notification_last_sync_date_v1";

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
  killZoneLondon: true,
  killZoneNY: true,
  killZoneAsian: true,
  morningReminder: true,
  morningTime: "07:00",
  eveningReminder: true,
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

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

interface KillZone {
  id: string;
  name: string;
  utcHour: number;
  utcMinute: number;
  screen: NotificationScreen;
}

const KILL_ZONES: KillZone[] = [
  { id: "london", name: "London Open", utcHour: 7, utcMinute: 0, screen: "(tabs)/index" },
  { id: "ny", name: "NY Open", utcHour: 13, utcMinute: 30, screen: "(tabs)/index" },
  { id: "asian", name: "Asian Session", utcHour: 0, utcMinute: 0, screen: "(tabs)/index" },
];

function getTodayUTCDateString(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function utcHourMinuteToLocalMinus5Min(
  utcHour: number,
  utcMinute: number
): { hour: number; minute: number } {
  const now = new Date();
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    utcHour,
    utcMinute,
    0,
    0,
  ));
  utcDate.setUTCMinutes(utcDate.getUTCMinutes() - 5);
  return {
    hour: utcDate.getHours(),
    minute: utcDate.getMinutes(),
  };
}

export function parseTimeStr(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { hour: h, minute: m };
}

function logError(context: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.warn(`[Notifications] ${context}: ${msg}`);
}

async function cancelAllManagedNotifications() {
  if (Platform.OS === "web") return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      const data = notif.content.data as Record<string, unknown> | null;
      if (data?.managed) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (err) {
    logError("cancelAllManagedNotifications", err);
  }
}

async function scheduleKillZoneNotification(zone: KillZone): Promise<void> {
  if (Platform.OS === "web") return;
  const { hour, minute } = utcHourMinuteToLocalMinus5Min(zone.utcHour, zone.utcMinute);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${zone.name} in 5 minutes`,
      body: "Get to your chart — kill zone is about to open.",
      data: { managed: true, screen: zone.screen, zoneId: zone.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

async function scheduleDailyReminder(
  id: string,
  title: string,
  body: string,
  timeStr: string,
  screen: NotificationScreen
): Promise<void> {
  if (Platform.OS === "web") return;
  const parsed = parseTimeStr(timeStr);
  if (!parsed) {
    throw new Error(`Invalid time format for "${id}": "${timeStr}". Use HH:MM (e.g. 07:00).`);
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { managed: true, screen, reminderId: id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: parsed.hour,
      minute: parsed.minute,
    },
  });
}

async function syncNotifications(settings: NotificationSettings): Promise<void> {
  if (Platform.OS === "web") return;
  if (!settings.permissionGranted) return;

  await cancelAllManagedNotifications();

  const errors: string[] = [];

  if (settings.killZoneLondon) {
    try { await scheduleKillZoneNotification(KILL_ZONES[0]); } catch (e) {
      logError("scheduleKillZoneNotification(london)", e);
      errors.push(`London Open: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (settings.killZoneNY) {
    try { await scheduleKillZoneNotification(KILL_ZONES[1]); } catch (e) {
      logError("scheduleKillZoneNotification(ny)", e);
      errors.push(`NY Open: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (settings.killZoneAsian) {
    try { await scheduleKillZoneNotification(KILL_ZONES[2]); } catch (e) {
      logError("scheduleKillZoneNotification(asian)", e);
      errors.push(`Asian Session: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (settings.morningReminder) {
    try {
      await scheduleDailyReminder(
        "morning",
        "Morning Routine",
        "Start your trading day right — complete your morning checklist.",
        settings.morningTime,
        "(tabs)/index"
      );
    } catch (e) {
      logError("scheduleDailyReminder(morning)", e);
      errors.push(`Morning reminder: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (settings.eveningReminder) {
    try {
      await scheduleDailyReminder(
        "evening",
        "Journal Reminder",
        "Take 5 minutes to review and log today's trades.",
        settings.eveningTime,
        "(tabs)/journal"
      );
    } catch (e) {
      logError("scheduleDailyReminder(evening)", e);
      errors.push(`Evening reminder: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  try {
    await AsyncStorage.setItem(LAST_SYNC_DATE_KEY, getTodayUTCDateString());
  } catch (e) {
    logError("persistLastSyncDate", e);
  }

  if (errors.length > 0) {
    Alert.alert(
      "Notification Error",
      `Some notifications could not be scheduled:\n${errors.join("\n")}`
    );
  }
}

async function dailyResyncIfNeeded(settings: NotificationSettings): Promise<void> {
  if (Platform.OS === "web") return;
  if (!settings.permissionGranted) return;
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_DATE_KEY);
    const today = getTodayUTCDateString();
    if (lastSync !== today) {
      await syncNotifications(settings);
    }
  } catch (err) {
    logError("dailyResyncIfNeeded", err);
  }
}

function navigateToScreen(screen: string) {
  try {
    if (screen === "(tabs)/index") {
      router.push("/");
    } else if (screen === "(tabs)/journal") {
      router.push("/(tabs)/journal");
    }
  } catch (err) {
    logError("navigateToScreen", err);
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const hasPrompted = useRef(false);
  const settingsRef = useRef<NotificationSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        try {
          const saved: Partial<NotificationSettings> = JSON.parse(val);
          const merged = { ...DEFAULT_SETTINGS, ...saved };
          setSettings(merged);
          settingsRef.current = merged;
        } catch {
          console.warn("[Notifications] Failed to parse stored settings, using defaults.");
        }
      }
      setLoading(false);
    }).catch((err) => {
      logError("loadSettings", err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (hasPrompted.current) return;
    if (settings.permissionGranted) return;
    if (Platform.OS === "web") return;

    hasPrompted.current = true;

    const timer = setTimeout(async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing === "granted") {
          const updated = { ...settings, permissionGranted: true };
          setSettings(updated);
          settingsRef.current = updated;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          await syncNotifications(updated);
          return;
        }

        Alert.alert(
          "Enable Notifications",
          "Get alerts 5 minutes before kill zones open and daily reminders for your morning routine and journal. You can adjust these in Settings.",
          [
            { text: "Not Now", style: "cancel" },
            {
              text: "Enable",
              onPress: async () => {
                try {
                  const { status } = await Notifications.requestPermissionsAsync();
                  if (status === "granted") {
                    const updated = { ...settingsRef.current, permissionGranted: true };
                    setSettings(updated);
                    settingsRef.current = updated;
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                    await syncNotifications(updated);
                  }
                } catch (err) {
                  logError("permission request (prompt)", err);
                }
              },
            },
          ]
        );
      } catch (err) {
        logError("first-launch permission check", err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [loading, settings]);

  useEffect(() => {
    if (loading) return;
    if (Platform.OS === "web") return;

    void dailyResyncIfNeeded(settingsRef.current);
  }, [loading]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void dailyResyncIfNeeded(settingsRef.current);
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | null;
      if (data?.screen && typeof data.screen === "string") {
        navigateToScreen(data.screen);
      }
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, unknown> | null;
      if (data?.screen && typeof data.screen === "string") {
        navigateToScreen(data.screen);
      }
    }).catch((err) => logError("getLastNotificationResponseAsync", err));

    return () => responseSub.remove();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") {
        const updated = { ...settingsRef.current, permissionGranted: true };
        setSettings(updated);
        settingsRef.current = updated;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        await syncNotifications(updated);
        return true;
      }
      if (existing === "denied") {
        Alert.alert(
          "Notifications Blocked",
          "Please enable notifications in your device Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === "granted";
      const updated = { ...settingsRef.current, permissionGranted: granted };
      setSettings(updated);
      settingsRef.current = updated;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (granted) await syncNotifications(updated);
      return granted;
    } catch (err) {
      logError("requestPermission", err);
      Alert.alert("Error", "Could not request notification permission. Please try again.");
      return false;
    }
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<NotificationSettings>) => {
      const updated = { ...settingsRef.current, ...patch };
      setSettings(updated);
      settingsRef.current = updated;
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        await syncNotifications(updated);
      } catch (err) {
        logError("updateSettings", err);
      }
    },
    []
  );

  return (
    <NotificationContext.Provider value={{ settings, loading, requestPermission, updateSettings }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
