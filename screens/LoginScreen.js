import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Alert, TouchableOpacity } from 'react-native';
import { Button, Input, Image } from '@rneui/themed';
import { auth } from '../firebase/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

const LoginScreen = ({ navigation }) => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const { colors, isDark } = useTheme();
	// Guard: prevents setLoading(false) from firing after navigation unmounts this screen
	const isMountedRef = useRef(true);
	useEffect(() => () => { isMountedRef.current = false; }, []);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (authUser) => {
			if (authUser) navigation.replace('Home');
		});
		return unsubscribe;
	}, []);

	const signIn = async () => {
		if (!email.trim() || !password) {
			return Alert.alert('Missing fields', 'Please enter your email and password.');
		}
		setLoading(true);
		try {
			await signInWithEmailAndPassword(auth, email.trim(), password);
			// onAuthStateChanged handles navigation
		} catch (error) {
			Alert.alert('Sign in failed', error.message, [
				{ text: 'OK', style: 'cancel' },
				{ text: 'Create account', onPress: () => navigation.push('Register') },
			]);
		} finally {
			if (isMountedRef.current) setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior="padding"
			style={[styles.container, { backgroundColor: colors.background }]}
		>
			<StatusBar style={isDark ? 'light' : 'dark'} />
			<Image
				source={require('../assets/icon.png')}
				style={{ width: 200, height: 200 }}
			/>
			<View style={styles.inputContainer}>
				<Input
					placeholder="Email"
					autoFocus
					autoCapitalize="none"
					keyboardType="email-address"
					value={email}
					onChangeText={setEmail}
					disabled={loading}
				/>
				<Input
					placeholder="Password"
					secureTextEntry={!showPassword}
					type="password"
					value={password}
					onChangeText={setPassword}
					onSubmitEditing={signIn}
					disabled={loading}
					rightIcon={
						<TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
							{showPassword ? (
								<AntDesign name="eye" size={24} color={colors.subtext} />
							) : (
								<Feather name="eye-off" size={24} color={colors.subtext} />
							)}
						</TouchableOpacity>
					}
				/>
			</View>
			<Button
				containerStyle={styles.button}
				onPress={signIn}
				disabled={loading}
				title={loading ? 'Logging in…' : 'Login'}
			/>
			<Button
				onPress={() => navigation.navigate('Register')}
				containerStyle={styles.button}
				type="outline"
				disabled={loading}
				title="Register"
			/>
		</KeyboardAvoidingView>
	);
};

export default LoginScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 10,
	},
	inputContainer: {
		width: 300,
	},
	button: {
		width: 200,
		marginTop: 10,
	},
});
