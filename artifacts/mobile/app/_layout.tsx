import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { configureAuth, configureOn401 } from "@workspace/api-client-react";
import { getToken, fireOn401, getBaseUrl } from "@/lib/api";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BetaTrialExpiredScreen } from "@/components/BetaTrialExpiredScreen";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PlannerProvider } from "@/contexts/PlannerContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

configureAuth({ tokenProvider: getToken, credentials: "include", baseUrl: getBaseUrl });
configureOn401(fireOn401);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [betaExpired, setBetaExpired] = useState(false);
  const choosingPlanRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    const inAuthScreen = segments[0] === "login" || segments[0] === "register";
    if (!user && !inAuthScreen) {
      router.replace("/login");
    } else if (user && inAuthScreen) {
      router.replace("/(tabs)/dashboard");
    }
  }, [user, loading, segments, router]);

  const checkBeta = useCallback(async () => {
    if (!user || isAdmin) {
      setBetaExpired(false);
      return;
    }
    try {
      const { apiGet } = await import("@/lib/api");
      const data = await apiGet<{ isBetaTester: boolean; trialExpired: boolean }>("auth/beta-status");
      setBetaExpired(data.trialExpired === true);
    } catch {
      // If check fails, don't block user
    }
  }, [user?.id, isAdmin]);

  // Check on user login/change
  useEffect(() => {
    if (!user || isAdmin) {
      setBetaExpired(false);
      return;
    }
    checkBeta();
  }, [user?.id, isAdmin]);

  // Re-check on navigation — but skip while user is actively choosing a plan
  useEffect(() => {
    if (!user || isAdmin || loading) return;
    // Don't re-check when navigating to subscription (that's the fix path)
    const currentTab = segments[1] as string | undefined;
    if (choosingPlanRef.current && currentTab === "subscription") return;
    // If user navigated away from subscription after choosing plan, re-check
    if (choosingPlanRef.current && currentTab !== "subscription") {
      choosingPlanRef.current = false;
      checkBeta();
      return;
    }
    checkBeta();
  }, [segments.join("/")]);

  function handleChoosePlan() {
    choosingPlanRef.current = true;
    setBetaExpired(false);
    router.push("/(tabs)/subscription");
  }

  return (
    <>
      {children}
      {betaExpired && (
        <BetaTrialExpiredScreen
          onLogout={logout}
          onChoosePlan={handleChoosePlan}
        />
      )}
    </>
  );
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: "#0A0A0F" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <NotificationProvider>
                <PlannerProvider>
                  <AIAssistantProvider>
                    <GestureHandlerRootView>
                      <KeyboardProvider>
                        <AuthGuard>
                          <RootLayoutNav />
                        </AuthGuard>
                      </KeyboardProvider>
                    </GestureHandlerRootView>
                  </AIAssistantProvider>
                </PlannerProvider>
              </NotificationProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
