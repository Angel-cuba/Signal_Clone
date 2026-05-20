/**
 * One-time migration: backfill members[] on chat documents created before Phase 5.
 *
 * Run before deploying Cloud Functions:
 *   cd functions && npm install && node migrate_members.js
 *
 * This script seeds each chat document that lacks a members[] field with
 * [userId] (the creator's UID). Real participant UIDs will accumulate on the
 * next sendMessage from each user via arrayUnion in ChatScreen.
 *
 * Safe to run multiple times — skips docs that already have members[].
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with Application Default Credentials.
// Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account key,
// OR run from within a Firebase emulator / Cloud Shell where ADC is automatic.
initializeApp();

const db = getFirestore();
const BATCH_LIMIT = 499; // Firestore max writes per batch

async function migrateMembersField() {
	console.log('Fetching chat documents without members[]...');
	const snapshot = await db.collection('chat').get();

	const toMigrate = snapshot.docs.filter((d) => !d.data().members);
	console.log(`Found ${toMigrate.length} chats to migrate out of ${snapshot.docs.length} total.`);

	if (toMigrate.length === 0) {
		console.log('Nothing to migrate. Exiting.');
		return;
	}

	// Process in batches of BATCH_LIMIT
	for (let i = 0; i < toMigrate.length; i += BATCH_LIMIT) {
		const batchDocs = toMigrate.slice(i, i + BATCH_LIMIT);
		const batch = db.batch();
		batchDocs.forEach((d) => {
			const creatorUid = d.data().userId;
			// Seed with creator UID; filter out falsy values (legacy docs may lack userId)
			batch.update(d.ref, { members: creatorUid ? [creatorUid] : [] });
		});
		await batch.commit();
		console.log(`Migrated batch ${Math.floor(i / BATCH_LIMIT) + 1}: ${batchDocs.length} docs`);
	}

	console.log(`Migration complete. ${toMigrate.length} chats updated.`);
}

migrateMembersField().catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
