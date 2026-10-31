import React, {
  useCallback,
  useEffect,
  useId,
  type ComponentProps,
} from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Image,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextProps,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useApp } from "../lib/state";
import { atmospheres, dark, fonts, light, radius } from "../theme";
export function useTheme() {
  const { state } = useApp();
  const scheme = useColorScheme();
  const isDark =
    state.settings.theme === "dark" ||
    (state.settings.theme === "system" && scheme === "dark");
  return {
    c: isDark ? dark : light,
    isDark,
    scale: state.settings.size === "large" ? 1.18 : 1,
  };
}
export function T({
  kind = "body",
  style,
  ...props
}: TextProps & { kind?: "body" | "title" | "heading" | "caption" | "label" }) {
  const { c, scale } = useTheme();
  const map = {
    body: {
      fontSize: 16,
      lineHeight: 25,
      fontFamily: fonts.body,
      color: c.ink,
    },
    title: {
      fontSize: 36,
      lineHeight: 40,
      fontFamily: fonts.title,
      color: c.ink,
    },
    heading: {
      fontSize: 25,
      lineHeight: 31,
      fontFamily: fonts.title,
      color: c.ink,
    },
    caption: {
      fontSize: 13,
      lineHeight: 19,
      fontFamily: fonts.body,
      color: c.muted,
    },
    label: {
      fontSize: 12,
      lineHeight: 18,
      letterSpacing: 1.5,
      fontFamily: fonts.bold,
      color: c.muted,
    },
  };
  const m = map[kind];
  const accessibilityRole =
    props.accessibilityRole ??
    (kind === "title" || kind === "heading" ? "header" : undefined);
  const customStyle = StyleSheet.flatten(style);
  const scaledCustomStyle =
    customStyle && scale !== 1
      ? {
          ...customStyle,
          ...(typeof customStyle.fontSize === "number"
            ? { fontSize: customStyle.fontSize * scale }
            : {}),
          ...(typeof customStyle.lineHeight === "number"
            ? { lineHeight: customStyle.lineHeight * scale }
            : {}),
        }
      : style;
  return (
    <Text
      {...props}
      accessibilityRole={accessibilityRole}
      style={[
        m,
        { fontSize: m.fontSize * scale, lineHeight: m.lineHeight * scale },
        scaledCustomStyle,
      ]}
    />
  );
}
export function Icon({
  name,
  size = 20,
  color,
}: {
  name: ComponentProps<typeof Feather>["name"];
  size?: number;
  color?: ComponentProps<typeof Feather>["color"];
}) {
  const { c } = useTheme();
  return (
    <Feather
      accessible={false}
      name={name}
      size={size}
      color={color || c.ink}
    />
  );
}
export function Button({
  label,
  onPress,
  icon,
  primary = false,
  disabled = false,
  selected,
  compact = false,
  style,
  labelStyle,
}: {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Feather>["name"];
  primary?: boolean;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  labelStyle?: TextProps["style"];
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          paddingHorizontal: compact ? 12 : 16,
          paddingVertical: 10,
          borderRadius: radius.control,
          borderWidth: 1,
          borderColor: primary ? c.primary : c.line,
          backgroundColor: primary ? c.primary : c.paper,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={17} color={primary ? c.onPrimary : c.ink} />
      ) : null}
      <T
        style={{
          fontFamily: fonts.medium,
          fontSize: 14,
          color: primary ? c.onPrimary : c.ink,
        ...StyleSheet.flatten(labelStyle),
      }}
      >
        {label}
      </T>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
  buttonStyle,
}: {
  name: ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  buttonStyle?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 44,
        width: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
        ...buttonStyle,
      })}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.paper,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.card,
          padding: 20,
          gap: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Input(props: TextInputProps) {
  const { c, scale } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[
        {
          minHeight: 48,
          fontFamily: fonts.body,
          fontSize: 16 * scale,
          lineHeight: 24 * scale,
          color: c.ink,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.control,
          padding: 12,
          backgroundColor: c.paper,
          textAlignVertical: "top",
        },
        props.style,
      ]}
    />
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[{ flexDirection: "row", alignItems: "center", gap: 12 }, style]}
    >
      {children}
    </View>
  );
}
export function Rule() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line }} />;
}
export function Notice({
  text,
  error = false,
  onRetry,
  announce = false,
}: {
  text: string;
  error?: boolean;
  onRetry?: () => void;
  announce?: boolean;
}) {
  const { c } = useTheme();
  useEffect(() => {
    if (announce && Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibilityWithOptions(text, {
        queue: true,
      });
    }
  }, [announce, text]);

  return (
    <View
      accessibilityLiveRegion="polite"
      role="status"
      style={{
        padding: 14,
        gap: 8,
        borderLeftWidth: 3,
        borderLeftColor: error ? c.danger : c.accent,
        backgroundColor: c.paper,
        borderRadius: 8,
      }}
    >
      <T kind="caption" style={{ color: error ? c.danger : c.muted }}>
        {text}
      </T>
      {onRetry && (
        <Button label="Try again" icon="refresh-cw" onPress={onRetry} compact />
      )}
    </View>
  );
}
export function Loading({
  label = "Opening your reading room…",
}: {
  label?: string;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        backgroundColor: c.canvas,
      }}
    >
      <ActivityIndicator color={c.primary} />
      <T kind="caption">{label}</T>
    </View>
  );
}
export function Canvas({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const { c, isDark } = useTheme();
  return (
    <ImageBackground
      source={atmospheres[state.settings.atmosphere].image}
      resizeMode="cover"
      style={{ flex: 1, backgroundColor: c.canvas, overflow: "hidden" }}
      imageStyle={{ opacity: 1 }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: isDark
            ? "rgba(16,25,37,0.45)"
            : "rgba(244,239,230,0.04)",
        }}
      >
        {children}
      </View>
    </ImageBackground>
  );
}
export function Screen({
  children,
  title,
  eyebrow,
  scroll = true,
  back = false,
  action,
  leading,
  centerBrand = true,
}: {
  children: React.ReactNode;
  title?: string;
  eyebrow?: string;
  scroll?: boolean;
  back?: boolean;
  action?: React.ReactNode;
  leading?: React.ReactNode;
  centerBrand?: boolean;
}) {
  const { c } = useTheme();
  const { storageError } = useApp();
  const screenId = useId();
  const toolbarButtonStyle: ViewStyle = {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 9,
    backgroundColor: "rgba(255,253,249,0.55)",
  };
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "web") return;
      const frame = requestAnimationFrame(() => {
        const screenRoot = document.getElementById(screenId);
        if (!screenRoot) return;

        const hiddenAncestor = screenRoot.closest<HTMLElement>("[inert]");
        if (
          hiddenAncestor &&
          !screenRoot.closest('[aria-hidden="true"]')
        ) {
          hiddenAncestor.inert = false;
        }

        document
          .querySelectorAll<HTMLElement>('[aria-hidden="true"]')
          .forEach((hiddenScreen) => {
            if (
              hiddenScreen.querySelector(
                'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
              )
            ) {
              hiddenScreen.inert = true;
            }
          });

        const heading = Array.from(
          screenRoot.querySelectorAll<HTMLElement>(
            '[role="heading"], h1, h2, h3, h4, h5, h6',
          ),
        ).find((node) => {
          const rect = node.getBoundingClientRect();
          return (
            !node.closest('[aria-hidden="true"]') &&
            !node.closest("[inert]") &&
            rect.width > 0 &&
            rect.height > 0 &&
            getComputedStyle(node).visibility === "visible"
          );
        });
        if (!heading) return;
        heading.tabIndex = -1;
        heading.style.outline = "none";
        heading.focus({ preventScroll: true });
      });
      return () => {
        cancelAnimationFrame(frame);
        const active = document.activeElement;
        const screenRoot = document.getElementById(screenId);
        if (active instanceof HTMLElement && screenRoot?.contains(active)) {
          active.blur();
        }
        requestAnimationFrame(() => {
          const inactiveScreen = document
            .getElementById(screenId)
            ?.closest<HTMLElement>('[aria-hidden="true"]');
          if (inactiveScreen) inactiveScreen.inert = true;
        });
      };
    }, [screenId]),
  );
  const content = (
    <View
      style={{
        width: "100%",
        maxWidth: 720,
        alignSelf: "center",
        paddingHorizontal: 16,
        paddingTop: 20,
        gap: 16,
        paddingBottom: 32,
        ...(!scroll ? { flex: 1 } : {}),
      }}
    >
      {title ? (
        <View style={{ gap: 6 }}>
          {eyebrow ? <T kind="label">{eyebrow.toUpperCase()}</T> : null}
          <T kind="title">{title}</T>
        </View>
      ) : null}
      {storageError ? <Notice text={storageError} error announce /> : null}
      {children}
    </View>
  );
  return (
    <Canvas>
      <SafeAreaView
        nativeID={screenId}
        edges={["top", "left", "right"]}
        style={{ flex: 1 }}
      >
        <View
          style={{
            height: 64,
            borderBottomWidth: 1,
            borderColor: c.line,
            backgroundColor: c.overlay,
          }}
        >
          <Row
            style={{
              maxWidth: 720,
              width: "100%",
              alignSelf: "center",
              paddingHorizontal: 16,
              flex: 1,
            }}
          >
            {leading !== undefined ? leading : back ? (
              <IconButton
                name="chevron-left"
                label="Go back"
                buttonStyle={toolbarButtonStyle}
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/")
                }
              />
            ) : (
              <IconButton
                name="message-square"
                label="Conversations"
                buttonStyle={toolbarButtonStyle}
                onPress={() => router.push("/history")}
              />
            )}
            {centerBrand ? (
              <View
                accessible={false}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Image
                  source={require("../../assets/brand/saint-augustine-mark.png")}
                  resizeMode="cover"
                  style={{ width: 24, height: 24, borderRadius: 6 }}
                />
                <T
                  style={{
                    fontFamily: fonts.title,
                    fontSize: 17,
                    lineHeight: 23,
                  }}
                >
                  Saint AugustineAI
                </T>
              </View>
            ) : (
              <T
                style={{
                  flex: 1,
                  fontFamily: fonts.title,
                  fontSize: 16,
                  lineHeight: 22,
                  textAlign: "left",
                }}
              >
                Saint AugustineAI
              </T>
            )}
            {action ||
              (back ? (
                <View style={{ width: 44 }} />
              ) : (
                <IconButton
                name="settings"
                label="Settings"
                  buttonStyle={toolbarButtonStyle}
                  onPress={() => router.push("/settings")}
                />
              ))}
          </Row>
        </View>
        {scroll ? (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {content}
          </ScrollView>
        ) : (
          title ? content : children
        )}
      </SafeAreaView>
    </Canvas>
  );
}
export async function openLink(url: string) {
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return;
    await Linking.openURL(url);
  } catch {
    if (Platform.OS === "web") console.warn("Could not open source link.");
  }
}
export function SourceLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => openLink(url)}
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <Row>
        <Icon name="external-link" size={15} />
        <T kind="caption" style={{ textDecorationLine: "underline", flex: 1 }}>
          {label}
        </T>
      </Row>
    </Pressable>
  );
}
export const common = StyleSheet.create({
  gap: { gap: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flex: { flex: 1 },
});
