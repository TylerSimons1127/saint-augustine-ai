import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

const WEBSITE_URL = "https://staugustineai.vercel.app/";

export default function WebsitePreview() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Saint Augustine AI</Text>
      <Text style={styles.copy}>
        Open the live reading room to use the website preview.
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(WEBSITE_URL)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Open Saint Augustine AI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 28,
    backgroundColor: "#f6f2eb",
  },
  title: { color: "#221c16", fontFamily: "Georgia", fontSize: 30 },
  copy: { color: "#716349", fontSize: 16, textAlign: "center" },
  button: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: "#503a1d",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
