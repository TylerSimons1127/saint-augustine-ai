import { Card, Screen, T } from "../components/ui";
export default function Privacy() {
  return (
    <Screen title="Your words deserve care." eyebrow="Privacy and AI" back>
      <Card>
        <T kind="heading">What stays on your device</T>
        <T>
          Conversation history, lesson notes, quiz results, prayer intentions,
          preferences, and downloaded daily content are stored locally. There is
          no account or cross-device sync in this version. A backup you export
          contains this local information; choose its destination carefully.
        </T>
      </Card>
      <Card>
        <T kind="heading">What is sent when you ask</T>
        <T>
          When you tap Send, the message, attached text if any, and up to 24
          recent messages from that conversation are sent over HTTPS to the
          Saint Augustine backend hosted on Render. The server sends the request
          to its configured AI provider, which can include Groq, Amazon Bedrock,
          or OpenRouter. OpenRouter may route requests to another model
          provider. The active provider is shown by the service in Settings.
        </T>
        <T>
          Provider retention and processing depend on their own policies. This
          app does not promise that providers discard your messages. Avoid
          sharing sensitive personal information.
        </T>
      </Card>
      <Card>
        <T kind="heading">Daily content and feedback</T>
        <T>
          Daily readings and saint biographies are requested from the backend;
          the server obtains source content and may produce an AI-assisted
          summary. Source links and saved-copy labels help you check what you
          are reading. Citation feedback sends a category only, without the
          answer or question text.
        </T>
        <T>
          Our server receives normal network information, including IP
          addresses, to respond to requests and limit abuse. This client does
          not add advertising or analytics tracking.
        </T>
      </Card>
      <Card>
        <T kind="heading">What this companion can do</T>
        <T>
          Saint Augustine AI is an AI companion inspired by Augustine and
          Catholic tradition. It is not the historical saint, an official Church
          authority, a priest, or a substitute for pastoral care. AI responses
          and editorial commentary may contain mistakes. Check quotations and
          doctrine against the linked original sources.
        </T>
      </Card>
      <Card>
        <T kind="heading">Your choices</T>
        <T>
          You can use the offline Study library and Prayer without enabling AI
          chat. You can disable AI sharing, export a backup, or reset this app’s
          local data in Settings. Resetting local data cannot erase copies
          already sent to service providers or exported elsewhere.
        </T>
      </Card>
    </Screen>
  );
}
