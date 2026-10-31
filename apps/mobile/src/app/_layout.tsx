import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { PageTitle } from "../components/page-title";
import { StatusBar } from "expo-status-bar";
import { DeviceEventEmitter } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../lib/state";
import { useTheme } from "../components/ui";
export { ErrorBoundary } from "expo-router";
SplashScreen.preventAutoHideAsync().catch(() => {});
function Navigator() {
  const { c, isDark } = useTheme();
  const [webThemeDark, setWebThemeDark] = useState<boolean | null>(null);
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "sa-web-theme",
      (dark: boolean) => setWebThemeDark(dark),
    );
    return () => subscription.remove();
  }, []);
  return (
    <>
      <PageTitle />
      <StatusBar
        style={(webThemeDark ?? isDark) ? "light" : "dark"}
      />
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.canvas },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        <Stack.Screen name="history" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}
export default function RootLayout() {
  useFonts({
    Hanken: require("@expo-google-fonts/hanken-grotesk/400Regular/HankenGrotesk_400Regular.ttf"),
    HankenMedium: require("@expo-google-fonts/hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf"),
    HankenBold: require("@expo-google-fonts/hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf"),
    NewsreaderLight: require("@expo-google-fonts/newsreader/300Light/Newsreader_300Light.ttf"),
    Newsreader: require("@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf"),
  });
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Navigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
