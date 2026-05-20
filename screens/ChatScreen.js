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

const PAGE_SIZE = 30;
const TYPING_DEBOUNCE_MS = 800; // delay before writing typing indicator to Firestore
const TYPING_TTL_MS = 5000;     // consider a user "not typing" after 5s without update

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
	const { colors } = useTheme();

	const chatId = route.params.id;

	// ── Header (stable: depends only on route params and colors) ──────────────
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

	// ── Messages subscription — re-runs when pageSize increases (load more) ───
	useEffect(() => {
		const messagesRef = collection(db, 'chat', chatId, 'messages');
		const q = query(messagesRef, orderBy('timestamp', 'asc'), limitToLast(pageSize));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			setMessages(snapshot.docs.map((d) => ({ id: d.id, data: d.data() })));
			setLoadingMore(false);
			// If fewer docs than requested, there are no older messages
			setHasMore(snapshot.docs.length >= pageSize);

			// Mark this chat as read for the current user (non-blocking)
			const uid = auth.currentUser?.uid;
			if (uid && snapshot.docs.length > 0) {
				updateDoc(doc(db, 'chat', chatId), {
					[`lastRead.${uid}`]: serverTimestamp(),
				}).catch(() => {});
			}
		});

		return unsubscribe;
	}, [chatId, pageSize]);

	// ── Chat document subscription — typing indicator + cleanup on unmount ────
	useEffect(() => {
		const chatRef = doc(db, 'chat', chatId);

		const unsubscribe = onSnapshot(chatRef, (snapshot) => {
			const data = snapshot.data();
			if (!data?.typingUsers) { setOtherTyping(null); return; }

			const uid = auth.currentUser?.uid;
			const now = Date.now();
			// Find a peer (not self) whose typing timestamp is within TTL
			const entry = Object.entries(data.typingUsers).find(
				([id, ts]) => id !== uid && ts?.toMillis?.() > now - TYPING_TTL_MS
			);
			setOtherTyping(entry ? (data.typingNames?.[entry[0]] ?? 'Someone') : null);
		});

		return () => {
			unsubscribe();
			// Clear our typing indicator when leaving the chat
			const uid = auth.currentUser?.uid;
			if (uid) {
				updateDoc(doc(db, 'chat', chatId), {
					[`typingUsers.${uid}`]: deleteField(),
					[`typingNames.${uid}`]: deleteField(),
				}).catch(() => {});
			}
		};
	}, [chatId]);

	// ── Auto-scroll ───────────────────────────────────────────────────────────
	const handleContentSizeChange = useCallback(() => {
		if (!hasScrolledInitially.current) {
			scrollViewRef.current?.scrollToEnd({ animated: false });
			hasScrolledInitially.current = true;
		} else {
			scrollViewRef.current?.scrollToEnd({ animated: true });
		}
	}, []);

	// ── Load earlier messages ─────────────────────────────────────────────────
	const loadMore = useCallback(() => {
		if (!hasMore || loadingMore) return;
		setLoadingMore(true);
		setPageSize((p) => p + PAGE_SIZE);
	}, [hasMore, loadingMore]);

	// ── Typing indicator write (debounced) ────────────────────────────────────
	const handleInputChange = useCallback((text) => {
		setInput(text);
		const uid = auth.currentUser?.uid;
		if (!uid) return;

		clearTimeout(typingTimerRef.current);
		const chatRef = doc(db, 'chat', chatId);

		if (text.trim()) {
			typingTimerRef.current = setTimeout(() => {
				updateDoc(chatRef, {
					[`typingUsers.${uid}`]: serverTimestamp(),
					[`typingNames.${uid}`]: auth.currentUser?.displayName ?? uid,
				}).catch(() => {});
			}, TYPING_DEBOUNCE_MS);
		} else {
			// Clear immediately when input is empty
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

		// Clear typing indicator immediately
		clearTimeout(typingTimerRef.current);
		updateDoc(doc(db, 'chat', chatId), {
			[`typingUsers.${currentUser.uid}`]: deleteField(),
			[`typingNames.${currentUser.uid}`]: deleteField(),
		}).catch(() => {});

		try {
			await addDoc(collection(db, 'chat', chatId, 'messages'), {
				timestamp: serverTimestamp(),
				message: trimmed,
				displayName: currentUser.displayName,
				email: currentUser.email,
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
				>
					{/* Load earlier messages button */}
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
							// Sent bubble (current user)
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
							// Received bubble (other user)
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

				{/* Typing indicator — shown above the input bar */}
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
	container: {
		flex: 1,
	},
	keyboard: {
		height: '100%',
	},
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
