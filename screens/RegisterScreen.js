import { StatusBar } from 'expo-status-bar';
import React, { useState, useLayoutEffect } from 'react';
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Button, Input } from 'react-native-elements';
import { firebase } from '../firebase/firebase';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const RegisterScreen = ({ navigation }) => {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [imageUrl, setImageUrl] = useState('');

	useLayoutEffect(() => {
		navigation.setOptions({
			headerBackTitle: 'Back to Login',
			headerTintColor: { color: 'white' },
		});
	}, [navigation]);

	const register = () => {
		firebase
			.auth()
			.createUserWithEmailAndPassword(email, password)
			.then((authUser) => {
				authUser.user.updateProfile({
					displayName: name,
					photoURL:
						imageUrl ||
						'https://res.cloudinary.com/dqaerysgb/image/upload/v1630358737/jooly8uzpykfvixik2vv.jpg',
				});
			})
			.catch((error) => alert(error.message));
	};

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
			setImageUrl(result.uri);
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
			setImageUrl(result.uri);
			console.log('image upload successfully');
		}
	};

	return (
		<KeyboardAvoidingView behavior="padding" style={styles.container}>
			<StatusBar style="light" />

			<Text style={styles.titleText}>Create a new account</Text>

			<View style={styles.inputContainer}>
				<Input
					placeholder="Full Name"
					autoFocus
					type="text"
					value={name}
					onChangeText={(text) => setName(text)}
				/>
				<Input
					placeholder="Email"
					type="email"
					value={email}
					onChangeText={(text) => setEmail(text)}
				/>
				<Input
					placeholder="Password"
					type="password"
					secureTextEntry
					value={password}
					onChangeText={(text) => setPassword(text)}
				/>
				<Input
					placeholder="Profile Picture URL (optional)"
					type="text"
					value={imageUrl}
					onChangeText={(text) => setImageUrl(text)}
					onSubmitEditing={register}
				/>

				{imageUrl !== '' && (
					<View style={styles.image}>
						<Image source={{ uri: imageUrl }} style={{ width: 200, height: 200 }} />
					</View>
				)}
			</View>

			<View style={styles.buttonsBroup}>
				<Button
					// raised
					icon={<Icon name="camera" size={24} color="black" />}
					styles={styles.button}
					onPress={uploadPictureWithCamera}
					// iconPosition="right"
					title="Camera"
				/>
				<Button
					raised
					styles={styles.button}
					onPress={uploadPictureFromPhone}
					icon={<Icon name="cellphone-arrow-down" size={24} color="black" />}
					title="Phone"
				/>
			</View>

			<Button raised styles={styles.button} onPress={register} title="Register" />
		</KeyboardAvoidingView>
	);
};

export default RegisterScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center', //Este es que sube y baja pa darle espacio a la foto
		padding: 10,
		backgroundColor: 'white',
	},
	image: {
		width: 200,
		height: 200,
	},
	button: {
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
		color: Platform.OS === 'android' ? '#1e3b70' : '#29539b',
	},
	buttonsBroup: {
		marginVertical: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: 200,
	},
});
