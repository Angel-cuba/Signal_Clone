import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Alert, TouchableOpacity } from 'react-native';
import { Button, Input, Image } from 'react-native-elements';
import { firebase } from '../firebase/firebase';
import { AntDesign, Feather } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);

	useEffect(() => {
		const unsubscribe = firebase.auth().onAuthStateChanged((authUser) => {
			// console.log(authUser);
			if (authUser) {
				navigation.replace('Home');
			}
		});
		return unsubscribe;
	}, []);

	const SignIn = async () => {
		if (!email.trim() || !password) {
			return Alert.alert('Missing fields', 'Please enter your email and password.');
		}
		try {
			await firebase.auth().signInWithEmailAndPassword(email.trim(), password);
		} catch (error) {
			Alert.alert('Sign in failed', error.message, [
				{ text: 'OK', style: 'cancel' },
				{ text: 'Create account', onPress: () => navigation.push('Register') },
			]);
		}
	};

	return (
		<KeyboardAvoidingView behavior="padding" style={styles.container}>
			<StatusBar style="light" />
			<Image
				source={require('../assets/icon.png')}
				style={{ width: 200, height: 200 }}
			/>
			<View style={styles.InputContainer}>
				<Input
					placeholder="Email"
					autoFocus
					type="email"
					value={email}
					onChangeText={(text) => setEmail(text)}
				/>
				<Input
					placeholder="Password"
					secureTextEntry={!showPassword}
					type="password"
					value={password}
					onChangeText={(text) => setPassword(text)}
					rightIcon={
						<TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
							{showPassword ? (
								<AntDesign name="eye" size={24} color="black" />
							) : (
								<Feather name="eye-off" size={24} color="black" />
							)}
						</TouchableOpacity>
					}
				/>
			</View>
			<Button containerStyle={styles.button} onPress={SignIn} title="Login" />
			<Button
				onPress={() => navigation.navigate('Register')}
				containerStyle={styles.button}
				type="outline"
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
	InputContainer: {
		width: 300,
	},
	button: {
		width: 200,
		marginTop: 10,
	},
});
