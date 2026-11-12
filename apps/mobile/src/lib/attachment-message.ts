export type TextAttachment = { name: string; text: string };

const attachmentPrompt =
  "Please read the attached text and help me reflect on it.";

export function composeUserMessage(
  prompt: string,
  attachment: TextAttachment | null,
): string {
  const question = prompt.trim() || (attachment ? attachmentPrompt : "");
  if (!attachment) return question;
  return `${question}\n\n[Attached file: ${attachment.name}]\n${attachment.text}`;
}
