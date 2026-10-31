import { Card, Screen, SourceLink, T } from "../components/ui";
export default function Privacy() {
  return (
    <Screen title="Your words deserve care." eyebrow="Privacy and AI" back>
      <Card>
        <T kind="heading">What stays on your device</T>
        <T>
          Conversations and unsent chat drafts, saved reflections, lesson notes,
          quiz results, prayer intentions and your prayer draft, preferences,
          and a small cache of daily content are stored on this device. There is
          no account or cross-device sync in this version.
        </T>
        <T>
          Daily reminders are scheduled as local notifications on this device;
          reminder times are not sent to our server. An exported backup contains
          your local information in a JSON file. The app does not password-protect
          that file, so choose carefully where you save or share it.
        </T>
        <T>
          Importing a backup replaces this app’s local data. AI sharing and
          reminders are turned off after import until you choose to enable them.
          Device backup settings may also affect whether local app data is included
          in a device backup.
        </T>
      </Card>
      <Card>
        <T kind="heading">What is sent when you ask</T>
        <T>
          Chat sends a question when you tap Send. Prayer and reflection
          actions send their prepared prompt immediately when you choose them;
          a saved prayer intention is included only when you choose Lead me in
          prayer or Teach me to pray. The app sends up to 24 recent messages from the
          conversation in total, including your new message, over HTTPS to the
          Saint Augustine backend hosted on Render. If you attach a text,
          Markdown, or CSV file, its filename and extracted text are included
          in your message. The app reads the text on your device and sends it
          only after you choose an AI action. The server sends the request to its configured
          primary AI provider. The backend currently uses Groq as its primary
          provider and OpenRouter as a fallback. OpenRouter may route requests
          to another model provider. The backend requires OpenRouter to use a
          zero-data-retention endpoint and denies providers that collect request
          data. If no eligible endpoint is available, the fallback returns an
          error instead of relaxing those controls. Provider routing can change;
          Settings shows the configured primary provider, not the provider used
          for each individual request.
        </T>
        <T>
          Groq says it does not retain inference content by default. For
          reliability troubleshooting or suspected abuse, it may retain prompts
          and responses for up to 30 days unless law requires longer; its Zero
          Data Retention setting changes this handling. This policy does not
          verify the service account’s ZDR setting, so assume that retention
          may apply. Groq also
          collects usage metadata that excludes message content. OpenRouter says
          prompt and response logging and training use are off by default, but
          optional account logging settings can change that; it retains
          request metadata. It may
          also sample a small number of prompts for anonymous input
          categorization, which it says is not associated with an account or
          user ID when the account has not opted in to input/output use. The
          service account’s opt-in setting has not been verified. The
          backend’s routing controls exclude downstream providers that cannot
          meet the request’s zero-retention and data-collection requirements.
          This does not prevent OpenRouter itself from processing the request or
          retaining metadata under its policy. This app does not promise provider
          deletion. Avoid sharing sensitive personal information.
        </T>
        <SourceLink
          label="Groq inference data handling"
          url="https://console.groq.com/docs/your-data"
        />
        <SourceLink
          label="OpenRouter data collection"
          url="https://openrouter.ai/docs/guides/privacy/data-collection"
        />
        <SourceLink
          label="OpenRouter provider logging"
          url="https://openrouter.ai/docs/guides/privacy/provider-logging"
        />
        <T>
          When AI sharing is enabled, Chat and Settings also check model
          availability and service status. These checks do not include your
          conversation text.
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
          The backend uses your network IP address in a temporary in-memory
          rate limit to reduce abusive chat requests. It removes the entry
          after two minutes without activity, with cleanup running at intervals
          of up to 30 seconds; activity refreshes that window. The app has no
          account or chat-history database. Hosting providers may process
          connection information under their own policies. This app does not
          use advertising or cross-app tracking.
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
      <Card>
        <T kind="heading">Full privacy policy</T>
        <T>
          Read the full mobile app policy, including current service providers
          and their data-handling information.
        </T>
        <SourceLink
          label="Open Saint Augustine AI privacy policy"
          url="https://saint-augustine-ai-mobile-pages.vercel.app/privacy"
        />
      </Card>
    </Screen>
  );
}
