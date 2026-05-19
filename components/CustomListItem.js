import React, { useState, useEffect } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ListItem, Avatar } from 'react-native-elements';
import { db, firebase } from '../firebase/firebase';
import LottieView from 'lottie-react-native';
import { AntDesign } from '@expo/vector-icons';

const CustomListItem = ({ id, chatName, enterChat, userId, image }) => {
	const [chatMessage, setChatMessage] = useState([]);

	useEffect(() => {
		const unsubscribe = db
			.collection('chat')
			.doc(id)
			.collection('messages')
			.orderBy('timestamp', 'desc')
			.onSnapshot((snapshot) => setChatMessage(snapshot.docs.map((doc) => doc.data())));

		return unsubscribe;
	}, []);

	const currentUser = firebase.auth().currentUser.uid;

	const deleteChatRoom = () => {
		Alert.alert(
			'Delete chat',
			`Are you sure you want to delete "${chatName}"? This cannot be undone.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							// Borrar todos los mensajes de la subcolección primero
							const messagesRef = db.collection('chat').doc(id).collection('messages');
							const snapshot = await messagesRef.get();
							const batch = db.batch();
							snapshot.docs.forEach((doc) => batch.delete(doc.ref));
							await batch.commit();

							// Luego borrar el documento del chat
							await db.collection('chat').doc(id).delete();
						} catch (error) {
							Alert.alert('Error', 'Could not delete the chat. Please try again.');
						}
					},
				},
			]
		);
	};

	// Truncar nombre con ellipsis si supera 20 caracteres
	const displayName =
		chatName.length > 20
			? chatName[0].toUpperCase() + chatName.slice(1, 19).toLowerCase() + '…'
			: chatName[0].toUpperCase() + chatName.slice(1).toLowerCase();

	return (
		<ListItem onPress={() => enterChat(id, chatName, image, userId)} bottomDivider>
			{chatMessage[0] ? (
				<Avatar
					rounded
					source={{ uri: chatMessage[0].photoURL }}
				/>
			) : (
				<LottieView
					style={{ height: 30 }}
					source={require('../assets/animations/21333-writer.json')}
					autoPlay
					speed={2}
				/>
			)}

			<ListItem.Content>
				<ListItem.Title
					style={{
						color: '#2c3e50',
						fontWeight: Platform.OS === 'android' ? 'bold' : '700',
					}}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{displayName}
				</ListItem.Title>
				<ListItem.Subtitle numberOfLines={1} ellipsizeMode="tail">
					{chatMessage[0] ? (
						<Text
							style={{
								fontWeight: Platform.OS === 'android' ? 'bold' : '600',
							}}
						>
							{chatMessage[0].displayName}
						</Text>
					) : null}
					{chatMessage[0] ? ': ' : 'No messages yet'}
					{chatMessage[0] ? chatMessage[0].message : null}
				</ListItem.Subtitle>
			</ListItem.Content>
			{currentUser === userId && (
				<TouchableOpacity style={styles.delete} onPress={deleteChatRoom}>
					<AntDesign name="delete" size={26} color="red" />
				</TouchableOpacity>
			)}
		</ListItem>
	);
};

export default CustomListItem;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	delete: {
		marginRight: 20,
	},
});
