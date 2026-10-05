# Delete After Here

A [SillyTavern](https://github.com/SillyTavern/SillyTavern) extension that adds a scissor icon (✂️) to each message's action menu. Clicking it deletes that message **and every message after it** in one step — no more opening the hamburger menu, enabling delete mode, checking boxes, and confirming.

## Features

- **One-click bulk deletion** — remove a message and everything after it with a single confirmation.
- **Native integration** — the scissor icon sits alongside SillyTavern's built-in message actions (translate, copy, delete, etc.).
- **Native confirmation modal** — uses SillyTavern's own themed popup, so it matches your UI.
- **Safe cleanup** — uses SillyTavern's official `deleteMessage` API, so chat history is properly saved and all internal bookkeeping is handled.
- **Reliable on large chats** — re-scans the DOM before each deletion to survive SillyTavern's internal message renumbering, and aborts cleanly if a deletion silently fails.
- **Lightweight** — one event listener for the entire chat, plus a short-lived observer per menu open. Scales to thousands of messages without slowdown.

## Preview

When you open the message action menu (three dots), you'll see a scissor icon at the end of the row:
