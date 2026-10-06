# Saint Augustine AI privacy policy — draft

**Status:** Draft for owner review. Do not publish this text as a final policy until the service-provider retention terms and the contact details below have been checked.

**Last edited:** October 6, 2026

**App:** Saint Augustine AI

**Contact:** Add a monitored privacy contact before publication.

## What stays on your device

The app stores conversation history, preferences, study progress, saved notes and passages, favorite prayers, prayer intentions, streaks, and quiz progress in the app’s local web storage. These items are not automatically synchronized to a Saint Augustine AI account; the app does not currently have account sign-in. You can export or restore a backup, clear conversations, and remove saved items. A prayer intention is included in an AI request only after you choose a prayer flow that uses it.

## What is sent when you use the AI

When you send a message, the app sends its text and recent conversation context (up to 24 messages) to the Saint Augustine AI backend hosted on Render. Text extracted from a PDF or text file, or the image data from an attached picture, is included if you choose to send that message. Image files are sent as selected, so they may contain embedded metadata. A prayer intention is sent only when you choose a prayer action that uses it. The backend forwards the request to OpenRouter and the model provider that handles it; if the chosen model is unavailable, the backend may retry another offered model. The app does not control those providers’ retention or training practices. Review their current privacy terms and avoid sending sensitive information.

The app uses an on-device formatting heuristic for its optional AI-style paste notice. It does not use a separate detection service. If you send the flagged text, it becomes part of the message sent for the response.

## Service operation

The backend uses the network address of a request in temporary in-memory rate-limit state. It keeps aggregate operational counts such as request totals, model outcomes, error statuses, and rate-limit events; the application code does not put chat text into those counters. The feedback control sends a limited category (for example, “helpful” or “citation issue”), not free-form feedback or conversation text, and the backend counts these categories in memory.

The backend also requests public daily-reading content from USCCB and saint-of-the-day content from Franciscan Media. Those source requests do not include your conversation. To prepare the saint’s summary and Augustine connection, the backend may send the public saint biography to OpenRouter and a model provider; it does not include your local conversations or personal prayer intentions in that request. When you open an external citation, the destination site receives its ordinary web request information.

The bundled interface currently requests its typefaces from Google Fonts. When you attach a PDF, it loads the PDF.js library from jsDelivr to read the selected document in the browser; the PDF is processed locally, and any extracted text is sent only if you send the message. These asset requests disclose ordinary connection metadata to those services. The app does not intentionally transmit chat text to these asset providers.

## Sharing and backups

Sharing a conversation, selected messages, or a file export is initiated by you through the system share sheet. The recipient and any service you choose to share with may receive the selected content. JSON backups contain local conversations and app data; keep them somewhere private and delete them when they are no longer needed.

## Information not requested by the app

The app does not require an account, name, email address, or payment information. The app source currently contains no advertising or analytics SDK. Network, service-provider, and model-provider processing may still be governed by those providers’ own terms and privacy policies.

## Your choices

You can avoid sending personal information in prompts, disable the AI-style paste notice in settings, remove saved items, clear conversations, export or restore a backup, or stop using the AI feature. Uninstalling the app removes locally stored information from the app, subject to normal device backup behavior.

## Children and sensitive information

Do not send information you would not want handled by an AI service. Prompts may reveal religious or other sensitive beliefs. Before publication, the app owner must determine the intended age group and complete the App Store privacy disclosures based on the current behavior of the app and every integrated service.

## Changes and contact

This policy may be updated as the app or its service providers change. Add the owner’s privacy contact and a public URL before release. For a privacy question or request, contact the app owner using that published contact.

---

## Release audit notes (not policy text)

- Verify current Render, OpenRouter, and model-provider retention and training terms; update the policy to match those terms.
- Confirm Render’s network/request logging and retention configuration.
- Confirm whether the model provider receives attached-file text, conversation history, selected reasoning mode, and the local paste-signal flag. The current backend request payload includes the conversation messages and a boolean paste signal.
- Review Apple’s definitions for user content and sensitive information, including religious beliefs, before submitting privacy labels.
- Recheck all external requests in the native bundle if Google Fonts or the PDF.js CDN integration changes.
