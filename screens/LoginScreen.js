import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, KeyboardAvoidingView, Alert } from 'react-native';
import { Button, Input, Image } from 'react-native-elements';
import { firebase } from '../firebase/firebase';

const LoginScreen = ({ navigation }) => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

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
		try {
			await firebase.auth().signInWithEmailAndPassword(email, password);
			console.log('🥰Firebase Login Ok');
		} catch (error) {
			Alert.alert('Yooo dude', error.message + '\n\n... What would you like to do 👀', [
				{
					text: 'Ok...😘',
					onPress: () => console.log('Ok'),
					style: 'cancel',
				},
				{
					text: 'Sign Up',
					onPress: () => navigation.push('Register'),
				},
			]);
		}
	};

	return (
		<KeyboardAvoidingView behavior="padding" style={styles.container}>
			<StatusBar style="light" />
			<Image
				source={{
					uri: 'https://blog.mozilla.org/internetcitizen/files/2018/08/signal-logo.png',
				}}
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
					secureTextEntry
					type="password"
					value={password}
					onChangeText={(text) => setPassword(text)}
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
