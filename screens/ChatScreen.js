import { StatusBar } from 'expo-status-bar';
import React, { useLayoutEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { Avatar, Input } from '@rneui/themed';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { timeAgo } from '../utils/timeago';
import { useTheme } from '../hooks/useTheme';

// Truncate chat name at 20 chars with ellipsis
const truncateName = (name = '') =>
	name.length > 20
		? name[0].toUpperCase() + name.slice(1, 19).toLowerCase() + '…'
		: name[0].toUpperCase() + name.slice(1).toLowerCase();

const ChatScreen = ({ navigation, route }) => {
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState([]);
	const scrollViewRef = useRef(null);
	const { colors, isDark } = useTheme();

	// Header — does NOT depend on messages (content never changes with messages)
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
							color: Platform.OS === 'android' ? '#deebdd' : '#f5f7fa',
						}}
					>
						{truncateName(route.params.chatName)}
					</Text>
				</View>
			),
			headerRight: () => (
				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						width: 80,
						marginRight: 20,
					}}
				>
					<TouchableOpacity>
						<FontAwesome name="video-camera" size={24} color="white" />
					</TouchableOpacity>
					<TouchableOpacity>
						<Ionicons name="call" size={24} color="white" />
					</TouchableOpacity>
				</View>
			),
		});
	}, [navigation]);

	useLayoutEffect(() => {
		const messagesRef = collection(db, 'chat', route.params.id, 'messages');
		const q = query(messagesRef, orderBy('timestamp', 'asc'));
		const unsubscribe = onSnapshot(q, (snapshot) =>
			setMessages(
				snapshot.docs.map((doc) => ({
					id: doc.id,
					data: doc.data(),
				}))
			)
		);
		return unsubscribe;
	}, [route]);

	const sendMessage = async () => {
		const trimmed = input.trim();
		if (!trimmed) return;

		const currentUser = auth.currentUser;
		if (!currentUser) return; // guard against race with sign-out

		Keyboard.dismiss();
		setInput(''); // optimistic clear

		try {
			await addDoc(collection(db, 'chat', route.params.id, 'messages'), {
				timestamp: serverTimestamp(),
				message: trimmed,
				displayName: currentUser.displayName,
				email: currentUser.email,
				photoURL: currentUser.photoURL,
			});
		} catch (error) {
			setInput(trimmed); // restore so user can retry
			Alert.alert('Send failed', 'Your message could not be sent. Please try again.');
		}
	};

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
					onContentSizeChange={() =>
						scrollViewRef.current?.scrollToEnd({ animated: true })
					}
				>
					{messages.map(({ id, data }) =>
						data.email === auth.currentUser?.email ? (
							<View key={id} style={[styles.receiver, { backgroundColor: colors.sentBubble }]}>
								<Avatar
									source={{ uri: data.photoURL }}
									rounded
									containerStyle={{
										position: 'absolute',
										right: -33,
										top: 5,
									}}
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
									containerStyle={{
										position: 'absolute',
										top: 5,
										left: -33,
									}}
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
				<View style={[styles.footer, { backgroundColor: colors.footerBackground }]}>
					<Input
						placeholder="Write your message…"
						value={input}
						onChangeText={(text) => setInput(text)}
						onSubmitEditing={sendMessage}
						style={[styles.textInput, { backgroundColor: colors.inputBackground }]}
					/>
					<TouchableOpacity
						style={{
							width: 60,
							position: 'absolute',
							top: 6,
							right: 0,
							opacity: input.trim() ? 1 : 0.3,
						}}
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
		color: 'gray',
		borderRadius: 30,
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
