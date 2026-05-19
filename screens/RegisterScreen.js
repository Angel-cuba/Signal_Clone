import { StatusBar } from 'expo-status-bar';
import React, { useState, useLayoutEffect } from 'react';
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Button, Input } from '@rneui/themed';
import { auth } from '../firebase/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { uploadImageToStorage } from '../utils/uploadImage';
import { pickImageFromCamera, pickImageFromGallery } from '../utils/pickImage';

const DEFAULT_AVATAR = 'https://res.cloudinary.com/dqaerysgb/image/upload/v1630358737/jooly8uzpykfvixik2vv.jpg';

const RegisterScreen = ({ navigation }) => {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [localImageUri, setLocalImageUri] = useState('');
	const [loading, setLoading] = useState(false);
	const { colors, isDark } = useTheme();

	useLayoutEffect(() => {
		navigation.setOptions({
			headerBackTitle: 'Back to Login',
			headerTintColor: 'white',
		});
	}, [navigation]);

	const register = async () => {
		// Validaciones básicas
		if (!name.trim()) {
			return Alert.alert('Missing information', 'Please enter your full name.');
		}
		if (!email.trim()) {
			return Alert.alert('Missing information', 'Please enter your email.');
		}
		if (password.length < 6) {
			return Alert.alert('Weak password', 'Password must be at least 6 characters.');
		}

		setLoading(true);
		try {
			const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);

			// Si hay imagen local, subirla a Storage y obtener URL remota
			let photoURL = DEFAULT_AVATAR;
			if (localImageUri) {
				photoURL = await uploadImageToStorage(localImageUri, 'avatars');
			}

			await updateProfile(user, {
				displayName: name.trim(),
				photoURL,
			});
			navigation.replace('Home');
		} catch (error) {
			Alert.alert('Registration failed', error.message, [
				{ text: 'OK', style: 'cancel' },
			]);
		} finally {
			setLoading(false);
		}
	};

	const handlePickCamera = async () => {
		const uri = await pickImageFromCamera('Camera access is needed to take a profile picture.');
		if (uri) setLocalImageUri(uri);
	};

	const handlePickGallery = async () => {
		const uri = await pickImageFromGallery('Gallery access is needed to select a profile picture.');
		if (uri) setLocalImageUri(uri);
	};

	return (
		<>
			<KeyboardAvoidingView
				behavior="padding"
				style={[styles.container, { backgroundColor: colors.background }]}
			>
				<StatusBar style={isDark ? 'light' : 'dark'} />

				<Text
					style={[
						styles.titleText,
						{
							color: Platform.OS === 'android'
								? colors.titleColorAndroid
								: colors.titleColor,
						},
					]}
				>
					Create a new account
				</Text>

				<View style={styles.inputContainer}>
					<Input
						placeholder="Full Name"
						autoFocus
						value={name}
						onChangeText={setName}
					/>
					<Input
						placeholder="Email"
						autoCapitalize="none"
						keyboardType="email-address"
						value={email}
						onChangeText={setEmail}
					/>
					<Input
						placeholder="Password (min. 6 characters)"
						secureTextEntry
						value={password}
						onChangeText={setPassword}
						onSubmitEditing={register}
					/>

					{localImageUri !== '' && (
						<View style={styles.imagePreview}>
							<Image source={{ uri: localImageUri }} style={{ width: 120, height: 120, borderRadius: 60 }} />
						</View>
					)}
				</View>

				<View style={styles.buttonsGroup}>
					<Button
						icon={<Icon name="camera" size={22} color="black" />}
						onPress={handlePickCamera}
						disabled={loading}
						title="Camera"
					/>
					<Button
						raised
						onPress={handlePickGallery}
						disabled={loading}
						icon={<Icon name="cellphone-arrow-down" size={22} color="black" />}
						title="Gallery"
					/>
				</View>

				<Button
					raised
					onPress={register}
					disabled={loading}
					title={loading ? 'Creating account...' : 'Register'}
					containerStyle={styles.registerButton}
				/>

				{loading && (
					<View style={styles.loadingScreen}>
						<LottieView
							source={require('../assets/animations/82472-loading.json')}
							autoPlay
							style={{ height: 300 }}
							speed={2}
						/>
					</View>
				)}
			</KeyboardAvoidingView>
		</>
	);
};

export default RegisterScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 10,
	},
	imagePreview: {
		alignItems: 'center',
		marginBottom: 10,
	},
	registerButton: {
		width: 200,
		marginTop: 10,
	},
	inputContainer: {
		width: 300,
	},
	titleText: {
		marginBottom: 50,
		fontSize: 30,
		fontWeight: Platform.OS === 'android' ? 'bold' : '700',
	},
	buttonsGroup: {
		marginVertical: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: 220,
		gap: 10,
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
