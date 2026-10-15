import { useEffect } from "react";
import { Stack } from "expo-router";
import { PageTitle } from "../components/page-title";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "../lib/state";
import { Loading, useTheme } from "../components/ui";
export { ErrorBoundary } from "expo-router";
SplashScreen.preventAutoHideAsync().catch(() => {});
function Navigator() {
  const { ready } = useApp();
  const { c, isDark } = useTheme();
  if (!ready) return <Loading />;
  return (
    <>
      <PageTitle />
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.canvas },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        <Stack.Screen name="history" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Hanken: require("@expo-google-fonts/hanken-grotesk/400Regular/HankenGrotesk_400Regular.ttf"),
    HankenMedium: require("@expo-google-fonts/hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf"),
    HankenBold: require("@expo-google-fonts/hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf"),
    Newsreader: require("@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf"),
  });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Navigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
