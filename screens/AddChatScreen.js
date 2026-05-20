import React, { useLayoutEffect, useState } from 'react';
import {
	StyleSheet, Text, View, Alert, Image, Platform,
	TextInput, TouchableOpacity,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { auth, db } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Feather } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { uploadImageToStorage } from '../utils/uploadImage';
import { pickImageFromCamera, pickImageFromGallery } from '../utils/pickImage';

const AddChatScreen = ({ navigation }) => {
	const [chatName, setChatName] = useState('');
	const [localImageUri, setLocalImageUri] = useState('');
	const [loading, setLoading] = useState(false);
	const [focused, setFocused] = useState(false);
	const { colors, isDark } = useTheme();

	useLayoutEffect(() => {
		navigation.setOptions({
			title: 'New chat',
			headerTitleAlign: 'left',
			headerStyle: { backgroundColor: colors.headerBackground },
			headerShadowVisible: false,
			headerTitleStyle: {
				color: colors.headerTitle,
				fontWeight: '700',
				fontSize: 20,
				letterSpacing: -0.4,
			},
			headerTintColor: colors.accent,
		});
	}, [navigation, colors]);

	const createChat = async () => {
		const trimmedName = chatName.trim();
		if (!trimmedName) return Alert.alert('Chat name required', 'Please enter a name for the chat.');
		if (trimmedName.length > 50) return Alert.alert('Name too long', 'Chat name must be 50 characters or less.');

		const currentUser = auth.currentUser;
		if (!currentUser) {
			Alert.alert('Session expired', 'Please sign in again.');
			navigation.replace('Login');
			return;
		}

		setLoading(true);
		try {
			let imageURL = '';
			if (localImageUri) imageURL = await uploadImageToStorage(localImageUri, 'chats');

			await addDoc(collection(db, 'chat'), {
				chatName: trimmedName,
				image: imageURL,
				timestamp: serverTimestamp(),
				userId: currentUser.uid,
				members: [currentUser.uid],
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
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Chat name input */}
			<View style={styles.section}>
				<Text style={[styles.label, { color: colors.subtext }]}>CHAT NAME</Text>
				<View style={[styles.inputRow, { borderBottomColor: focused ? colors.accent : colors.inputBorder }]}>
					<Feather name="message-square" size={16} color={colors.subtext} style={{ marginRight: 10 }} />
					<TextInput
						style={[styles.input, { color: colors.inputText }]}
						placeholder="e.g. Design team"
						placeholderTextColor={colors.subtext}
						value={chatName}
						onChangeText={setChatName}
						maxLength={50}
						editable={!loading}
						onFocus={() => setFocused(true)}
						onBlur={() => setFocused(false)}
						onSubmitEditing={createChat}
					/>
					{chatName.length > 0 && (
						<Text style={[styles.charCount, { color: colors.subtext }]}>
							{chatName.length}/50
						</Text>
					)}
				</View>
			</View>

			{/* Image section */}
			<View style={styles.section}>
				<Text style={[styles.label, { color: colors.subtext }]}>CHAT IMAGE (OPTIONAL)</Text>
				<View style={styles.imageArea}>
					{localImageUri ? (
						<TouchableOpacity onPress={handlePickGallery} activeOpacity={0.85}>
							<Image source={{ uri: localImageUri }} style={styles.previewImage} />
							<View style={[styles.editBadge, { backgroundColor: colors.accent }]}>
								<Feather name="edit-2" size={10} color="#0D0D0D" />
							</View>
						</TouchableOpacity>
					) : (
						<View style={[styles.imagePlaceholder, { backgroundColor: colors.surface, borderColor: colors.inputBorder }]}>
							<Feather name="image" size={28} color={colors.subtext} />
							<Text style={[styles.placeholderText, { color: colors.subtext }]}>No image</Text>
						</View>
					)}

					<View style={styles.photoButtons}>
						<TouchableOpacity
							style={[styles.photoBtn, { backgroundColor: colors.surface }]}
							onPress={handlePickCamera}
							disabled={loading}
						>
							<LottieView
								style={{ height: 24 }}
								source={require('../assets/animations/9948-camera-pop-up.json')}
								autoPlay
								speed={0.8}
							/>
							<Text style={[styles.photoBtnText, { color: colors.text }]}>Camera</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.photoBtn, { backgroundColor: colors.surface }]}
							onPress={handlePickGallery}
							disabled={loading}
						>
							<Feather name="image" size={18} color={colors.text} />
							<Text style={[styles.photoBtnText, { color: colors.text }]}>Gallery</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>

			{/* CTA */}
			<TouchableOpacity
				style={[
					styles.createButton,
					{ backgroundColor: colors.accent },
					(!chatName.trim() || loading) && styles.buttonDisabled,
				]}
				onPress={createChat}
				disabled={!chatName.trim() || loading}
				activeOpacity={0.85}
			>
				<Text style={[styles.createButtonText, { color: isDark ? '#0D0D0D' : '#FFFFFF' }]}>
					{loading ? 'Creating…' : 'Create chat'}
				</Text>
			</TouchableOpacity>

			{loading && (
				<View style={styles.loadingOverlay}>
					<LottieView
						source={require('../assets/animations/82472-loading.json')}
						autoPlay
						style={{ height: 200 }}
						speed={2}
					/>
				</View>
			)}
		</View>
	);
};

export default AddChatScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 32,
	},
	section: {
		marginBottom: 32,
	},
	label: {
		fontSize: 11,
		fontWeight: '600',
		letterSpacing: 1.2,
		marginBottom: 12,
	},
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1.5,
		paddingBottom: 10,
	},
	input: {
		flex: 1,
		fontSize: 16,
		letterSpacing: 0.2,
	},
	charCount: {
		fontSize: 12,
		fontWeight: '500',
	},
	imageArea: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
	},
	previewImage: {
		width: 72,
		height: 72,
		borderRadius: 12,
	},
	editBadge: {
		position: 'absolute',
		bottom: -4,
		right: -4,
		width: 20,
		height: 20,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	imagePlaceholder: {
		width: 72,
		height: 72,
		borderRadius: 12,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 4,
	},
	placeholderText: {
		fontSize: 10,
		fontWeight: '500',
	},
	photoButtons: {
		flex: 1,
		gap: 10,
	},
	photoBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 10,
	},
	photoBtnText: {
		fontSize: 14,
		fontWeight: '500',
	},
	createButton: {
		height: 54,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 8,
	},
	buttonDisabled: {
		opacity: 0.35,
	},
	createButtonText: {
		fontSize: 16,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(13,13,13,0.85)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 50,
	},
});
