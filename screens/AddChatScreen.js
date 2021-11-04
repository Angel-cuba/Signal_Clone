import React, { useLayoutEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert, Image, Platform } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { db, firebase } from '../firebase/firebase';
import * as ImagePicker from 'expo-image-picker';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';

const AddChatScreen = ({ navigation }) => {
	const [input, setInput] = useState('');
	const [chatImage, setChatImage] = useState('');
	const [loading, setLoading] = useState(false);

	const createChat = async () => {
		setLoading(true);
		await db
			.collection('chat')
			.add({
				chatName: input,
				image: chatImage,
				// timestamp: firebase.firestore.FieldValue.serverTimestamp(),
				userId: firebase.auth().currentUser.uid,
			})
			.then(() => {
				setTimeout(() => {
					setLoading(false);
					navigation.goBack();
				}, 2500);
			})
			.catch((error) => Alert.alert(error.message));
	};

	useLayoutEffect(() => {
		navigation.setOptions({
			title: 'Add a new Chat',
			headerBackTitle: 'Chats',
			headerTitleAlign: 'center',
		});
	}, [navigation]);

	//Picture for chat Header
	const uploadPictureWithCamera = async () => {
		if (Platform.OS !== 'web') {
			const { status } = await ImagePicker.requestCameraPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('You have to authorize permissions', [{ text: 'Ok....💥', style: 'cancel' }]);
				return;
			}
		}
		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.All,
			allowsEditing: true,
			aspect: [4, 3],
			quality: 1,
		});
		console.log(result);
		if (!result.cancelled) {
			setChatImage(result.uri);
			console.log('Done with camera ❤');
		}
	};
	const uploadPictureFromPhone = async () => {
		if (Platform.OS !== 'web') {
			const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('You have to authorize permissions', [{ text: 'Ok....💥', style: 'cancel' }]);
				return;
			}
		}
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.All,
			allowsEditing: true,
			aspect: [4, 3],
			quality: 1,
		});
		console.log(result);
		if (!result.cancelled) {
			setChatImage(result.uri);
			console.log('image upload successfully');
		}
	};

	return (
		<>
			<View style={styles.container}>
				<Input
					placeholder="Enter a new chat"
					value={input}
					onChangeText={(text) => setInput(text)}
					// onSubmitEditing={createChat}
					leftIcon={<Icon name="wechat" type="antdesign" size={24} color="black" />}
				/>
				<Input
					placeholder="Chat image (Optional)"
					type="text"
					value={chatImage}
					onChangeText={(text) => setChatImage(text)}
					onSubmitEditing={createChat}
					// leftIcon={<Icon name="wechat" type="antdesign" size={24} color="black" />}
				/>
				{/* Buttons for camera an phone image uploads */}
				{chatImage !== '' ? (
					<View style={styles.image}>
						<Image source={{ uri: chatImage }} style={{ width: 200, height: 200 }} />
					</View>
				) : (
					<View>
						<Text style={styles.text}>Upload chat image</Text>
					</View>
				)}
				<View
					style={[styles.buttonsBroup, chatImage === '' && styles.buttonsBroupMarginTop(chatImage)]}
				>
					<Button
						// raised
						icon={
							<LottieView
								style={{ height: 30 }}
								source={require('../assets/animations/9948-camera-pop-up.json')}
								autoPlay
								speed={0.8}
							/>
						}
						styles={styles.button}
						onPress={uploadPictureWithCamera}
						// iconPosition="right"
						title="Camera"
					/>
					<Button
						raised
						styles={styles.button}
						onPress={uploadPictureFromPhone}
						// icon={<Icon name="cellphone-arrow-down" size={24} color="black" />}
						icon={
							<LottieView
								style={{ height: 30 }}
								source={require('../assets/animations/45759-phone-icon.json')}
								autoPlay
								speed={0.793}
							/>
						}
						title="Phone"
					/>
				</View>
				<Button onPress={createChat} disabled={!input} title="Create a new chat" />
			</View>
			{loading && (
				<View style={styles.loadingScreen}>
					<LottieView
						source={require('../assets/animations/82472-loading.json')}
						autoPlay
						style={{ height: 200 }}
						speed={2}
					/>
				</View>
			)}
		</>
	);
};

export default AddChatScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		// justifyContent: 'center', //Este es que sube y baja pa darle espacio a la foto
		paddingVertical: 10,
		paddingTop: 50,
		backgroundColor: 'white',
		// backgroundColor: 'red',
	},
	buttonsBroup: {
		marginVertical: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: 200,
	},
	buttonsBroupMarginTop: (chatImage = '') => ({
		marginTop: chatImage === '' && 30,
	}),
	image: {
		width: 200,
		height: 200,
	},
	button: {
		backgroundColor: 'green',
	},
	text: {
		fontSize: 20,
		color: 'navy',
		fontWeight: Platform.OS === 'android' ? 'bold' : '700',
	},
	loadingScreen: {
		position: 'absolute',
		backgroundColor: 'black',
		opacity: 0.6,
		justifyContent: 'center',
		alignItems: 'center',
		width: '100%',
		height: '100%',
		zIndex: 1000,
	},
});
