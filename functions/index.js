// Firebase Cloud Functions — Signal Clone
// ─────────────────────────────────────────────────────────────────────────────
// Setup checklist (run once before first deploy):
//
//   1. Fill in .firebaserc  →  replace TODO_REPLACE with your Firebase project ID
//   2. Fill in eas.json     →  replace TODO_REPLACE values in the submit section
//   3. Fill in app.json     →  replace YOUR-EAS-PROJECT-ID under extra.eas.projectId
//   4. Install deps:          cd functions && npm install
//   5. Deploy rules + fn:     firebase deploy --only firestore,functions
//
// PREREQUISITES:
//   • Firebase CLI installed:      npm install -g firebase-tools
//   • Logged in:                   firebase login
//   • Billing enabled on project   (Cloud Functions require Blaze plan)
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');

initializeApp();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Expo's push API accepts up to 100 notifications per request.
const BATCH_SIZE = 100;

/** Split an array into chunks of a given size. */
const chunk = (arr, size) =>
	Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
		arr.slice(i * size, i * size + size)
	);

/**
 * sendMessageNotification
 *
 * Triggered on every new message in any chat room.
 * Reads the `members` array from the chat document, fetches each member's
 * expoPushToken from /users/{uid}, and delivers a notification via Expo's
 * Push API to everyone except the sender.
 *
 * Data flow:
 *   AddChatScreen  →  chat doc created with  members: [creatorUid]
 *   ChatScreen     →  each sendMessage appends sender via arrayUnion
 *   This function  →  reads members, excludes sender, sends notifications
 */
exports.sendMessageNotification = onDocumentCreated(
	'chat/{chatId}/messages/{messageId}',
	async (event) => {
		const message = event.data.data();
		const chatId = event.params.chatId;
		const senderUid = message.uid; // stored since the Phase 4 self-review fix

		if (!senderUid) {
			// Messages written before the uid field was added won't have it.
			// Skip rather than notifying everyone including the sender.
			logger.warn('Message missing uid — skipping notification', { chatId });
			return;
		}

		try {
			const db = getFirestore();

			// ── Fetch chat metadata ──────────────────────────────────────────
			const chatSnap = await db.doc(`chat/${chatId}`).get();
			if (!chatSnap.exists) return;
			const chatData = chatSnap.data();

			// members[] is written by AddChatScreen at creation and appended by
			// ChatScreen via arrayUnion on each send.  New chats default to [].
			const members = chatData.members ?? [];
			const recipients = members.filter((uid) => uid !== senderUid);

			if (recipients.length === 0) {
				logger.info('No recipients for notification', { chatId });
				return;
			}

			// ── Fetch push tokens in parallel ────────────────────────────────
			const userSnaps = await Promise.all(
				recipients.map((uid) => db.doc(`users/${uid}`).get())
			);

			const tokens = userSnaps
				.map((snap) => snap.data()?.expoPushToken)
				.filter(Boolean);

			if (tokens.length === 0) {
				logger.info('No push tokens found for recipients', { chatId });
				return;
			}

			// ── Build and send notifications in batches ──────────────────────
			const notifications = tokens.map((token) => ({
				to: token,
				title: chatData.chatName ?? 'New message',
				body: `${message.displayName}: ${message.message}`,
				data: { chatId },
				sound: 'default',
				badge: 1,
			}));

			for (const batch of chunk(notifications, BATCH_SIZE)) {
				const res = await fetch(EXPO_PUSH_URL, {
					method: 'POST',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(batch),
				});
				const result = await res.json();
				logger.info('Expo push result', result);
			}
		} catch (err) {
			logger.error('sendMessageNotification failed', err);
		}
	}
);
