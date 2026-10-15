import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Card,
  Icon,
  Notice,
  Row,
  Rule,
  Screen,
  SourceLink,
  T,
  useTheme,
} from "../../components/ui";
import { useDaily } from "../../lib/daily";
import { useApp } from "../../lib/state";
import lessonsData from "../../data/lessons.json";
export default function Today() {
  const { state } = useApp();
  const { c } = useTheme();
  const { copy, date, loading, error, refresh, isOld } = useDaily();
  const lessons = lessonsData;
  const next =
    state.completed.length === 0
      ? 3
      : Math.max(
          0,
          lessons.findIndex((_, i) => !state.completed.includes(i)),
        );
  const readings = copy?.readings,
    saint = copy?.saint;
  const curated =
    !!readings && !readings.source.toLowerCase().includes("usccb");
  return (
    <Screen
      title="A moment to return."
      eyebrow={new Date(date + "T12:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}
    >
      <View style={{ paddingVertical: 12, gap: 14 }}>
        <T kind="heading" style={{ fontSize: 29, lineHeight: 36 }}>
          “You have made us for Yourself, and our hearts are restless until they
          rest in You.”
        </T>
        <T kind="caption">ST. AUGUSTINE · CONFESSIONS, I.1</T>
      </View>
      <Card>
        <Row>
          <T kind="label" style={{ flex: 1 }}>
            YOUR READING ROOM
          </T>
          <T kind="caption">{state.completed.length} / 32 read</T>
        </Row>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 32, now: state.completed.length }}
          style={{ height: 3, backgroundColor: c.line, borderRadius: 2 }}
        >
          <View
            style={{
              height: 3,
              width: `${(state.completed.length / 32) * 100}%`,
              backgroundColor: c.primary,
            }}
          />
        </View>
        <T kind="heading">{lessons[next].name}</T>
        <T>{lessons[next].topic}</T>
        <Button
          label={
            state.completed.length
              ? "Continue studying"
              : "Begin with the restless heart"
          }
          icon="book-open"
          primary
          onPress={() =>
            router.push({ pathname: "/lesson/[id]", params: { id: next } })
          }
        />
      </Card>
      <Row>
        <T kind="heading" style={{ flex: 1 }}>
          Today in the tradition
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh daily content"
          onPress={refresh}
          style={{
            minWidth: 44,
            minHeight: 44,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <Icon name="refresh-cw" size={18} />
          )}
        </Pressable>
      </Row>
      {error && <Notice text={error} error onRetry={refresh} />}
      {isOld && (
        <Notice
          text={`Saved copy from ${copy?.date}. It is available offline; it is not today's content.`}
        />
      )}
      {readings ? (
        <Card>
          <Row>
            <Icon name="sun" />
            <T kind="heading">
              {curated ? "Scripture for reflection" : "Daily readings"}
            </T>
          </Row>
          {curated && (
            <Notice text="Selected passages from the tradition. These are not today’s lectionary readings." />
          )}
          {(
            [
              ["First reading", readings.first],
              ["Psalm", readings.psalm],
              ["Gospel", readings.gospel],
            ] as const
          )
            .filter(([, v]) => v)
            .map(([label, text]) => (
              <View key={label} style={{ gap: 5 }}>
                <T kind="label">{label.toUpperCase()}</T>
                <T selectable>{text}</T>
              </View>
            ))}
          <Rule />
          <T kind="caption">
            {readings.source}
            {isOld ? ` · saved ${copy?.date}` : ""}
          </T>
          <SourceLink
            label="Read today’s full readings at USCCB"
            url={readings.link}
          />
        </Card>
      ) : (
        <Card>
          <T kind="heading">A place for Scripture</T>
          <T>
            {loading
              ? "Opening today’s readings…"
              : "Daily readings need a connection. Your study library and saved reflections work offline."}
          </T>
          <SourceLink
            label="Open USCCB readings"
            url="https://bible.usccb.org/daily-bible-readings"
          />
        </Card>
      )}
      {saint && (
        <Card>
          <Row style={{ alignItems: "flex-start" }}>
            {saint.image && /^https:\/\//.test(saint.image) && (
              <Image
                source={{ uri: saint.image }}
                style={{ width: 64, height: 78, borderRadius: 10 }}
                accessibilityLabel={saint.name}
              />
            )}
            <View style={{ flex: 1, gap: 6 }}>
              <T kind="label">SAINT FROM THE DAILY SOURCE</T>
              <T kind="heading">{saint.name}</T>
            </View>
          </Row>
          <T selectable>
            {saint.summary ||
              saint.bio ||
              saint.description ||
              "Open the source to read the full biography."}
          </T>
          {(saint.link || saint.url) && (
            <SourceLink
              label={saint.source || "Read the saint’s story"}
              url={saint.link || saint.url!}
            />
          )}
        </Card>
      )}
      <Card>
        <T kind="heading">Bring what is on your heart.</T>
        <T>You do not need the right words to begin.</T>
        <Row style={{ flexWrap: "wrap" }}>
          <Button
            label="Enter prayer"
            icon="heart"
            primary
            onPress={() => router.push("/pray")}
          />
          <Button
            label="Talk with Augustine"
            icon="message-circle"
            onPress={() => router.push("/chat")}
          />
        </Row>
      </Card>
      <T kind="caption" style={{ textAlign: "center", paddingVertical: 8 }}>
        An AI companion inspired by the Catholic tradition.{"\n"}A place to
        reflect, study, and pray.
      </T>
    </Screen>
  );
}
