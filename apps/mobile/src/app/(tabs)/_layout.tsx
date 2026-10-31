import { Tabs } from "expo-router";
import { Icon, useTheme } from "../../components/ui";
import { fonts } from "../../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export default function TabLayout() {
  const { c, scale } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.paper,
          borderTopColor: c.line,
          height: 68 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 12 * scale,
          lineHeight: 16 * scale,
        },
        sceneStyle: { backgroundColor: c.canvas },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarAccessibilityLabel: "Chat",
          tabBarIcon: ({ color }) => (
            <Icon name="message-circle" color={String(color ?? c.primary)} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: "Study",
          tabBarAccessibilityLabel: "Study",
          tabBarIcon: ({ color }) => (
            <Icon name="book-open" color={String(color ?? c.primary)} />
          ),
        }}
      />
      <Tabs.Screen
        name="pray"
        options={{
          title: "Pray",
          tabBarAccessibilityLabel: "Pray",
          tabBarIcon: ({ color }) => (
            <Icon name="heart" color={String(color ?? c.primary)} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarAccessibilityLabel: "Today",
          tabBarIcon: ({ color }) => (
            <Icon name="sunrise" color={String(color ?? c.primary)} />
          ),
        }}
      />
    </Tabs>
  );
}
