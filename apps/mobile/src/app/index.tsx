import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Alert,
  BackHandler,
  DeviceEventEmitter,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { File, Paths } from "expo-file-system";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
} from "react-native-webview";
import { assertWebExportSize } from "../lib/backup-size";
import { buildNativeSharePayload } from "../lib/native-share-payload";
import { resolveWindowTarget } from "../lib/resolve-window-target";

const WEBSITE_URL = "https://staugustineai.vercel.app/";
const WEBSITE_ORIGIN = new URL(WEBSITE_URL).origin;

// Match the browser app's Blob-based .txt/.md/.json exports to a native
// Save/Share sheet. The page remains responsible for creating the exact data.
const NATIVE_WEB_BRIDGE = `
(() => {
  if (window.__saNativeWebBridge || !window.ReactNativeWebView) return true;
  window.__saNativeWebBridge = true;
  let shareId = 0;
  const pendingShares = new Map();
  window.__saNativeShareReply = (id, succeeded, cancelled) => {
    const pending = pendingShares.get(id);
    if (!pending) return;
    pendingShares.delete(id);
    if (succeeded) pending.resolve();
    else {
      const error = new Error(cancelled ? "Share cancelled" : "Share failed");
      error.name = cancelled ? "AbortError" : "NotAllowedError";
      pending.reject(error);
    }
  };
  let clipboardId = 0;
  let lastTrustedGesture = 0;
  const pendingClipboardWrites = new Map();
  ["pointerup", "touchend", "keydown", "click"].forEach((type) => {
    window.addEventListener(type, (event) => {
      if (event.isTrusted) lastTrustedGesture = Date.now();
    }, true);
  });
  window.__saNativeClipboardReply = (id, succeeded) => {
    const pending = pendingClipboardWrites.get(id);
    if (!pending) return;
    pendingClipboardWrites.delete(id);
    if (succeeded) pending.resolve();
    else pending.reject(new Error("Clipboard write failed"));
  };
  const nativeClipboardWriteText = (text) => new Promise((resolve, reject) => {
    if (Date.now() - lastTrustedGesture > 5000) {
      const error = new Error("Clipboard write requires a user action");
      error.name = "NotAllowedError";
      reject(error);
      return;
    }
    const id = String(++clipboardId);
    pendingClipboardWrites.set(id, { resolve, reject });
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "clipboard",
        id,
        text
      }));
    } catch (error) {
      pendingClipboardWrites.delete(id);
      reject(error);
    }
  });
  let clipboard = null;
  try { clipboard = navigator.clipboard; } catch (_) {}
  const browserWriteText = clipboard && typeof clipboard.writeText === "function"
    ? clipboard.writeText.bind(clipboard)
    : null;
  const bridgedClipboardWriteText = async (value) => {
    const text = String(value);
    if (browserWriteText) {
      try {
        await browserWriteText(text);
        return;
      } catch (_) {
        // Some WebViews expose the Clipboard API but reject writes. Fall back
        // to the native pasteboard so the site's Copy action still succeeds.
      }
    }
    return nativeClipboardWriteText(text);
  };
  try {
    if (clipboard) {
      Object.defineProperty(clipboard, "writeText", {
        configurable: true,
        value: bridgedClipboardWriteText
      });
    } else {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: bridgedClipboardWriteText }
      });
    }
  } catch (_) {
    try {
      const fallbackClipboard = clipboard
        ? new Proxy(clipboard, {
            get(target, property) {
              if (property === "writeText") return bridgedClipboardWriteText;
              const value = Reflect.get(target, property, target);
              return typeof value === "function" ? value.bind(target) : value;
            }
          })
        : { writeText: bridgedClipboardWriteText };
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: fallbackClipboard
      });
    } catch (_) {}
  }
  const nativeShare = (data) => new Promise((resolve, reject) => {
    if (Date.now() - lastTrustedGesture > 5000) {
      const error = new Error("Sharing requires a user action");
      error.name = "NotAllowedError";
      reject(error);
      return;
    }
    const id = String(++shareId);
    pendingShares.set(id, { resolve, reject });
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "share",
        id,
        title: data && typeof data.title === "string" ? data.title : "Saint Augustine AI",
        text: data && typeof data.text === "string" ? data.text : "",
        url: data && typeof data.url === "string" ? data.url : ""
      }));
    } catch (error) {
      pendingShares.delete(id);
      reject(error);
    }
  });
  const browserShare = typeof navigator.share === "function"
    ? navigator.share.bind(navigator)
    : null;
  const bridgedShare = async (data) => {
    if (browserShare) {
      try {
        return await browserShare(data);
      } catch (error) {
        // A dismissed system sheet is a completed user choice. Only fall back
        // for WebViews whose browser share implementation is unavailable.
        if (error && error.name === "AbortError") throw error;
      }
    }
    return nativeShare(data);
  };
  try {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: bridgedShare
    });
  } catch (_) {
    try { navigator.share = bridgedShare; } catch (_) {}
  }
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const anchor = this;
    const name = anchor.getAttribute("download");
    const href = anchor.href || "";
    if (!name || !href.startsWith("blob:")) return originalClick.call(anchor);
    fetch(href).then((response) => {
      if (!response.ok) throw new Error("Export could not be read");
      return response.blob();
    }).then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Export could not be read"));
      reader.onload = () => resolve({ data: reader.result, mimeType: blob.type });
      reader.readAsText(blob);
    })).then(({data, mimeType}) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "download",
        name,
        mimeType: mimeType || anchor.type || "text/plain;charset=utf-8",
        data
      }));
    }).catch(() => originalClick.call(anchor));
  };
  const sendAppearance = () => {
    const color = getComputedStyle(document.documentElement).backgroundColor;
    const channels = color.match(/[\\d.]+/g);
    if (!channels || channels.length < 3) return;
    const linear = channels.slice(0, 3).map((channel) => {
      const value = Number(channel) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "appearance",
      dark: luminance < 0.38,
      background: color
    }));
  };
  const appearanceObserver = new MutationObserver(() => requestAnimationFrame(sendAppearance));
  appearanceObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "style"]
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sendAppearance, { once: true });
  } else {
    requestAnimationFrame(sendAppearance);
  }
  return true;
})();
true;
`;

