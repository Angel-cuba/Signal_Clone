import { StatusBar } from 'expo-status-bar';
import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import {
	StyleSheet,
	Text,
	View,
	KeyboardAvoidingView,
	Platform,
	Image,
	Alert,
	TextInput,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { auth } from '../firebase/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Feather } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { uploadImageToStorage } from '../utils/uploadImage';
import { pickImageFromCamera, pickImageFromGallery } from '../utils/pickImage';

const DEFAULT_AVATAR = 'https://res.cloudinary.com/dqaerysgb/image/upload/v1630358737/jooly8uzpykfvixik2vv.jpg';

const RegisterScreen = ({ navigation }) => {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [localImageUri, setLocalImageUri] = useState('');
	const [loading, setLoading] = useState(false);
	const [focusedField, setFocusedField] = useState(null);
	const { colors, isDark } = useTheme();
	const isMountedRef = useRef(true);
	useEffect(() => () => { isMountedRef.current = false; }, []);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerBackTitle: 'Back',
			headerTintColor: colors.accent,
			headerStyle: { backgroundColor: colors.background },
			headerShadowVisible: false,
			title: '',
		});
	}, [navigation, colors]);

	const register = async () => {
		if (!name.trim()) return Alert.alert('Missing information', 'Please enter your full name.');
		if (!email.trim()) return Alert.alert('Missing information', 'Please enter your email.');
		if (password.length < 6) return Alert.alert('Weak password', 'Password must be at least 6 characters.');

		setLoading(true);
		try {
			const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
			let photoURL = DEFAULT_AVATAR;
			if (localImageUri) {
				photoURL = await uploadImageToStorage(localImageUri, 'avatars');
			}
			await updateProfile(user, { displayName: name.trim(), photoURL });
		} catch (error) {
			Alert.alert('Registration failed', error.message, [{ text: 'OK', style: 'cancel' }]);
		} finally {
			if (isMountedRef.current) setLoading(false);
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

	const inputBorderColor = (field) =>
		focusedField === field ? colors.accent : colors.inputBorder;

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={[styles.container, { backgroundColor: colors.background }]}
		>
			<StatusBar style={isDark ? 'light' : 'dark'} />
			<ScrollView
				contentContainerStyle={styles.scroll}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Heading */}
				<View style={styles.headingArea}>
					<Text style={[styles.heading, { color: colors.text }]}>Create{'\n'}account.</Text>
					<Text style={[styles.subheading, { color: colors.subtext }]}>
						Join the conversation
					</Text>
				</View>

				{/* Avatar picker */}
				<TouchableOpacity style={styles.avatarArea} onPress={handlePickGallery} activeOpacity={0.8}>
					{localImageUri ? (
						<Image source={{ uri: localImageUri }} style={styles.avatar} />
					) : (
						<View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface, borderColor: colors.inputBorder }]}>
							<Feather name="camera" size={24} color={colors.subtext} />
							<Text style={[styles.avatarPlaceholderText, { color: colors.subtext }]}>Add photo</Text>
						</View>
					)}
					{localImageUri ? (
						<View style={[styles.avatarEditBadge, { backgroundColor: colors.accent }]}>
							<Feather name="edit-2" size={10} color="#0D0D0D" />
						</View>
					) : null}
				</TouchableOpacity>

				{/* Photo source row */}
				<View style={styles.photoRow}>
					<TouchableOpacity
						onPress={handlePickCamera}
						disabled={loading}
						style={styles.photoButton}
					>
						<Feather name="camera" size={14} color={colors.accent} />
						<Text style={[styles.photoButtonText, { color: colors.accent }]}>Camera</Text>
					</TouchableOpacity>
					<View style={[styles.photoDivider, { backgroundColor: colors.separator }]} />
					<TouchableOpacity
						onPress={handlePickGallery}
						disabled={loading}
						style={styles.photoButton}
					>
						<Feather name="image" size={14} color={colors.accent} />
						<Text style={[styles.photoButtonText, { color: colors.accent }]}>Gallery</Text>
					</TouchableOpacity>
				</View>

				{/* Fields */}
				<View style={styles.fields}>
					<View style={styles.fieldGroup}>
						<Text style={[styles.label, { color: colors.subtext }]}>FULL NAME</Text>
						<TextInput
							style={[styles.input, { color: colors.inputText, borderBottomColor: inputBorderColor('name') }]}
							placeholder="Your name"
							placeholderTextColor={colors.subtext}
							autoFocus
							value={name}
							onChangeText={setName}
							onFocus={() => setFocusedField('name')}
							onBlur={() => setFocusedField(null)}
							editable={!loading}
						/>
					</View>

					<View style={styles.fieldGroup}>
						<Text style={[styles.label, { color: colors.subtext }]}>EMAIL</Text>
						<TextInput
							style={[styles.input, { color: colors.inputText, borderBottomColor: inputBorderColor('email') }]}
							placeholder="your@email.com"
							placeholderTextColor={colors.subtext}
							autoCapitalize="none"
							keyboardType="email-address"
							value={email}
							onChangeText={setEmail}
							onFocus={() => setFocusedField('email')}
							onBlur={() => setFocusedField(null)}
							editable={!loading}
						/>
					</View>

					<View style={styles.fieldGroup}>
						<Text style={[styles.label, { color: colors.subtext }]}>PASSWORD</Text>
						<View style={[styles.passwordRow, { borderBottomColor: inputBorderColor('password') }]}>
							<TextInput
								style={[styles.input, styles.passwordInput, { color: colors.inputText }]}
								placeholder="Min. 6 characters"
								placeholderTextColor={colors.subtext}
								secureTextEntry={!showPassword}
								value={password}
								onChangeText={setPassword}
								onSubmitEditing={register}
								onFocus={() => setFocusedField('password')}
								onBlur={() => setFocusedField(null)}
								editable={!loading}
							/>
							<TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
								<Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={colors.subtext} />
							</TouchableOpacity>
						</View>
					</View>
				</View>

				{/* CTA */}
				<TouchableOpacity
					style={[styles.primaryButton, { backgroundColor: colors.accent }, loading && styles.buttonLoading]}
					onPress={register}
					disabled={loading}
					activeOpacity={0.85}
				>
					<Text style={[styles.primaryButtonText, { color: isDark ? '#0D0D0D' : '#FFFFFF' }]}>
						{loading ? 'Creating account…' : 'Create account'}
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={() => navigation.goBack()}
					disabled={loading}
					style={styles.secondaryAction}
				>
					<Text style={[styles.secondaryText, { color: colors.subtext }]}>
						Already have an account?{' '}
						<Text style={{ color: colors.accent, fontWeight: '600' }}>Sign in →</Text>
					</Text>
				</TouchableOpacity>
			</ScrollView>

			{/* Loading overlay */}
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
		</KeyboardAvoidingView>
	);
};

