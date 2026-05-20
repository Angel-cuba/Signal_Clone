/**
 * Shared chat feature constants.
 * Centralised here so ChatScreen and CustomListItem stay in sync
 * (e.g. changing TYPING_TTL_MS in one place affects both the in-chat
 * indicator and the home-screen list preview).
 */

/** How long to wait after the last keystroke before writing the typing indicator to Firestore. */
export const TYPING_DEBOUNCE_MS = 800;

/**
 * A peer is considered "typing" only while their Firestore timestamp is
 * within this window. After TYPING_TTL_MS ms of silence the indicator
 * disappears on the next re-render triggered by a Firestore update.
 */
export const TYPING_TTL_MS = 5000;

/** Number of messages fetched per page in ChatScreen. */
export const PAGE_SIZE = 30;
