import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView, type WebViewNavigation } from "react-native-webview";

const WEBSITE_URL = "https://staugustineai.vercel.app/";
const WEBSITE_ORIGIN = new URL(WEBSITE_URL).origin;

function openExternalUrl(url: string) {
  if (/^https:\/\//i.test(url) || /^(mailto|tel|sms):/i.test(url)) {
    void Linking.openURL(url).catch(() => {});
  }
}

export default function Website() {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  const allowWebsiteNavigation = useCallback(
    ({ url }: WebViewNavigation) => {
      if (url === WEBSITE_ORIGIN || url.startsWith(`${WEBSITE_ORIGIN}/`) || url.startsWith(`${WEBSITE_ORIGIN}#`)) {
        setFailed(false);
        return true;
      }

      openExternalUrl(url);
      return false;
    },
    [],
  );

  const openNewWindow = useCallback(({ nativeEvent }: { nativeEvent: { targetUrl: string } }) => {
    openExternalUrl(nativeEvent.targetUrl);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WebView
        key={retry}
        source={{ uri: WEBSITE_URL }}
        style={styles.webView}
        originWhitelist={["https://*"]}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        cacheEnabled
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        allowsBackForwardNavigationGestures={false}
        allowsInlineMediaPlayback
        onLoadStart={() => {
          setLoading(true);
          setFailed(false);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.statusCode >= 500) setFailed(true);
        }}
        onShouldStartLoadWithRequest={allowWebsiteNavigation}
        onOpenWindow={openNewWindow}
        accessibilityLabel="Saint Augustine AI"
      />
      {loading && !failed ? (
        <View pointerEvents="none" style={styles.loading}>
          <ActivityIndicator color="#503a1d" size="small" />
        </View>
      ) : null}
      {failed ? (
        <View style={styles.errorCover}>
          <Text style={styles.errorText}>
            Saint Augustine AI needs an internet connection to open.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setFailed(false);
              setLoading(true);
              setRetry((count) => count + 1);
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f2eb" },
  webView: { flex: 1, backgroundColor: "#f6f2eb" },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6f2eb",
  },
  errorCover: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
    backgroundColor: "#f6f2eb",
  },
  errorText: {
    maxWidth: 320,
    color: "#221c16",
    fontFamily: "Georgia",
    fontSize: 24,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: "#503a1d",
  },
  retryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
