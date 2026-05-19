import React, { useState, useEffect } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ListItem, Avatar } from '@rneui/themed';
import { auth, db } from '../firebase/firebase';
import {
	collection, doc, query, orderBy, limit, onSnapshot,
	getDocs, writeBatch, deleteDoc,
} from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import { AntDesign } from '@expo/vector-icons';
import { truncateName } from '../utils/truncateName';

const CustomListItem = ({ id, chatName, enterChat, userId, image }) => {
	const [chatMessage, setChatMessage] = useState([]);
	const { colors } = useTheme();

	useEffect(() => {
		const messagesRef = collection(db, 'chat', id, 'messages');
		// limit(1): solo necesitamos el último mensaje para el preview — reduce lecturas de Firestore
		const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
		const unsubscribe = onSnapshot(q, (snapshot) =>
			setChatMessage(snapshot.docs.map((doc) => doc.data()))
		);
		return unsubscribe;
	}, [id]);

	// Null-safe: currentUser puede ser null durante la transición de auth al arrancar en frío
	const currentUser = auth.currentUser?.uid ?? null;

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
							// Firestore limita a 500 escrituras por batch — chunkeamos para chats grandes
							const BATCH_SIZE = 499;
							const messagesRef = collection(db, 'chat', id, 'messages');
							const snapshot = await getDocs(messagesRef);

							for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
								const batch = writeBatch(db);
								snapshot.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
								await batch.commit();
							}

							await deleteDoc(doc(db, 'chat', id));
						} catch (error) {
							Alert.alert('Error', 'Could not delete the chat. Please try again.');
						}
					},
				},
			]
		);
	};

	const displayName = truncateName(chatName);

	return (
		<ListItem
			onPress={() => enterChat(id, chatName, image, userId)}
			bottomDivider
			containerStyle={{ backgroundColor: colors.background }}
		>
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
						color: colors.text,
						fontWeight: Platform.OS === 'android' ? 'bold' : '700',
					}}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{displayName}
				</ListItem.Title>
				<ListItem.Subtitle
					style={{ color: colors.subtext }}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{chatMessage[0] ? (
						<Text
							style={{
								fontWeight: Platform.OS === 'android' ? 'bold' : '600',
								color: colors.subtext,
							}}
						>
							{chatMessage[0].displayName}
						</Text>
					) : null}
					{chatMessage[0] ? ': ' : 'No messages yet'}
					{chatMessage[0] ? chatMessage[0].message : null}
				</ListItem.Subtitle>
			</ListItem.Content>
			{currentUser && currentUser === userId && (
				<TouchableOpacity style={styles.delete} onPress={deleteChatRoom}>
					<AntDesign name="delete" size={26} color="red" />
				</TouchableOpacity>
			)}
		</ListItem>
	);
};

export default CustomListItem;

const styles = StyleSheet.create({
	delete: {
		marginRight: 20,
	},
});
