import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ListItem, Avatar } from 'react-native-elements';
import { db } from '../firebase/firebase';

const CustomListItem = ({ id, chatName, enterChat }) => {
	const [chatMessage, setChatMessage] = useState([]);
	// console.log(chatMessage[0]);

	useEffect(() => {
		const unsubscribe = db
			.collection('chat')
			.doc(id)
			.collection('messages')
			.orderBy('timestamp', 'desc')
			.onSnapshot((snapshot) => setChatMessage(snapshot.docs.map((doc) => doc.data())));

		return unsubscribe;
	}, []);

	// console.log(id);
	return (
		<ListItem onPress={() => enterChat(id, chatName)} key={id} bottomDivider>
			<Avatar
				rounded
				source={{
					uri: chatMessage[0]
						? chatMessage[0].photoURL
						: 'https://cencup.com/wp-content/uploads/2019/07/avatar-placeholder.png',
				}}
			/>
			<ListItem.Content>
				<ListItem.Title style={{ textAlign: 'center', fontWeight: '900' }}>
					{chatName}
				</ListItem.Title>
				<ListItem.Subtitle numberOfLines={1} ellipsizeMode="tail">
					{chatMessage[0] ? (
						<Text style={{ backgroundColor: '#deebdd', fontWeight: '600' }}>
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

const styles = StyleSheet.create({});
