import React, { useState, useEffect, useMemo } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ListItem, Avatar } from '@rneui/themed';
import { auth, db } from '../firebase/firebase';
import {
	collection, doc, query, orderBy, limit, onSnapshot,
	getDocs, writeBatch, deleteDoc,
} from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import { AntDesign } from '@expo/vector-icons';
import { truncateName } from '../utils/truncateName';
import { TYPING_TTL_MS } from '../constants/chat';

const CustomListItem = ({ id, chatName, enterChat, userId, image, lastRead, typingUsers, typingNames }) => {
	const [chatMessage, setChatMessage] = useState([]);
	const { colors } = useTheme();

	// Subscribe to the last message for the preview (limit 1 → minimal Firestore reads)
	useEffect(() => {
		const messagesRef = collection(db, 'chat', id, 'messages');
		const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
		const unsubscribe = onSnapshot(q, (snapshot) =>
			setChatMessage(snapshot.docs.map((d) => d.data()))
		);
		return unsubscribe;
	}, [id]);

	const currentUid = auth.currentUser?.uid ?? null;

	// ── Typing indicator ──────────────────────────────────────────────────────
	// Re-computed when typingUsers prop changes (HomeScreen's onSnapshot fires on every update)
	const typerName = useMemo(() => {
		if (!typingUsers || !currentUid) return null;
		const now = Date.now();
		// Guard: serverTimestamp() pending writes return null from toMillis()
		const entry = Object.entries(typingUsers).find(([uid, ts]) => {
			if (uid === currentUid) return false;
			const millis = ts?.toMillis?.();
			return millis != null && millis > now - TYPING_TTL_MS;
		});
		return entry ? (typingNames?.[entry[0]] ?? 'Someone') : null;
	}, [typingUsers, typingNames, currentUid]);

	// ── Unread badge ──────────────────────────────────────────────────────────
	// Show a dot when the last message is newer than the user's lastRead timestamp
	const hasUnread = useMemo(() => {
		if (!currentUid || !chatMessage[0]?.timestamp) return false;
		if (!lastRead?.[currentUid]) return true; // never read this chat
		const msgTs = chatMessage[0].timestamp?.seconds;
		const readTs = lastRead[currentUid]?.seconds;
		// Guard: serverTimestamp() pending writes return null for .seconds.
		// Returning false avoids a false-positive badge during the write round-trip.
		if (msgTs == null || readTs == null) return false;
		return msgTs > readTs;
	}, [chatMessage, lastRead, currentUid]);

	// ── Delete chat room ──────────────────────────────────────────────────────
	const deleteChatRoom = () => {
		Alert.alert(
			'Delete chat',
			`Are you sure you want to delete "${chatName}"? This cannot be undone.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							// Batch-delete messages first (Firestore doesn't cascade-delete subcollections)
							const BATCH_SIZE = 499; // Firestore limit is 500 writes per batch
							const messagesRef = collection(db, 'chat', id, 'messages');
							const snapshot = await getDocs(messagesRef);

							for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
								const batch = writeBatch(db);
								snapshot.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
								await batch.commit();
							}

							await deleteDoc(doc(db, 'chat', id));
						} catch {
							Alert.alert('Error', 'Could not delete the chat. Please try again.');
						}
					},
				},
			]
		);
	};

	const displayName = truncateName(chatName);

	return (
		<ListItem
			onPress={() => enterChat(id, chatName, image, userId)}
			bottomDivider
			containerStyle={{ backgroundColor: colors.background }}
		>
			{chatMessage[0] ? (
				<Avatar rounded source={{ uri: chatMessage[0].photoURL }} />
			) : (
				<LottieView
					style={{ height: 30 }}
					source={require('../assets/animations/21333-writer.json')}
					autoPlay
					speed={2}
				/>
			)}

			<ListItem.Content>
				<ListItem.Title
					style={{ color: colors.text, fontWeight: Platform.OS === 'android' ? 'bold' : '700' }}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{displayName}
				</ListItem.Title>

				<ListItem.Subtitle
					style={{ color: typerName ? colors.primary : colors.subtext }}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{typerName ? (
						// Show typing indicator when a peer is actively typing
						<Text style={{ fontStyle: 'italic', color: colors.primary }}>
							{typerName} is typing…
						</Text>
					) : (
						<>
							{chatMessage[0] ? (
								<Text style={{ fontWeight: Platform.OS === 'android' ? 'bold' : '600', color: colors.subtext }}>
									{chatMessage[0].displayName}
								</Text>
							) : null}
							{chatMessage[0] ? ': ' : 'No messages yet'}
							{chatMessage[0]?.message ?? null}
						</>
					)}
				</ListItem.Subtitle>
			</ListItem.Content>

			{/* Unread badge dot */}
			{hasUnread && <View style={styles.unreadDot} />}

			{/* Delete button — only visible to the chat creator */}
			{currentUid && currentUid === userId && (
				<TouchableOpacity style={styles.delete} onPress={deleteChatRoom}>
					<AntDesign name="delete" size={26} color="red" />
				</TouchableOpacity>
			)}
		</ListItem>
	);
};

export default CustomListItem;

const styles = StyleSheet.create({
	delete: {
		marginRight: 4,
	},
	unreadDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#e74c3c',
		marginRight: 8,
		alignSelf: 'center',
	},
});
