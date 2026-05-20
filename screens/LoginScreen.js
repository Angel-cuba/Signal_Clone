import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
import {
	StyleSheet,
	View,
	KeyboardAvoidingView,
	Alert,
	TouchableOpacity,
	Text,
	TextInput,
	Platform,
	Image,
} from 'react-native';
import { auth } from '../firebase/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

const LoginScreen = ({ navigation }) => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [focusedField, setFocusedField] = useState(null);
	const { colors, isDark } = useTheme();
	const isMountedRef = useRef(true);
	useEffect(() => () => { isMountedRef.current = false; }, []);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (authUser) => {
			if (authUser) navigation.replace('Home');
		});
		return unsubscribe;
	}, [navigation]);

	const signIn = async () => {
		if (!email.trim() || !password) {
			return Alert.alert('Missing fields', 'Please enter your email and password.');
		}
		setLoading(true);
		try {
			await signInWithEmailAndPassword(auth, email.trim(), password);
		} catch (error) {
			Alert.alert('Sign in failed', error.message, [
				{ text: 'OK', style: 'cancel' },
				{ text: 'Create account', onPress: () => navigation.push('Register') },
			]);
		} finally {
			if (isMountedRef.current) setLoading(false);
		}
	};

	const inputBorderColor = (field) =>
		focusedField === field ? colors.accent : colors.inputBorder;

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={[styles.container, { backgroundColor: colors.background }]}
		>
			<StatusBar style={isDark ? 'light' : 'dark'} />

			{/* Logo mark */}
			<View style={styles.logoArea}>
				<Image
					source={require('../assets/icon.png')}
					style={styles.logoImage}
					resizeMode="contain"
				/>
				<Text style={[styles.appName, { color: colors.accent }]}>Signal</Text>
			</View>

			{/* Heading */}
			<View style={styles.headingArea}>
				<Text style={[styles.heading, { color: colors.text }]}>Welcome{'\n'}back.</Text>
				<Text style={[styles.subheading, { color: colors.subtext }]}>
					Sign in to continue
				</Text>
			</View>

			{/* Inputs */}
			<View style={styles.fields}>
				<View style={styles.fieldGroup}>
					<Text style={[styles.label, { color: colors.subtext }]}>EMAIL</Text>
					<TextInput
						style={[styles.input, { color: colors.inputText, borderBottomColor: inputBorderColor('email') }]}
						placeholder="your@email.com"
						placeholderTextColor={colors.subtext}
						autoFocus
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
							placeholder="••••••••"
							placeholderTextColor={colors.subtext}
							secureTextEntry={!showPassword}
							value={password}
							onChangeText={setPassword}
							onSubmitEditing={signIn}
							onFocus={() => setFocusedField('password')}
							onBlur={() => setFocusedField(null)}
							editable={!loading}
						/>
						<TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
							<Feather
								name={showPassword ? 'eye' : 'eye-off'}
								size={18}
								color={colors.subtext}
							/>
						</TouchableOpacity>
					</View>
				</View>
			</View>

			{/* Primary CTA */}
			<TouchableOpacity
				style={[styles.primaryButton, { backgroundColor: colors.accent }, loading && styles.buttonLoading]}
				onPress={signIn}
				disabled={loading}
				activeOpacity={0.85}
			>
				<Text style={[styles.primaryButtonText, { color: isDark ? '#0D0D0D' : '#FFFFFF' }]}>
					{loading ? 'Signing in…' : 'Sign in'}
				</Text>
			</TouchableOpacity>

			{/* Secondary action */}
			<TouchableOpacity
				onPress={() => navigation.navigate('Register')}
				disabled={loading}
				style={styles.secondaryAction}
			>
				<Text style={[styles.secondaryText, { color: colors.subtext }]}>
					New here?{' '}
					<Text style={{ color: colors.accent, fontWeight: '600' }}>Create account →</Text>
				</Text>
			</TouchableOpacity>
		</KeyboardAvoidingView>
	);
};

export default LoginScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 32,
		paddingTop: 80,
		paddingBottom: 40,
	},
	logoArea: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 48,
		gap: 10,
	},
	logoImage: {
		width: 32,
		height: 32,
		borderRadius: 8,
	},
	appName: {
		fontSize: 18,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	headingArea: {
		marginBottom: 48,
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
		letterSpacing: 0.1,
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
		fontWeight: '400',
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
		fontWeight: '400',
	},
});
