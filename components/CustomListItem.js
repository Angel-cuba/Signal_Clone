import React, { useState, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { StyleSheet, Text } from 'react-native';
import { ListItem, Avatar } from 'react-native-elements';
import { db, firebase } from '../firebase/firebase';
import LottieView from 'lottie-react-native';
import { AntDesign } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

const CustomListItem = ({ id, chatName, enterChat, userId, image }) => {
	// console.log('CustomListItem', chatName);
	// console.log('aaaaaaaaaaaaaaa--', image);

	const [chatMessage, setChatMessage] = useState([]);
	// console.log(chatMessage[0].length);

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
	// console.log('-----------', currentUser);
	// console.log('-----checking----', db.collection('chat').doc(id));

	const deleteChatRoom = () => {
		db.collection('chat')
			.doc(id)
			.delete()
			.then(() => console.log('Deleted'))
			.catch((error) => console.error('Failed to delete:' + error));
	};

	return (
		// <>
		// 	{chatMessage[0] ? (
		<ListItem onPress={() => enterChat(id, chatName, image, userId)} key={id} bottomDivider>
			{chatMessage[0] ? (
				<Avatar
					rounded
					source={{
						uri: chatMessage[0].photoURL,
						// : 'https://res.cloudinary.com/dqaerysgb/image/upload/v1635075942/border_heart.png',
					}}
				/>
			) : (
				<LottieView
					style={{ height: 30 }}
					source={require('../assets/animations/21333-writer.json')}
					autoPlay
					speed={2}
				/>
			)}

			{/* {console.log('----', chatName)} */}
			<ListItem.Content>
				<ListItem.Title
					style={{
						textAlign: 'center',
						color: '#2c3e50',
						fontWeight: Platform.OS === 'android' ? 'bold' : '700',
					}}
				>
					{chatName[0].toUpperCase() + chatName.slice(1, 20).toLowerCase()}
				</ListItem.Title>
				<ListItem.Subtitle numberOfLines={1} ellipsizeMode="tail">
					{chatMessage[0] ? (
						<Text
							style={{
								backgroundColor: '#deebdd',
								fontWeight: Platform.OS === 'android' ? 'bold' : '600',
							}}
						>
							{chatMessage[0].displayName}
						</Text>
					) : null}
					{chatMessage[0] ? ' says: ' : ''}
					{chatMessage[0] ? chatMessage[0].message : null}
				</ListItem.Subtitle>
			</ListItem.Content>
			{currentUser === userId && (
				<TouchableOpacity style={styles.delete} onPress={deleteChatRoom}>
					<AntDesign name="delete" size={30} color="red" />
				</TouchableOpacity>
			)}
		</ListItem>
		// 	) : (
		// 		<>
		// 			<Text>No hay nada</Text>
		// 		</>
		// 	)}
		// </>
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
