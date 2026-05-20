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
} from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
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

// Note: Notifications.setNotificationHandler is configured once in App.js
// (module scope at the entry point) to avoid re-registration on re-renders.

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
		const registerPushToken = async () => {
			// Push tokens are only available on physical devices — skip simulators.
			if (!Device.isDevice) return;

			try {
				const { status: existing } = await Notifications.getPermissionsAsync();
				let finalStatus = existing;

				if (existing !== 'granted') {
					const { status } = await Notifications.requestPermissionsAsync();
					finalStatus = status;
				}

				if (finalStatus !== 'granted') return; // user declined

				// projectId is required in standalone/production builds (EAS).
				// In Expo Go it is resolved from the manifest automatically.
				// Configure the value under expo.extra.eas.projectId in app.json.
				const projectId = Constants.expoConfig?.extra?.eas?.projectId;
				const tokenData = await Notifications.getExpoPushTokenAsync(
					projectId ? { projectId } : undefined
				);
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
	}, []);

	// ── Header ────────────────────────────────────────────────────────────────
	useLayoutEffect(() => {
		navigation.setOptions({
			title: 'Messages',
			headerTitleAlign: 'left',
			headerStyle: { backgroundColor: colors.headerBackground },
			headerShadowVisible: false,
			headerTitleStyle: {
				color: colors.headerTitle,
				fontWeight: '700',
				fontSize: 22,
				letterSpacing: -0.5,
			},
			headerTintColor: colors.headerTitle,
			headerLeft: () => (
				<TouchableOpacity
					onPress={signOutUser}
					activeOpacity={0.7}
					style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}
				>
					<Avatar
						rounded
						source={{ uri: auth.currentUser?.photoURL }}
						size={32}
						containerStyle={{
							borderWidth: 2,
							borderColor: colors.accent,
						}}
					/>
				</TouchableOpacity>
			),
			headerRight: () => (
				<TouchableOpacity
					onPress={() => navigation.navigate('AddChat')}
					activeOpacity={0.7}
					style={{
						marginRight: 16,
						width: 36,
						height: 36,
						borderRadius: 18,
						backgroundColor: colors.accent,
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<Ionicons name="add" size={22} color="#0D0D0D" />
				</TouchableOpacity>
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
				<Ionicons name="search-outline" size={15} color={colors.subtext} style={{ marginRight: 8 }} />
				<TextInput
					style={[styles.searchInput, { color: colors.text }]}
					placeholder="Search messages…"
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
				<View style={styles.animation} pointerEvents="none">
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
		marginHorizontal: 16,
		marginVertical: 10,
		paddingHorizontal: 14,
		paddingVertical: Platform.OS === 'ios' ? 9 : 6,
		borderRadius: 12,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		letterSpacing: 0.1,
	},
	scrollContainer: {
		flex: 1,
	},
	animation: {
		position: 'absolute',
		bottom: 10,
		left: 10,
	},
	emptyState: {
		alignItems: 'center',
		marginTop: 80,
		paddingHorizontal: 40,
	},
	emptyStateText: {
		textAlign: 'center',
		fontSize: 15,
		marginTop: 16,
		fontWeight: '500',
		letterSpacing: 0.1,
	},
});
