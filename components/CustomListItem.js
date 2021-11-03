import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { StyleSheet, Text } from 'react-native';
import { ListItem, Avatar } from 'react-native-elements';
import { db } from '../firebase/firebase';

const CustomListItem = ({ id, chatName, enterChat }) => {
	const [chatMessage, setChatMessage] = useState([]);
	// console.log(chatMessage);

	useEffect(() => {
		const unsubscribe = db
			.collection('chat')
			.doc(id)
			.collection('messages')
			.orderBy('timestamp', 'desc')
			.onSnapshot((snapshot) => setChatMessage(snapshot.docs.map((doc) => doc.data())));

		return unsubscribe;
	}, []);

	return (
		<ListItem onPress={() => enterChat(id, chatName)} key={id} bottomDivider>
			<Avatar
				rounded
				source={{
					uri: chatMessage[0]
						? chatMessage[0].photoURL
						: 'https://res.cloudinary.com/dqaerysgb/image/upload/v1635075942/border_heart.png',
				}}
			/>
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
		</ListItem>
	);
};

export default CustomListItem;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
