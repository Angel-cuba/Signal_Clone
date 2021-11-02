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
} from 'react-native';
import { Avatar, Input } from 'react-native-elements';
import { AntDesign, FontAwesome, Ionicons } from '@expo/vector-icons';
import { db, firebase } from '../firebase/firebase';
import TimeAgo from 'react-native-timeago';

const ChatScreen = ({ navigation, route }) => {
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
							uri: 'https://res.cloudinary.com/dqaerysgb/image/upload/v1632245932/paris_mulhc4.jpg',
						}}
						rounded
					/>
					<Text
						style={{
							paddingLeft: 5,
							fontWeight: '900',
							fontSize: 21,
							color: 'silver',
						}}
					>
						{route.params.chatName}
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
				keyboardVerticalOffset={90}
			>
				{/* onPress={Keyboard.dismiss()}> */}
				<TouchableWithoutFeedback>
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
											size={30}
										/>
										<Text style={styles.recieverText}>
											{data.message}
											<Text>
												<TimeAgo
													time={new Date(data.timestamp ? data.timestamp.seconds : '') * 1000}
													opts={{ minInterval: 60 }}
													locale="fi"
												/>
											</Text>
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
											size={30}
										/>
										<Text style={styles.senderText}>
											{data.message}

											{/* <Text>{data.timestamp ? moment().fromNow() : '...'}</Text> */}
											<Text>
												<TimeAgo
													time={new Date(data.timestamp ? data.timestamp.seconds : '') * 1000}
													opts={{ minInterval: 60 }}
													locale="fi"
												/>
											</Text>
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
							/>
							<TouchableOpacity style={{ marginBottom: 40 }} onPress={sendMessage} opacity={0.5}>
								<Ionicons name="send" size={42} color="navy" />
							</TouchableOpacity>
						</View>
					</>
				</TouchableWithoutFeedback>
			</KeyboardAvoidingView>
			{/* <Text>{route.params.chatName}</Text> */}
		</SafeAreaView>
	);
};

export default ChatScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		// backgroundColor: 'red',
		// height: '100%',
	},
	keyboard: {
		flex: 1,
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '90%',
		padding: 15,
	},
	textInput: {
		bottom: 10,
		height: 50,
		width: '90%',
		flex: 1,
		marginRight: 15,
		borderColor: 'transparent',
		backgroundColor: '#ECECEC',
		// borderWidth: 1,
		padding: 10,
		color: 'gray',
		borderRadius: 30,
	},
	recieverText: {
		color: 'red',
		fontWeight: '500',
		marginLeft: 10,
	},
	recierver: {
		padding: 15,
		backgroundColor: '#ECECEC',
		alignSelf: 'flex-end',
		borderRadius: 20,
		marginRight: 20,
		marginBottom: 20,
		maxWidth: '80%',
		position: 'relative',
	},
	senderText: {
		color: 'black',
		fontWeight: '500',
		marginLeft: 12,
		marginBottom: 15,
	},
	senderNameText: {
		left: 10,
		paddingRight: 10,
		fontSize: 10,
		color: 'white',
	},
	sender: {
		padding: 15,
		backgroundColor: 'lightblue',
		alignSelf: 'flex-start',
		borderRadius: 20,
		marginRight: 20,
		marginBottom: 20,
		maxWidth: '80%',
		position: 'relative',
	},
});
