import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";
// https://docs.expo.dev/router/reference/static-rendering/#root-html
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>Saint Augustine AI</title>
        <meta
          name="description"
          content="A Catholic companion for study, reflection, and prayer."
        />
        <meta name="theme-color" content="#f6f2eb" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
