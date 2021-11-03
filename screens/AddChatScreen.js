import React, { useLayoutEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import { Icon, Input } from 'react-native-elements';
import { db } from '../firebase/firebase';

const AddChatScreen = ({ navigation }) => {
	const [input, setInput] = useState('');

	const createChat = async () => {
		await db
			.collection('chat')
			.add({
				chatName: input,
			})
			.then(() => {
				navigation.goBack();
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

	return (
		<View>
			<Input
				placeholder="Enter a new chat"
				value={input}
				onChangeText={(text) => setInput(text)}
				onSubmitEditing={createChat}
				leftIcon={<Icon name="wechat" type="antdesign" size={24} color="black" />}
			/>
			<Button onPress={createChat} disabled={!input} title="Create a new chat" />
		</View>
	);
};

export default AddChatScreen;

const styles = StyleSheet.create({});
