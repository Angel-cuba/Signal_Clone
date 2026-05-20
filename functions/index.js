// Firebase Cloud Functions — Signal Clone
// ─────────────────────────────────────────────────────────────────────────────
// Setup checklist (run once before first deploy):
//
//   1. Fill in .firebaserc  →  replace TODO_REPLACE with your Firebase project ID
//   2. Fill in eas.json     →  replace TODO_REPLACE values in the submit section
//   3. Fill in app.json     →  replace YOUR-EAS-PROJECT-ID under extra.eas.projectId
//   4. Install deps:           cd functions && npm install
//   5. Run preflight check:    npm run preflight
//   6. Deploy rules + fn:      firebase deploy --only firestore,functions
//
// Notes:
//   • Firebase CLI required:  npm install -g firebase-tools && firebase login
//   • Cloud Functions require the Blaze (pay-as-you-go) billing plan
//   • appVersionSource: "remote" in eas.json means the version in app.json is
//     ignored — EAS manages the version number remotely via autoIncrement
//
// IMPORTANT — Existing chats backfill:
//   Chat documents created before Phase 5 have no members[] field.
//   Run the one-time migration script before deploying:
//     node functions/migrate_members.js
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { Expo } = require('expo-server-sdk');

initializeApp();

const expo = new Expo();

/**
 * sendMessageNotification
 *
 * Triggered on every new message in any chat room.
 * Reads the `members` array from the chat document, fetches each member's
 * expoPushToken from /users/{uid}, and delivers a notification via Expo's
 * Push API — skipping the sender and any invalid/stale tokens.
 *
 * Data flow:
 *   AddChatScreen  →  chat doc created with  members: [creatorUid]
 *   ChatScreen     →  each sendMessage awaits updateDoc with arrayUnion(uid)
 *                     BEFORE addDoc, ensuring the sender is in members[] when
 *                     this function fires
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
			// Skip rather than risk notifying everyone including the sender.
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
			// ChatScreen via arrayUnion (awaited) before each message addDoc.
			// Pre-Phase-5 chats default to [] — run migrate_members.js to backfill.
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

			const validTokens = userSnaps
				.map((snap) => snap.data()?.expoPushToken)
				// expo-server-sdk validates the token format (ExponentPushToken[...])
				// and rejects simulator tokens or tokens from other providers.
				.filter((token) => token && Expo.isExpoPushToken(token));

			if (validTokens.length === 0) {
				logger.info('No valid Expo push tokens found', { chatId });
				return;
			}

			// ── Build notification payloads ──────────────────────────────────
			// displayName may be null if the user never set one (Firebase Auth allows it)
			const senderLabel = message.displayName ?? message.email ?? 'Someone';

			const notifications = validTokens.map((token) => ({
				to: token,
				title: chatData.chatName ?? 'New message',
				body: `${senderLabel}: ${message.message}`,
				data: { chatId },
				sound: 'default',
				badge: 1,
			}));

			// ── Send in chunks (expo-server-sdk handles 100-item batching) ───
			const chunks = expo.chunkPushNotifications(notifications);
			const receipts = [];
			for (const chunk of chunks) {
				const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
				receipts.push(...ticketChunk);
			}

			// Log any delivery errors (DeviceNotRegistered, InvalidCredentials, etc.)
			// TODO: implement receipt polling to remove stale tokens from Firestore.
			// See: https://docs.expo.dev/push-notifications/sending-notifications/#receipt-expiration
			const errors = receipts.filter((r) => r.status === 'error');
			if (errors.length > 0) {
				logger.warn('Push delivery errors', { chatId, errors });
			}

			logger.info(`Sent ${receipts.length} notifications for chat ${chatId}`);
		} catch (err) {
			logger.error('sendMessageNotification failed', err);
		}
	}
);
