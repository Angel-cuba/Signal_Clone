import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { auth, db } from '../firebase/firebase';
import {
	collection, doc, query, orderBy, limit, onSnapshot,
	getDocs, writeBatch, deleteDoc,
} from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import { Feather } from '@expo/vector-icons';
import { truncateName } from '../utils/truncateName';
import { TYPING_TTL_MS } from '../constants/chat';

const AVATAR_SIZE = 50;

const CustomListItem = ({ id, chatName, enterChat, userId, image, lastRead, typingUsers, typingNames }) => {
	const [chatMessage, setChatMessage] = useState([]);
	const { colors } = useTheme();

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
	const [typerName, setTyperName] = useState(null);
	const typerExpiryRef = useRef(null);

	useEffect(() => {
		clearTimeout(typerExpiryRef.current);
		if (!typingUsers || !currentUid) { setTyperName(null); return; }
		const now = Date.now();
		const entry = Object.entries(typingUsers).find(([uid, ts]) => {
			if (uid === currentUid) return false;
			const millis = ts?.toMillis?.();
			return millis != null && millis > now - TYPING_TTL_MS;
		});
		if (entry) {
			setTyperName(typingNames?.[entry[0]] ?? 'Someone');
			const millis = entry[1]?.toMillis?.();
			const remaining = millis != null ? Math.max(0, TYPING_TTL_MS - (now - millis)) : TYPING_TTL_MS;
			typerExpiryRef.current = setTimeout(() => setTyperName(null), remaining);
		} else {
			setTyperName(null);
		}
		return () => clearTimeout(typerExpiryRef.current);
	}, [typingUsers, typingNames, currentUid]);

	// ── Unread badge ──────────────────────────────────────────────────────────
	const hasUnread = useMemo(() => {
		if (!currentUid || !chatMessage[0]?.timestamp) return false;
		if (!lastRead?.[currentUid]) return true;
		const msgTs = chatMessage[0].timestamp?.seconds;
		const readTs = lastRead[currentUid]?.seconds;
		if (msgTs == null || readTs == null) return false;
		return msgTs > readTs;
	}, [chatMessage, lastRead, currentUid]);

	// ── Delete chat room ──────────────────────────────────────────────────────
	const deleteChatRoom = () => {
		Alert.alert(
			'Delete chat',
			`Delete "${chatName}"? This cannot be undone.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							const BATCH_SIZE = 499;
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
	const lastMsg = chatMessage[0];
	const avatarUri = lastMsg?.photoURL ?? image;

	const previewText = useMemo(() => {
		if (typerName) return null;
		if (!lastMsg) return 'No messages yet';
		const sender = lastMsg.displayName ?? '';
		const msg = lastMsg.message ?? '';
		return sender ? `${sender}: ${msg}` : msg;
	}, [typerName, lastMsg]);

	return (
		<TouchableOpacity
			style={[styles.row, { borderBottomColor: colors.separator }]}
			onPress={() => enterChat(id, chatName, image, userId)}
			activeOpacity={0.6}
		>
			{/* Avatar */}
			<View style={styles.avatarContainer}>
				{avatarUri ? (
					<Image source={{ uri: avatarUri }} style={styles.avatar} />
				) : (
					<View style={[styles.avatarFallback, { backgroundColor: colors.surface }]}>
						<LottieView
							style={{ height: 28 }}
							source={require('../assets/animations/21333-writer.json')}
							autoPlay
							speed={2}
						/>
					</View>
				)}
			</View>

			{/* Content */}
			<View style={styles.content}>
				<View style={styles.topRow}>
					<Text
						style={[styles.chatName, { color: hasUnread ? colors.text : colors.text, fontWeight: hasUnread ? '700' : '500' }]}
						numberOfLines={1}
					>
						{displayName}
					</Text>
					{hasUnread && (
						<View style={[styles.unreadDot, { backgroundColor: colors.unreadBadge }]} />
					)}
				</View>

				<View style={styles.bottomRow}>
					{typerName ? (
						<Text style={[styles.typingText, { color: colors.accent }]} numberOfLines={1}>
							{typerName} is typing…
						</Text>
					) : (
						<Text
							style={[styles.previewText, { color: colors.subtext, fontWeight: hasUnread ? '500' : '400' }]}
							numberOfLines={1}
						>
							{previewText}
						</Text>
					)}
				</View>
			</View>

			{/* Delete button — only for chat creator */}
			{currentUid && currentUid === userId && (
				<TouchableOpacity style={styles.deleteButton} onPress={deleteChatRoom} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
					<Feather name="trash-2" size={16} color={colors.deleteIcon} />
				</TouchableOpacity>
			)}
		</TouchableOpacity>
	);
};

export default CustomListItem;

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 13,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	avatarContainer: {
		marginRight: 14,
	},
	avatar: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		borderRadius: AVATAR_SIZE / 2,
	},
	avatarFallback: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		borderRadius: AVATAR_SIZE / 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	content: {
		flex: 1,
		gap: 4,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	chatName: {
		fontSize: 15,
		letterSpacing: 0.1,
		flex: 1,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	bottomRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	previewText: {
		fontSize: 13,
		flex: 1,
	},
	typingText: {
		fontSize: 13,
		fontStyle: 'italic',
		flex: 1,
	},
	deleteButton: {
		marginLeft: 10,
		padding: 4,
	},
});
