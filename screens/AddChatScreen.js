import React, { useLayoutEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert, Image, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Input, Button } from '@rneui/themed';
import { auth, db } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { uploadImageToStorage } from '../utils/uploadImage';
import { pickImageFromCamera, pickImageFromGallery } from '../utils/pickImage';

const AddChatScreen = ({ navigation }) => {
	const [chatName, setChatName] = useState('');
	const [localImageUri, setLocalImageUri] = useState('');
	const [loading, setLoading] = useState(false);
	const { colors } = useTheme();

	useLayoutEffect(() => {
		navigation.setOptions({
			title: 'New Chat',
			headerTitleAlign: 'center',
		});
	}, [navigation]);

	const createChat = async () => {
		const trimmedName = chatName.trim();
		if (!trimmedName) {
			return Alert.alert('Chat name required', 'Please enter a name for the chat.');
		}
		if (trimmedName.length > 50) {
			return Alert.alert('Name too long', 'Chat name must be 50 characters or less.');
		}

		setLoading(true);
		try {
			// Subir imagen a Storage si hay una imagen local seleccionada
			let imageURL = '';
			if (localImageUri) {
				imageURL = await uploadImageToStorage(localImageUri, 'chats');
			}

			await addDoc(collection(db, 'chat'), {
				chatName: trimmedName,
				image: imageURL,
				timestamp: serverTimestamp(),
				userId: auth.currentUser.uid,
			});

			navigation.goBack();
		} catch (error) {
			Alert.alert('Could not create chat', error.message);
		} finally {
			setLoading(false);
		}
	};

	const handlePickCamera = async () => {
		const uri = await pickImageFromCamera('Camera access is needed to add a chat image.');
		if (uri) setLocalImageUri(uri);
	};

	const handlePickGallery = async () => {
		const uri = await pickImageFromGallery('Gallery access is needed to select a chat image.');
		if (uri) setLocalImageUri(uri);
	};

	return (
		<>
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Input
					placeholder="Chat name"
					value={chatName}
					onChangeText={setChatName}
					maxLength={50}
					leftIcon={<Icon name="wechat" size={24} color="black" />}
				/>

				{localImageUri !== '' ? (
					<View style={styles.imagePreview}>
						<Image source={{ uri: localImageUri }} style={{ width: 160, height: 160, borderRadius: 12 }} />
					</View>
				) : (
					<Text style={styles.text}>Add a chat image (optional)</Text>
				)}

				<View style={styles.buttonsGroup}>
					<Button
						icon={
							<LottieView
								style={{ height: 30 }}
								source={require('../assets/animations/9948-camera-pop-up.json')}
								autoPlay
								speed={0.8}
							/>
						}
						onPress={handlePickCamera}
						title="Camera"
					/>
					<Button
						raised
						onPress={handlePickGallery}
						icon={
							<LottieView
								style={{ height: 29 }}
								source={require('../assets/animations/45759-phone-icon.json')}
								autoPlay
								speed={0.793}
							/>
						}
						title="Gallery"
					/>
				</View>

				<Button
					onPress={createChat}
					disabled={!chatName.trim() || loading}
					title={loading ? 'Creating...' : 'Create chat'}
					containerStyle={styles.createButton}
				/>
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
		paddingVertical: 10,
		paddingTop: 40,
	},
	buttonsGroup: {
		marginVertical: 16,
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
		width: 260,
	},
	imagePreview: {
		marginVertical: 12,
		alignItems: 'center',
	},
	createButton: {
		width: 220,
		marginTop: 10,
	},
	text: {
		fontSize: 16,
		color: 'navy',
		fontWeight: Platform.OS === 'android' ? 'bold' : '600',
		marginVertical: 12,
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
