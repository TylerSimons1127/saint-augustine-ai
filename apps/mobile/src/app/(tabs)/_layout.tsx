import { Tabs } from "expo-router";
import { Icon, useTheme } from "../../components/ui";
import { fonts } from "../../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export default function TabLayout() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.paper,
          borderTopColor: c.line,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 12,
          lineHeight: 16,
        },
        sceneStyle: { backgroundColor: c.canvas },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => (
            <Icon name="message-circle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: "Study",
          tabBarIcon: ({ color }) => <Icon name="book-open" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pray"
        options={{
          title: "Pray",
          tabBarIcon: ({ color }) => <Icon name="heart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => <Icon name="sunrise" color={color} />,
        }}
      />
    </Tabs>
  );
}
