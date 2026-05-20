import { StatusBar } from 'expo-status-bar';
import React, { useLayoutEffect, useState, useRef, useEffect, useCallback } from 'react';
import {
	Alert,
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	SafeAreaView,
	KeyboardAvoidingView,
	ScrollView,
	Keyboard,
	Platform,
	ActivityIndicator,
} from 'react-native';
import { Avatar, Input } from '@rneui/themed';
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

		// Clear typing indicator immediately before the async addDoc.
		// Also add the sender to members[] so the Cloud Function can find their
		// recipients on future messages. arrayUnion is a no-op if already present.
		clearTimeout(typingTimerRef.current);
		updateDoc(doc(db, 'chat', chatId), {
			[`typingUsers.${currentUser.uid}`]: deleteField(),
			[`typingNames.${currentUser.uid}`]: deleteField(),
			members: arrayUnion(currentUser.uid),
		}).catch(() => {});

		try {
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

					{messages.map(({ id, data }) =>
						data.email === auth.currentUser?.email ? (
							<View key={id} style={[styles.receiver, { backgroundColor: colors.sentBubble }]}>
								<Avatar
									source={{ uri: data.photoURL }}
									rounded
									containerStyle={{ position: 'absolute', right: -33, top: 5 }}
									size={30}
								/>
								<Text style={[styles.receiverText, { color: colors.sentText }]}>
									{data.message}
								</Text>
								<Text style={[styles.receiverTimeago, { color: colors.timeago }]}>
									{timeAgo(data.timestamp?.seconds)}
								</Text>
							</View>
						) : (
							<View key={id} style={[styles.sender, { backgroundColor: colors.receivedBubble }]}>
								<Avatar
									source={{ uri: data.photoURL }}
									rounded
									containerStyle={{ position: 'absolute', top: 5, left: -33 }}
									size={30}
								/>
								<Text style={[styles.senderText, { color: colors.receivedText }]}>
									{data.message}
								</Text>
								<Text style={[styles.senderTimeago, { color: colors.timeago }]}>
									{timeAgo(data.timestamp?.seconds)}
								</Text>
							</View>
						)
					)}
				</ScrollView>

				{otherTyping && (
					<View style={[styles.typingRow, { backgroundColor: colors.footerBackground }]}>
						<Text style={[styles.typingText, { color: colors.subtext }]}>
							{otherTyping} is typing…
						</Text>
					</View>
				)}

				<View style={[styles.footer, { backgroundColor: colors.footerBackground }]}>
					<Input
						placeholder="Write your message…"
						value={input}
						onChangeText={handleInputChange}
						onSubmitEditing={sendMessage}
						maxLength={2000}
						style={[styles.textInput, {
							backgroundColor: colors.inputBackground,
							color: colors.inputText,
						}]}
					/>
					<TouchableOpacity
						style={[styles.sendButton, { opacity: input.trim() ? 1 : 0.3 }]}
						onPress={sendMessage}
						disabled={!input.trim()}
					>
						<Ionicons name="send" size={Platform.isPad ? 45 : 40} color={colors.primary} />
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
		paddingVertical: 10,
		marginBottom: 4,
	},
	loadMoreText: {
		fontSize: 13,
		fontWeight: Platform.OS === 'android' ? 'bold' : '600',
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		paddingTop: 15,
		paddingRight: 55,
		paddingBottom: Platform.OS === 'android' ? 1 : 0,
	},
	textInput: {
		bottom: 10,
		height: 50,
		width: '100%',
		flex: 1,
		marginRight: 15,
		borderColor: 'transparent',
		padding: 10,
		borderRadius: 30,
	},
	sendButton: {
		width: 60,
		position: 'absolute',
		top: 6,
		right: 0,
	},
	typingRow: {
		paddingHorizontal: 20,
		paddingVertical: 4,
	},
	typingText: {
		fontSize: 12,
		fontStyle: 'italic',
	},
	receiverText: {
		fontSize: 16,
		fontWeight: Platform.OS === 'android' ? 'bold' : '700',
		marginLeft: 2,
	},
	receiver: {
		padding: 15,
		alignSelf: 'flex-end',
		borderTopLeftRadius: 10,
		borderBottomLeftRadius: 6,
		borderBottomRightRadius: 4,
		borderTopRightRadius: 5,
		marginRight: 50,
		marginBottom: 28,
		maxWidth: '80%',
		position: 'relative',
	},
	receiverTimeago: {
		position: 'absolute',
		bottom: -14,
		right: 16,
		fontWeight: Platform.OS === 'android' ? 'bold' : '700',
		fontSize: 12,
	},
	senderText: {
		fontWeight: Platform.OS === 'android' ? 'bold' : '700',
		fontSize: 16,
	},
	sender: {
		padding: 15,
		alignSelf: 'flex-start',
		borderRadius: 10,
		marginLeft: 50,
		marginBottom: 28,
		maxWidth: '80%',
		position: 'relative',
	},
	senderTimeago: {
		position: 'absolute',
		bottom: -14,
		left: 16,
		fontWeight: Platform.OS === 'android' ? 'bold' : '700',
		fontSize: 12,
	},
});
