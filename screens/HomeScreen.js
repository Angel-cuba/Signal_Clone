import React, { useLayoutEffect, useState, useEffect, useRef, useCallback } from 'react';
import {
	AppState,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	Platform,
	Dimensions,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Avatar, ListItem } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomListItem from '../components/CustomListItem';
import { auth, db } from '../firebase/firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import LottieView from 'lottie-react-native';

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora

// Defined outside HomeScreen so React reconciles it as a stable component reference
// (not a new function type on every re-render, which would cause unmount/remount flicker)
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
	const backgroundTime = useRef(null);
	const { colors } = useTheme();

	const signOutUser = useCallback(async () => {
		await signOut(auth);
		navigation.replace('Login');
	}, [navigation]);

	// Manejo de sesión con AppState — detecta cuando la app vuelve del background
	useEffect(() => {
		const handleAppStateChange = (nextState) => {
			if (nextState === 'background' || nextState === 'inactive') {
				backgroundTime.current = Date.now();
			} else if (nextState === 'active' && backgroundTime.current) {
				const elapsed = Date.now() - backgroundTime.current;
				if (elapsed >= SESSION_TIMEOUT_MS) {
					signOutUser();
				}
				backgroundTime.current = null;
			}
		};

		const subscription = AppState.addEventListener('change', handleAppStateChange);
		return () => subscription.remove();
	}, [signOutUser]);

	useEffect(() => {
		const unsubscribe = onSnapshot(collection(db, 'chat'), (snapshot) => {
			setChats(
				snapshot.docs.map((doc) => ({
					id: doc.id,
					data: doc.data(),
				}))
			);
			setLoading(false);
		});
		return unsubscribe;
	}, []);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: 'Chats',
			headerTitleAlign: 'center',
			headerStyle: { backgroundColor: '#2C6BED' },
			headerTitleStyle: {
				color: '#dee',
				fontWeight: Platform.OS === 'android' ? 'bold' : '800',
				fontSize: 20,
			},
			headerTintColor: 'black',
			headerLeft: () => (
				<View style={{ marginLeft: 5 }}>
					<TouchableOpacity
						onPress={signOutUser}
						activeOpacity={0.5}
						style={{ flexDirection: 'row', alignItems: 'center' }}
					>
						<Avatar rounded source={{ uri: auth.currentUser?.photoURL }} />
						<Text
							style={{ fontWeight: Platform.OS === 'android' ? 'bold' : '800', color: '#83eaf1' }}
						>
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
						...Platform.select({
							web: { marginRight: 50 },
						}),
					}}
				>
					<Text
						style={{
							fontWeight: Platform.OS === 'android' ? 'bold' : '800',
							color: '#000',
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
							color: '#000',
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
	}, [navigation]);

	const enterChat = (id, chatName, image, userId) => {
		navigation.navigate('Chat', {
			id,
			chatName,
			image,
			userId,
		});
	};
	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
			<ScrollView style={styles.scrollContainer}>
				{loading
					? [1, 2, 3].map((i) => <LoadingView key={i} id={i} />)
					: chats.map(({ id, data: { chatName, image, userId } }) => (
							<CustomListItem
								key={id}
								id={id}
								chatName={chatName}
								image={image}
								userId={userId}
								enterChat={enterChat}
							/>
					  ))}

				{!loading && chats.length === 0 && (
					<View style={styles.emptyState}>
						<LottieView
							source={require('../assets/animations/21333-writer.json')}
							autoPlay
							style={{ height: 180 }}
							speed={1}
						/>
						<Text style={[styles.emptyStateText, { color: colors.emptyStateText }]}>
							No chats yet — tap "New chat" to start one!
						</Text>
					</View>
				)}
			</ScrollView>

			{chats.length > 0 && (
				<View style={styles.animation}>
					<LottieView
						style={{ height: chats.length > 7 ? 100 : 200 }}
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
	scrollContainer: {
		height: '100%',
		width: Dimensions.get('window').width,
	},
	animation: {
		position: 'absolute',
		bottom: 10,
		left: 10,
		// Only rendered when chats.length > 0, so it won't overlap the empty state
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