/**
 * Render the deployed browser app directly so mobile iOS and web share the
 * same screens, content, and interaction logic instead of drifting native
 * reimplementations. Native share and download bridges preserve the site's
 * share and export actions in a WebView. WebView patterns follow the
 * react-native-webview guide: https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md
 */
export default function Index() {
  const { webHash, webAction, webIntent } = useLocalSearchParams<{
    webHash?: string;
    webAction?: string;
    webIntent?: string;
  }>();
  const initialHash =
    typeof webHash === "string" &&
    /^#(?:chat|study|prayer|today)(?::topic=[a-z0-9-]+)?$/i.test(webHash)
      ? webHash
      : "";
  const initialAction =
    typeof webAction === "string" &&
    ["settings", "history", "glossary", "saved"].includes(webAction)
      ? webAction
      : "";
  const intentId =
    typeof webIntent === "string" && /^[a-z0-9-]{1,40}$/i.test(webIntent)
      ? webIntent
      : "";
  const actionRunId = `${initialAction}:${intentId}`;
  const websiteUrl = `${WEBSITE_URL}${initialHash}`;
  const webView = useRef<WebView>(null);
  const handledAction = useRef("");
  const loadFailed = useRef(false);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [reload, setReload] = useState(0);
  const [webBackground, setWebBackground] = useState("#f4f0e9");

  const onNavigationStateChange = useCallback((navigation: WebViewNavigation) => {
    setCanGoBack(navigation.canGoBack);
  }, []);

  const openWindow = useCallback((targetUrl: string) => {
    const target = resolveWindowTarget(targetUrl, WEBSITE_ORIGIN);
    if (!target) return;
    if (target.kind === "in-app") {
      // React Native WebView routes target=_blank through onOpenWindow. Keep
      // same-site pages in this view so the app's back gesture returns here.
      // Source: https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md#onopenwindow
      webView.current?.injectJavaScript(
        `window.location.assign(${JSON.stringify(target.href)}); true;`,
      );
      return;
    }
    void Linking.openURL(target.href).catch(() => {});
  }, []);

  const shouldStartNavigation = useCallback((url: string) => {
    const target = resolveWindowTarget(url, WEBSITE_ORIGIN);
    if (!target) return false;
    if (target.kind === "external") {
      void Linking.openURL(target.href).catch(() => {});
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!canGoBack) return false;
        webView.current?.goBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [canGoBack]);

  const retry = useCallback(() => {
    loadFailed.current = false;
    setFailed(false);
    if (webView.current) webView.current.reload();
    else setReload((value) => value + 1);
  }, []);

  const onLoadEnd = useCallback(() => {
    if (
      loadFailed.current ||
      !initialAction ||
      handledAction.current === actionRunId
    )
      return;
    handledAction.current = actionRunId;
    const scripts: Record<string, string> = {
      settings: 'document.getElementById("settingsBtn")?.click(); true;',
      history: 'document.getElementById("sbToggle")?.click(); true;',
      glossary: 'document.getElementById("glossaryBtn")?.click(); true;',
      saved:
        'document.getElementById("settingsBtn")?.click(); window.setTimeout(() => { document.getElementById("settings-category-tab-3")?.click(); window.setTimeout(() => document.getElementById("savedOpen")?.click(), 80); }, 120); true;',
    };
    webView.current?.injectJavaScript(scripts[initialAction]);
  }, [actionRunId, initialAction]);

  const onMessage = useCallback(async (event: WebViewMessageEvent) => {
    let payload: unknown;
    try {
      if (new URL(event.nativeEvent.url).origin !== WEBSITE_ORIGIN) return;
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!payload || typeof payload !== "object") return;
    const message = payload as Record<string, unknown>;
    if (
      message.type === "clipboard" &&
      typeof message.id === "string" &&
      /^[a-z0-9-]{1,40}$/i.test(message.id) &&
      typeof message.text === "string"
    ) {
      const id = JSON.stringify(message.id);
      try {
        const copied = await Clipboard.setStringAsync(message.text);
        if (!copied) throw new Error("Clipboard write failed.");
        webView.current?.injectJavaScript(
          `window.__saNativeClipboardReply(${id},true); true;`,
        );
      } catch {
        webView.current?.injectJavaScript(
          `window.__saNativeClipboardReply(${id},false); true;`,
        );
      }
      return;
    }
    if (message.type === "appearance" && typeof message.dark === "boolean") {
      DeviceEventEmitter.emit("sa-web-theme", message.dark);
      if (
        typeof message.background === "string" &&
        /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(
          message.background,
        )
      ) {
        setWebBackground(message.background);
      }
      return;
    }
    if (
      message.type === "share" &&
      typeof message.id === "string" &&
      message.id.length <= 80
    ) {
      const id = JSON.stringify(message.id);
      try {
        const title =
          typeof message.title === "string"
            ? message.title
            : "Saint Augustine AI";
        const text =
          typeof message.text === "string" ? message.text : "";
        const sharedUrl =
          typeof message.url === "string" &&
          /^https:\/\//i.test(message.url)
            ? message.url
            : "";
        const nativeShare = buildNativeSharePayload(Platform.OS, {
          title,
          text,
          url: sharedUrl,
        });
        const result = await Share.share(
          nativeShare.content,
          nativeShare.options,
        );
        const cancelled = result.action === Share.dismissedAction;
        webView.current?.injectJavaScript(
          `window.__saNativeShareReply(${id},${!cancelled},${cancelled}); true;`,
        );
      } catch {
        webView.current?.injectJavaScript(
          `window.__saNativeShareReply(${id},false,false); true;`,
        );
      }
      return;
    }
    if (
      message.type !== "download" ||
      typeof message.name !== "string" ||
      typeof message.data !== "string" ||
      !/^[a-z0-9][a-z0-9._-]{0,119}$/i.test(message.name) ||
      !/\.(json|md|txt)$/i.test(message.name)
    )
      return;

    try {
      assertWebExportSize(message.data);
      const mimeType =
        typeof message.mimeType === "string" &&
        /^(application\/json|text\/(plain|markdown))(;charset=utf-8)?$/i.test(
          message.mimeType,
        )
          ? message.mimeType
          : "text/plain;charset=utf-8";
      const file = new File(Paths.cache, message.name);
      file.create({ overwrite: true });
      file.write(message.data);
      if (!(await Sharing.isAvailableAsync()))
        throw Error("File sharing is unavailable on this device.");
      await Sharing.shareAsync(file.uri, {
        mimeType,
        dialogTitle: "Save or share your Saint Augustine AI export",
      });
    } catch {
      Alert.alert(
        "Export unavailable",
        "The file could not be prepared for saving or sharing.",
      );
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: webBackground }]}>
      <WebView
        key={`${reload}:${initialHash}:${initialAction}:${intentId}`}
        ref={webView}
        source={{ uri: websiteUrl }}
        originWhitelist={[WEBSITE_ORIGIN]}
        style={[styles.webView, { backgroundColor: webBackground }]}
        javaScriptEnabled
        domStorageEnabled
        // The site has no cookie-based sign-in; keep cookie-sharing paths off.
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        allowsBackForwardNavigationGestures
        limitsNavigationsToAppBoundDomains
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        setSupportMultipleWindows
        onShouldStartLoadWithRequest={(request) =>
          shouldStartNavigation(request.url)
        }
        onOpenWindow={(event) =>
          openWindow(event.nativeEvent.targetUrl)
        }
        injectedJavaScriptBeforeContentLoaded={NATIVE_WEB_BRIDGE}
        injectedJavaScript={NATIVE_WEB_BRIDGE}
        onMessage={onMessage}
        onLoadStart={() => {
          loadFailed.current = false;
          setFailed(false);
        }}
        onLoadEnd={onLoadEnd}
        onError={() => {
          loadFailed.current = true;
          setFailed(true);
        }}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 400) {
            loadFailed.current = true;
            setFailed(true);
          }
        }}
        onNavigationStateChange={onNavigationStateChange}
        onContentProcessDidTerminate={retry}
      />
      {failed ? (
        <View style={[styles.error, { backgroundColor: webBackground }]}>
          <Text accessibilityRole="header" style={styles.title}>
            Can’t reach Saint Augustine AI
          </Text>
          <Text style={styles.message}>
            Check your internet connection, then try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webView: { flex: 1 },
  error: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 28,
  },
  title: {
    color: "#263047",
    fontFamily: "Georgia",
    fontSize: 24,
    textAlign: "center",
  },
  message: { color: "#606c7d", fontSize: 16, textAlign: "center" },
  button: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: "#26344c",
  },
  buttonText: { color: "#fffdf9", fontSize: 16, fontWeight: "600" },
});
