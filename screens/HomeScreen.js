import React, { useLayoutEffect, useState, useEffect, useRef, useCallback } from 'react';
import {
	AppState,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	Platform,
	Dimensions,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Avatar, ListItem } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomListItem from '../components/CustomListItem';
import { auth, db } from '../firebase/firebase';
import { signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import * as Notifications from 'expo-notifications';

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// Defined outside HomeScreen so React reconciles it as a stable component type
// (avoids unmount/remount flicker and Lottie animation restart on every re-render)
const LoadingView = () => {
	const { colors } = useTheme();
	return (
		<ListItem bottomDivider containerStyle={{ backgroundColor: colors.chatBackground }}>
			<LottieView
				source={require('../assets/animations/9329-loading.json')}
				style={{ height: 100 }}
				autoPlay
				loop
				speed={2}
			/>
		</ListItem>
	);
};

const HomeScreen = ({ navigation }) => {
	const [chats, setChats] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const backgroundTime = useRef(null);
	const { colors } = useTheme();

	// ── Session timeout via AppState ──────────────────────────────────────────
	const signOutUser = useCallback(async () => {
		await signOut(auth);
		navigation.replace('Login');
	}, [navigation]);

	useEffect(() => {
		const handleAppStateChange = (nextState) => {
			if (nextState === 'background' || nextState === 'inactive') {
				backgroundTime.current = Date.now();
			} else if (nextState === 'active' && backgroundTime.current) {
				const elapsed = Date.now() - backgroundTime.current;
				if (elapsed >= SESSION_TIMEOUT_MS) signOutUser();
				backgroundTime.current = null;
			}
		};
		const subscription = AppState.addEventListener('change', handleAppStateChange);
		return () => subscription.remove();
	}, [signOutUser]);

	// ── Chats real-time subscription ──────────────────────────────────────────
	useEffect(() => {
		const unsubscribe = onSnapshot(collection(db, 'chat'), (snapshot) => {
			setChats(snapshot.docs.map((d) => ({ id: d.id, data: d.data() })));
			setLoading(false);
		});
		return unsubscribe;
	}, []);

	// ── Push notification setup ───────────────────────────────────────────────
	useEffect(() => {
		let notifSubscription;

		const registerPushToken = async () => {
			try {
				const { status: existing } = await Notifications.getPermissionsAsync();
				let finalStatus = existing;

				if (existing !== 'granted') {
					const { status } = await Notifications.requestPermissionsAsync();
					finalStatus = status;
				}

				if (finalStatus !== 'granted') return; // user declined

				// getExpoPushTokenAsync requires an EAS projectId in production.
				// In Expo Go / development builds it works without one.
				const tokenData = await Notifications.getExpoPushTokenAsync();
				const token = tokenData.data;

				const uid = auth.currentUser?.uid;
				if (uid && token) {
					// Persist token so server-side code can send targeted notifications
					await setDoc(doc(db, 'users', uid), { expoPushToken: token }, { merge: true });
				}

				if (Platform.OS === 'android') {
					await Notifications.setNotificationChannelAsync('messages', {
						name: 'New messages',
						importance: Notifications.AndroidImportance.MAX,
						vibrationPattern: [0, 250, 250, 250],
						lightColor: '#2C6BED',
					});
				}
			} catch {
				// Non-critical: token registration fails in simulators and without EAS config.
				// The app works normally; users just won't receive push notifications.
			}
		};

		registerPushToken();

		// Handle notifications received while the app is open
		notifSubscription = Notifications.addNotificationReceivedListener(() => {
			// Notification already shown via setNotificationHandler.
			// Could increment a local badge counter here if needed.
		});

		return () => notifSubscription?.remove();
	}, []);

	// ── Header ────────────────────────────────────────────────────────────────
	useLayoutEffect(() => {
		navigation.setOptions({
			title: 'Chats',
			headerTitleAlign: 'center',
			headerStyle: { backgroundColor: colors.primary },
			headerTitleStyle: {
				color: colors.headerTitle,
				fontWeight: Platform.OS === 'android' ? 'bold' : '800',
				fontSize: 20,
			},
			headerTintColor: colors.headerTitle,
			headerLeft: () => (
				<View style={{ marginLeft: 5 }}>
					<TouchableOpacity
						onPress={signOutUser}
						activeOpacity={0.5}
						style={{ flexDirection: 'row', alignItems: 'center' }}
					>
						<Avatar rounded source={{ uri: auth.currentUser?.photoURL }} />
						<Text style={{ fontWeight: Platform.OS === 'android' ? 'bold' : '800', color: colors.sentText }}>
							{auth.currentUser?.displayName}
						</Text>
					</TouchableOpacity>
				</View>
			),
			headerRight: () => (
				<View
					style={{
						marginRight: Platform.isPad ? 50 : 10,
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
						...Platform.select({ web: { marginRight: 50 } }),
					}}
				>
					<Text
						style={{
							fontWeight: Platform.OS === 'android' ? 'bold' : '800',
							color: colors.headerTitle,
							position: 'absolute',
							left: -14,
							bottom: Platform.isPad ? 24 : 16,
						}}
					>
						New
					</Text>
					<TouchableOpacity onPress={() => navigation.navigate('AddChat')} activeOpacity={0.5}>
						<LottieView
							style={{ height: Platform.isPad ? 60 : 50 }}
							source={require('../assets/animations/8026-taking-notes.json')}
							autoPlay
							speed={0.5}
						/>
					</TouchableOpacity>
					<Text
						style={{
							fontWeight: Platform.OS === 'android' ? 'bold' : '800',
							color: colors.headerTitle,
							position: 'absolute',
							right: -14,
							bottom: Platform.isPad ? 24 : 16,
						}}
					>
						chat
					</Text>
				</View>
			),
		});
	}, [navigation, colors, signOutUser]);

	const enterChat = useCallback((id, chatName, image, userId) => {
		navigation.navigate('Chat', { id, chatName, image, userId });
	}, [navigation]);

	// ── Client-side search filter ─────────────────────────────────────────────
	const filteredChats = searchQuery.trim()
		? chats.filter(({ data }) =>
				data.chatName?.toLowerCase().includes(searchQuery.toLowerCase())
		  )
		: chats;

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
			{/* Search bar */}
			<View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
				<Ionicons name="search" size={16} color={colors.subtext} style={{ marginRight: 8 }} />
				<TextInput
					style={[styles.searchInput, { color: colors.text }]}
					placeholder="Search chats…"
					placeholderTextColor={colors.subtext}
					value={searchQuery}
					onChangeText={setSearchQuery}
					autoCapitalize="none"
					autoCorrect={false}
					clearButtonMode="while-editing"
				/>
			</View>

			<ScrollView style={styles.scrollContainer}>
				{loading
					? [1, 2, 3].map((i) => <LoadingView key={i} />)
					: filteredChats.map(({ id, data }) => (
							<CustomListItem
								key={id}
								id={id}
								chatName={data.chatName}
								image={data.image}
								userId={data.userId}
								lastRead={data.lastRead}
								typingUsers={data.typingUsers}
								typingNames={data.typingNames}
								enterChat={enterChat}
							/>
					  ))}

				{!loading && filteredChats.length === 0 && (
					<View style={styles.emptyState}>
						{searchQuery.trim() ? (
							<Text style={[styles.emptyStateText, { color: colors.emptyStateText }]}>
								No chats match "{searchQuery}"
							</Text>
						) : (
							<>
								<LottieView
									source={require('../assets/animations/21333-writer.json')}
									autoPlay
									style={{ height: 180 }}
									speed={1}
								/>
								<Text style={[styles.emptyStateText, { color: colors.emptyStateText }]}>
									No chats yet — tap "New chat" to start one!
								</Text>
							</>
						)}
					</View>
				)}
			</ScrollView>

			{filteredChats.length > 0 && !searchQuery.trim() && (
				<View style={styles.animation}>
					<LottieView
						style={{ height: filteredChats.length > 7 ? 100 : 200 }}
						source={require('../assets/animations/21333-writer.json')}
						autoPlay
						speed={2}
					/>
				</View>
			)}
		</SafeAreaView>
	);
};

export default HomeScreen;

const styles = StyleSheet.create({
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 12,
		marginVertical: 8,
		paddingHorizontal: 12,
		paddingVertical: Platform.OS === 'ios' ? 8 : 4,
		borderRadius: 10,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
	},
	scrollContainer: {
		width: Dimensions.get('window').width,
	},
	animation: {
		position: 'absolute',
		bottom: 10,
		left: 10,
	},
	emptyState: {
		alignItems: 'center',
		marginTop: 60,
		paddingHorizontal: 30,
	},
	emptyStateText: {
		textAlign: 'center',
		fontSize: 16,
		marginTop: 12,
		fontWeight: Platform.OS === 'android' ? 'bold' : '600',
	},
});