export default RegisterScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scroll: {
		paddingHorizontal: 32,
		paddingTop: 24,
		paddingBottom: 48,
	},
	headingArea: {
		marginBottom: 36,
	},
	heading: {
		fontSize: 42,
		fontWeight: '700',
		letterSpacing: -1.5,
		lineHeight: 48,
		marginBottom: 8,
	},
	subheading: {
		fontSize: 16,
		fontWeight: '400',
	},
	avatarArea: {
		alignSelf: 'flex-start',
		marginBottom: 16,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
	},
	avatarPlaceholder: {
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 4,
	},
	avatarPlaceholderText: {
		fontSize: 10,
		fontWeight: '500',
		letterSpacing: 0.3,
	},
	avatarEditBadge: {
		position: 'absolute',
		bottom: 2,
		right: 2,
		width: 22,
		height: 22,
		borderRadius: 11,
		justifyContent: 'center',
		alignItems: 'center',
	},
	photoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 36,
		gap: 0,
	},
	photoButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 4,
		paddingRight: 16,
	},
	photoButtonText: {
		fontSize: 13,
		fontWeight: '600',
		letterSpacing: 0.2,
	},
	photoDivider: {
		width: 1,
		height: 14,
		marginRight: 16,
	},
	fields: {
		gap: 28,
		marginBottom: 40,
	},
	fieldGroup: {
		gap: 8,
	},
	label: {
		fontSize: 11,
		fontWeight: '600',
		letterSpacing: 1.2,
	},
	input: {
		fontSize: 16,
		paddingVertical: 10,
		borderBottomWidth: 1.5,
		letterSpacing: 0.2,
	},
	passwordRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1.5,
	},
	passwordInput: {
		flex: 1,
		borderBottomWidth: 0,
	},
	eyeButton: {
		padding: 4,
	},
	primaryButton: {
		height: 54,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20,
	},
	buttonLoading: {
		opacity: 0.6,
	},
	primaryButtonText: {
		fontSize: 16,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
	secondaryAction: {
		alignItems: 'center',
		paddingVertical: 8,
	},
	secondaryText: {
		fontSize: 14,
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(13,13,13,0.85)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 50,
	},
});
