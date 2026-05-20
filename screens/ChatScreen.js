import { StatusBar } from 'expo-status-bar';
import React, { useLayoutEffect, useState, useRef, useEffect, useCallback } from 'react';
import {
	Alert,
	StyleSheet,
	Text,
	TextInput,
	View,
	TouchableOpacity,
	KeyboardAvoidingView,
	ScrollView,
	Keyboard,
	Platform,
	ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@rneui/themed';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase/firebase';
import {
	collection,
	doc,
	addDoc,
	updateDoc,
	arrayUnion,
	deleteField,
	query,
	orderBy,
	onSnapshot,
	serverTimestamp,
	limitToLast,
} from 'firebase/firestore';
import { timeAgo } from '../utils/timeago';
import { truncateName } from '../utils/truncateName';
import { useTheme } from '../hooks/useTheme';
import { PAGE_SIZE, TYPING_DEBOUNCE_MS, TYPING_TTL_MS } from '../constants/chat';

const ChatScreen = ({ navigation, route }) => {
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState([]);
	const [pageSize, setPageSize] = useState(PAGE_SIZE);
	const [hasMore, setHasMore] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [otherTyping, setOtherTyping] = useState(null); // display name of typing peer
	const scrollViewRef = useRef(null);
	const hasScrolledInitially = useRef(false);
	const typingTimerRef = useRef(null);
	const typingExpiryRef = useRef(null);
	// isPaginatingRef: suppress auto-scroll when the user explicitly loads older messages
	const isPaginatingRef = useRef(false);
	// isNearBottomRef: only auto-scroll on new messages when the user is near the bottom
	const isNearBottomRef = useRef(true);
	const { colors } = useTheme();

	const chatId = route.params.id;

	// ── Header ────────────────────────────────────────────────────────────────
	useLayoutEffect(() => {
		navigation.setOptions({
			title: 'Chat',
			headerBackTitleVisible: false,
			headerTitleAlign: 'left',
			headerTintColor: 'white',
			headerTitle: () => (
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Avatar
						source={{
							uri: route.params.image
								? route.params.image
								: 'https://res.cloudinary.com/dqaerysgb/image/upload/v1632245932/paris_mulhc4.jpg',
						}}
						rounded
					/>
					<Text
						style={{
							paddingLeft: 5,
							fontWeight: Platform.OS === 'android' ? 'bold' : '900',
							fontSize: 21,
							color: Platform.OS === 'android'
								? colors.headerTitleAndroid
								: colors.headerTitle,
						}}
					>
						{truncateName(route.params.chatName)}
					</Text>
				</View>
			),
			headerRight: () => (
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 80, marginRight: 20 }}>
					<TouchableOpacity>
						<FontAwesome name="video-camera" size={24} color="white" />
					</TouchableOpacity>
					<TouchableOpacity>
						<Ionicons name="call" size={24} color="white" />
					</TouchableOpacity>
				</View>
			),
		});
	}, [navigation, route.params.chatName, route.params.image, colors]);

	// ── Messages subscription ─────────────────────────────────────────────────
	// Fetches (pageSize + 1) docs so we can detect whether older messages exist
	// without a separate count query. The extra "probe" doc is sliced off before
	// display; setHasMore(true) only when the probe is present.
	useEffect(() => {
		const messagesRef = collection(db, 'chat', chatId, 'messages');
		const q = query(messagesRef, orderBy('timestamp', 'asc'), limitToLast(pageSize + 1));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const hasMoreDocs = snapshot.docs.length > pageSize;
			// Slice off the oldest "probe" doc when we know there are more messages
			const visibleDocs = hasMoreDocs ? snapshot.docs.slice(1) : snapshot.docs;
			setMessages(visibleDocs.map((d) => ({ id: d.id, data: d.data() })));
			setHasMore(hasMoreDocs);
			setLoadingMore(false);

			// Mark as read whenever the user is looking at this screen (non-blocking)
			const uid = auth.currentUser?.uid;
			if (uid && snapshot.docs.length > 0) {
				updateDoc(doc(db, 'chat', chatId), {
					[`lastRead.${uid}`]: serverTimestamp(),
				}).catch(() => {});
			}
		});

		return unsubscribe;
	}, [chatId, pageSize]);

	// ── Chat document subscription — typing indicator + cleanup ───────────────
	useEffect(() => {
		const chatRef = doc(db, 'chat', chatId);

		const unsubscribe = onSnapshot(chatRef, (snapshot) => {
			const data = snapshot.data();
			if (!data?.typingUsers) {
				setOtherTyping(null);
				clearTimeout(typingExpiryRef.current);
				return;
			}

			const uid = auth.currentUser?.uid;
			const now = Date.now();
			// Guard: serverTimestamp() pending writes return null from toMillis()
			const entry = Object.entries(data.typingUsers).find(([id, ts]) => {
				if (id === uid) return false;
				const millis = ts?.toMillis?.();
				return millis != null && millis > now - TYPING_TTL_MS;
			});

			clearTimeout(typingExpiryRef.current);
			if (entry) {
				setOtherTyping(data.typingNames?.[entry[0]] ?? 'Someone');
				// Local expiry timer: clear the indicator when the TTL elapses without
				// a new Firestore event (e.g. peer stops typing and navigates away).
				const millis = entry[1]?.toMillis?.();
				const remaining = millis != null ? Math.max(0, TYPING_TTL_MS - (now - millis)) : TYPING_TTL_MS;
				typingExpiryRef.current = setTimeout(() => setOtherTyping(null), remaining);
			} else {
				setOtherTyping(null);
			}
		});

		return () => {
			// Cancel the debounce timer BEFORE the deleteField write so the timer
			// callback can't re-set typingUsers after the cleanup deletes it.
			clearTimeout(typingTimerRef.current);
			clearTimeout(typingExpiryRef.current);
			unsubscribe();
			const uid = auth.currentUser?.uid;
			if (uid) {
				updateDoc(chatRef, {
					[`typingUsers.${uid}`]: deleteField(),
					[`typingNames.${uid}`]: deleteField(),
				}).catch(() => {});
			}
		};
	}, [chatId]);

	// ── Auto-scroll ───────────────────────────────────────────────────────────
	const handleContentSizeChange = useCallback(() => {
		// When the user tapped "Load earlier messages", suppress the scroll so the
		// viewport stays anchored near the message they were reading.
		if (isPaginatingRef.current) {
			isPaginatingRef.current = false;
			return;
		}
		if (!hasScrolledInitially.current) {
			scrollViewRef.current?.scrollToEnd({ animated: false });
			hasScrolledInitially.current = true;
		} else if (isNearBottomRef.current) {
			// Only follow new messages when the user is already near the bottom.
			scrollViewRef.current?.scrollToEnd({ animated: true });
		}
	}, []);

	// ── Load earlier messages ─────────────────────────────────────────────────
	const loadMore = useCallback(() => {
		if (!hasMore || loadingMore) return;
		isPaginatingRef.current = true; // suppress next auto-scroll
		setLoadingMore(true);
		setPageSize((p) => p + PAGE_SIZE);
	}, [hasMore, loadingMore]);

	// ── Typing indicator write ────────────────────────────────────────────────
	const handleInputChange = useCallback((text) => {
		setInput(text);

		// FIX: capture both uid and displayName at the same moment so the
		// deferred setTimeout callback never reads a stale auth.currentUser.
		const uid = auth.currentUser?.uid;
		const displayName = auth.currentUser?.displayName ?? uid;
		if (!uid) return;

		clearTimeout(typingTimerRef.current);
		const chatRef = doc(db, 'chat', chatId);

		if (text.trim()) {
			typingTimerRef.current = setTimeout(() => {
				updateDoc(chatRef, {
					[`typingUsers.${uid}`]: serverTimestamp(),
					[`typingNames.${uid}`]: displayName,
				}).catch(() => {});
			}, TYPING_DEBOUNCE_MS);
		} else {
			// Clear immediately when the field is emptied
			updateDoc(chatRef, {
				[`typingUsers.${uid}`]: deleteField(),
				[`typingNames.${uid}`]: deleteField(),
			}).catch(() => {});
		}
	}, [chatId]);

	// ── Send message ──────────────────────────────────────────────────────────
	const sendMessage = useCallback(async () => {
		const trimmed = input.trim();
		if (!trimmed) return;

		const currentUser = auth.currentUser;
		if (!currentUser) return;

		Keyboard.dismiss();
		setInput('');
		clearTimeout(typingTimerRef.current);

		try {
			// Await the pre-send update so the Cloud Function always sees
			// the sender in members[] before the message document is created.
			// Also clears the typing indicator atomically.
			await updateDoc(doc(db, 'chat', chatId), {
				[`typingUsers.${currentUser.uid}`]: deleteField(),
				[`typingNames.${currentUser.uid}`]: deleteField(),
				members: arrayUnion(currentUser.uid),
			});

			await addDoc(collection(db, 'chat', chatId, 'messages'), {
				timestamp: serverTimestamp(),
				message: trimmed,
				displayName: currentUser.displayName,
				email: currentUser.email,
				uid: currentUser.uid,
				photoURL: currentUser.photoURL,
			});
		} catch {
			setInput(trimmed); // restore so the user can retry
			Alert.alert('Send failed', 'Your message could not be sent. Please try again.');
		}
	}, [input, chatId]);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" />
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={[styles.keyboard, { backgroundColor: colors.chatBackground }]}
				keyboardVerticalOffset={Platform.select({ ios: 0, android: 80 })}
			>
				<ScrollView
					ref={scrollViewRef}
					contentContainerStyle={{ paddingTop: 20 }}
					onContentSizeChange={handleContentSizeChange}
					maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
					onScroll={({ nativeEvent }) => {
						const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
						isNearBottomRef.current =
							contentOffset.y >= contentSize.height - layoutMeasurement.height - 100;
					}}
					scrollEventThrottle={200}
				>
					{hasMore && (
						<TouchableOpacity
							style={styles.loadMoreButton}
							onPress={loadMore}
							disabled={loadingMore}
						>
							{loadingMore ? (
								<ActivityIndicator size="small" color={colors.primary} />
							) : (
								<Text style={[styles.loadMoreText, { color: colors.primary }]}>
									Load earlier messages
								</Text>
							)}
						</TouchableOpacity>
					)}

					{messages.map(({ id, data }) => {
						const isMine = data.email === auth.currentUser?.email;
						return isMine ? (
							<View key={id} style={styles.bubbleRowSent}>
								<View style={[styles.sentBubble, { backgroundColor: colors.sentBubble }]}>
									<Text style={[styles.bubbleText, { color: colors.sentText }]}>
										{data.message}
									</Text>
									<Text style={[styles.timeago, { color: colors.sentText, opacity: 0.55 }]}>
										{timeAgo(data.timestamp?.seconds)}
									</Text>
								</View>
								<Avatar
									source={{ uri: data.photoURL }}
									rounded
									size={26}
									containerStyle={{ alignSelf: 'flex-end', marginBottom: 2 }}
								/>
							</View>
						) : (
							<View key={id} style={styles.bubbleRowReceived}>
								<Avatar
									source={{ uri: data.photoURL }}
									rounded
									size={26}
									containerStyle={{ alignSelf: 'flex-end', marginBottom: 2 }}
								/>
								<View style={[styles.receivedBubble, { backgroundColor: colors.receivedBubble }]}>
									<Text style={[styles.bubbleText, { color: colors.receivedText }]}>
										{data.message}
									</Text>
									<Text style={[styles.timeago, { color: colors.subtext }]}>
										{timeAgo(data.timestamp?.seconds)}
									</Text>
								</View>
							</View>
						);
					})}
				</ScrollView>

				{otherTyping && (
					<View style={[styles.typingRow, { backgroundColor: colors.footerBackground }]}>
						<Text style={[styles.typingText, { color: colors.subtext }]}>
							{otherTyping} is typing…
						</Text>
					</View>
				)}

				<View style={[styles.footer, { backgroundColor: colors.footerBackground, borderTopColor: colors.separator }]}>
					<TextInput
						placeholder="Message…"
						placeholderTextColor={colors.subtext}
						value={input}
						onChangeText={handleInputChange}
						onSubmitEditing={sendMessage}
						maxLength={2000}
						multiline
						style={[styles.textInput, {
							backgroundColor: colors.surface,
							color: colors.inputText,
						}]}
					/>
					<TouchableOpacity
						style={[styles.sendButton, { backgroundColor: colors.accent, opacity: input.trim() ? 1 : 0.35 }]}
						onPress={sendMessage}
						disabled={!input.trim()}
						activeOpacity={0.8}
					>
						<Ionicons name="arrow-up" size={20} color="#0D0D0D" />
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

