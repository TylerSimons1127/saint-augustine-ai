import type { Message } from "./types";

export function buildChatPayloadMessages(messages: Message[]) {
  return messages
    .filter((message) => message.content && message.status !== "error")
    .slice(-24)
    .map(({ role, content }) => ({ role, content }));
}
