export function buildNativeSharePayload(
  platform: string,
  share: { title: string; text: string; url: string },
) {
  const title = share.title || "Saint Augustine AI";
  const url = /^https:\/\//i.test(share.url) ? share.url : "";
  if (platform === "ios") {
    return {
      content: { message: share.text, ...(url ? { url } : {}) },
      options: { subject: title },
    };
  }
  return {
    content: {
      title,
      message: [share.text, url].filter(Boolean).join("\n"),
    },
    options: undefined,
  };
}
