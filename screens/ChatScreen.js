import React, { useLayoutEffect, useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	SafeAreaView,
	KeyboardAvoidingView,
	StatusBar,
	ScrollView,
	Keyboard,
	TouchableWithoutFeedback,
	Platform,
} from 'react-native';
import { Avatar, Input } from 'react-native-elements';
import { AntDesign, FontAwesome, Ionicons } from '@expo/vector-icons';
import { db, firebase } from '../firebase/firebase';
import TimeAgo from 'react-native-timeago';

const ChatScreen = ({ navigation, route }) => {
	// console.log('ChatScreen---------', route.params);
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState([]);
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
							uri: route.params
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
						{route.params.chatName[0].toUpperCase() +
							route.params.chatName.slice(1, 20).toLowerCase()}
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
	}, [navigation, messages]);

	useLayoutEffect(() => {
		const unsubscribe = db
			.collection('chat')
			.doc(route.params.id)
			.collection('messages')
			.orderBy('timestamp', 'asc')
			.onSnapshot((snapshot) =>
				setMessages(
					snapshot.docs.map((doc) => ({
						id: doc.id,
						data: doc.data(),
					}))
				)
			);
		return unsubscribe;
	}, [route]);

	const sendMessage = () => {
		Keyboard.dismiss();

		db.collection('chat').doc(route.params.id).collection('messages').add({
			timestamp: firebase.firestore.FieldValue.serverTimestamp(),
			message: input,
			displayName: firebase.auth().currentUser.displayName,
			email: firebase.auth().currentUser.email,
			photoURL: firebase.auth().currentUser.photoURL,
		});
		setInput('');
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" />
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboard}
				keyboardVerticalOffset={Platform.select({ ios: 0, android: 80 })}
			>
				{/* <TouchableWithoutFeedback> */}
				<>
					<ScrollView contentContainerStyle={{ paddingTop: 20 }}>
						{messages.map(({ id, data }) =>
							// console.log(data.message);
							// console.log(data.email);
							// console.log(firebase.auth().currentUser.email);
							data.email === firebase.auth().currentUser.email ? (
								<View key={id} style={styles.recierver}>
									<Avatar
										source={{ uri: data.photoURL }}
										position="absolute"
										rounded
										// WEB
										containerStyle={{
											position: 'absolute',
											right: -5,
											top: -15,
										}}
										right={-5}
										top={-15}
										size={28}
									/>
									<Text style={styles.recieverText}>{data.message}</Text>
									<Text style={styles.recieverTimeago}>
										<TimeAgo
											time={new Date(data.timestamp ? data.timestamp.seconds : '') * 1000}
											opts={{ minInterval: 60 }}
											locale="fi"
										/>
									</Text>
								</View>
							) : (
								<View key={id} style={styles.sender}>
									<Avatar
										source={{ uri: data.photoURL }}
										position="absolute"
										rounded
										containerStyle={{
											position: 'absolute',
											top: -15,
											left: -5,
										}}
										left={-5}
										top={-15}
										size={28}
									/>
									<Text style={styles.senderText}>{data.message}</Text>
									<Text style={styles.senderTimeago}>
										<TimeAgo
											time={new Date(data.timestamp ? data.timestamp.seconds : '') * 1000}
											opts={{ minInterval: 60 }}
											locale="fi"
										/>
									</Text>
								</View>
							)
						)}
					</ScrollView>
					<View style={styles.footer}>
						<Input
							placeholder="Signal message"
							value={input}
							onChangeText={(text) => setInput(text)}
							onSubmitEditing={sendMessage}
							style={styles.textInput}
							underlineColorAndroid="transparent"
						/>
						<TouchableOpacity
							style={{
								width: 60,
								// backgroundColor: 'green',
								position: 'absolute',
								top: 6,
								right: 0,
							}}
							onPress={sendMessage}
							opacity={0.5}
						>
							<Ionicons name="send" size={Platform.isPad ? 45 : 40} color="navy" />
						</TouchableOpacity>
					</View>
				</>
				{/* </TouchableWithoutFeedback> */}
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};
// //#e7d6e3
export default ChatScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	keyboard: {
		flex: 1,
		...Platform.select({
			ios: { backgroundColor: '#deebdd' },
			android: { backgroundColor: '#d3d3d3' },
			default: { backgroundColor: '#7f8c8d' },
		}),
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		paddingTop: 15,
		paddingRight: 55,
		paddingBottom: Platform.OS === 'android' ? 1 : 0,
		// 	paddingBottom: 15,
		backgroundColor: 'rgba(0,0,0,.111)',
	},
	textInput: {
		bottom: 10,
		height: 50,
		width: '100%',
		flex: 1,
		marginRight: 15,
		borderColor: 'transparent',
		backgroundColor: '#bdd4e7',
		padding: 10,
		color: 'gray',
		borderRadius: 30,
	},
	recieverText: {
		fontSize: 16,
		fontWeight: Platform.OS === 'android' ? 'bold' : '700',
		// color: Platform.OS === 'android' ? '#d3d3d3' : '#b0f3f1',
		marginLeft: 2,
		...Platform.select({
			ios: { color: '#b0f3f1' },
			android: { color: '#d3d3d3' },
			default: { color: '#7f8c8d' },
		}),
	},
	recierver: {
		padding: 15,
		backgroundColor: '#2a2a72',
		alignSelf: 'flex-end',
		borderTopLeftRadius: 10,
		borderBottomLeftRadius: 6,
		borderBottomRightRadius: 4,
		marginRight: 20,
		marginBottom: 28,
		maxWidth: '80%',
		position: 'relative',
	},
	recieverTimeago: {
		position: 'absolute',
		bottom: -14,
		right: 16,
		fontWeight: Platform.OS === 'android' ? 'bold' : '700',
		fontSize: 12,
	},
	senderText: {
		color: Platform.OS === 'android' ? '#030202' : '#000c14',
		fontWeight: Platform.OS === 'android' ? 'bold' : '700',
		fontSize: 16,
	},
	sender: {
		padding: 15,
		backgroundColor: '#8693ab',
		alignSelf: 'flex-start',
		borderRadius: 10,
		marginLeft: 20,
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