export default ChatScreen;

const styles = StyleSheet.create({
	container: { flex: 1 },
	keyboard: { height: '100%' },
	loadMoreButton: {
		alignItems: 'center',
		paddingVertical: 12,
		marginBottom: 4,
	},
	loadMoreText: {
		fontSize: 13,
		fontWeight: '500',
		letterSpacing: 0.2,
	},
	// Bubble rows
	bubbleRowSent: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'flex-end',
		paddingHorizontal: 12,
		marginBottom: 8,
		gap: 6,
	},
	bubbleRowReceived: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'flex-start',
		paddingHorizontal: 12,
		marginBottom: 8,
		gap: 6,
	},
	sentBubble: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 18,
		borderBottomRightRadius: 4,
		maxWidth: '72%',
	},
	receivedBubble: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 18,
		borderBottomLeftRadius: 4,
		maxWidth: '72%',
	},
	bubbleText: {
		fontSize: 15,
		lineHeight: 21,
		fontWeight: '400',
	},
	timeago: {
		fontSize: 10,
		marginTop: 4,
		fontWeight: '400',
		letterSpacing: 0.2,
	},
	// Footer
	footer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		paddingHorizontal: 12,
		paddingVertical: 10,
		gap: 8,
		borderTopWidth: StyleSheet.hairlineWidth,
	},
	textInput: {
		flex: 1,
		maxHeight: 120,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingTop: Platform.OS === 'ios' ? 10 : 8,
		paddingBottom: Platform.OS === 'ios' ? 10 : 8,
		fontSize: 15,
	},
	sendButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 1,
	},
	// Typing
	typingRow: {
		paddingHorizontal: 20,
		paddingVertical: 6,
	},
	typingText: {
		fontSize: 12,
		fontStyle: 'italic',
		letterSpacing: 0.1,
	},
});
