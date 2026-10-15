import { Text, View } from "react-native";
import { T, openLink, useTheme } from "./ui";
import { fonts } from "../theme";
function Inline({ text }: { text: string }) {
  const { c } = useTheme();
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
        if (link)
          return (
            <Text
              key={i}
              accessibilityRole="link"
              onPress={() => openLink(link[2])}
              style={{ color: c.primary, textDecorationLine: "underline" }}
            >
              {link[1]}
            </Text>
          );
        if (part.startsWith("**") && part.endsWith("**"))
          return (
            <Text key={i} style={{ fontFamily: fonts.bold }}>
              {part.slice(2, -2)}
            </Text>
          );
        return part;
      })}
    </>
  );
}
export function Answer({ text }: { text: string }) {
  return (
    <View style={{ gap: 13 }}>
      {text.split(/\n{2,}/).map((part, i) => {
        const heading = /^#{1,6}\s/.test(part);
        return (
          <T key={i} selectable kind={heading ? "heading" : "body"}>
            <Inline text={heading ? part.replace(/^#{1,6}\s/, "") : part} />
          </T>
        );
      })}
    </View>
  );
}
