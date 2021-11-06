import React, { useLayoutEffect, useState, useEffect } from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	Platform,
	Dimensions,
} from 'react-native';
import { Avatar, ListItem } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomListItem from '../components/CustomListItem';
import { firebase, db } from '../firebase/firebase';
import LottieView from 'lottie-react-native';

const HomeScreen = ({ navigation }) => {
	const [chats, setChats] = useState([]);
	const [loading, setLoading] = useState(false);
	// console.log(chats.length);
	// console.log('chats from Homescreen', chats);
	// console.log('images', chats.data.image);

	const signOutUser = () => {
		firebase
			.auth()
			.signOut()
			.then(() => navigation.replace('Login'));
	};

	useEffect(() => {
		setLoading(true);
		const unsubscribe = db.collection('chat').onSnapshot((snapshot) =>
			setChats(
				snapshot.docs.map((doc) => ({
					id: doc.id,
					data: doc.data(),
				}))
			)
		);
		if (chats) {
			setTimeout(() => {
				setLoading(false);
			}, 2000);
		}
		return unsubscribe;
	}, []);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: 'Chats',
			headerTitleAlign: 'center',
			headerStyle: { backgroundColor: '#2C6BED' },
			headerTitleStyle: {
				color: '#dee',
				fontWeight: Platform.OS === 'android' ? 'bold' : '800',
				fontSize: 20,
			},
			headerTintColor: 'black',
			headerLeft: () => (
				<View style={{ marginLeft: 5 }}>
					<TouchableOpacity
						onPress={signOutUser}
						activeOpacity={0.5}
						style={{ flexDirection: 'row', alignItems: 'center' }}
					>
						<Avatar rounded source={{ uri: firebase.auth().currentUser.photoURL }} />
						<Text
							style={{ fontWeight: Platform.OS === 'android' ? 'bold' : '800', color: '#83eaf1' }}
						>
							{firebase.auth().currentUser.displayName}
						</Text>
					</TouchableOpacity>
				</View>
			),
			headerRight: () => (
				<View
					style={{
						marginRight: Platform.isPad ? 50 : 10,
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
						...Platform.select({
							web: { marginRight: 50 },
						}),
					}}
				>
					<Text
						style={{
							fontWeight: Platform.OS === 'android' ? 'bold' : '700',
							color: '#000',
							position: 'absolute',
							left: -14,
							bottom: Platform.isPad ? 24 : 16,
							fontWeight: Platform.OS === 'android' ? 'bold' : '800',
						}}
					>
						New
					</Text>

					<TouchableOpacity onPress={() => navigation.navigate('AddChat')} activeOpacity={0.5}>
						<LottieView
							style={{ height: Platform.isPad ? 60 : 50 }}
							source={require('../assets/animations/8026-taking-notes.json')}
							autoPlay
							speed={0.5}
						/>
					</TouchableOpacity>
					<Text
						style={{
							fontWeight: Platform.OS === 'android' ? 'bold' : '700',
							color: '#000',
							position: 'absolute',
							right: -14,
							bottom: Platform.isPad ? 24 : 16,
							fontWeight: Platform.OS === 'android' ? 'bold' : '800',
						}}
					>
						chat
					</Text>
				</View>
			),
		});
	}, [navigation]);

	const enterChat = (id, chatName, image, userId) => {
		navigation.navigate('Chat', {
			id,
			chatName,
			image,
			userId,
		});
	};
	const LoadingView = ({ id }) => (
		<ListItem key={id} style={{ backgroundColor: '#deebdd' }}>
			<LottieView
				source={require('../assets/animations/9329-loading.json')}
				style={{ height: 100 }}
				autoPlay={true}
				loop={true}
				speed={2}
			/>
		</ListItem>
	);

	return (
		<SafeAreaView>
			<ScrollView style={styles.scrollContainer}>
				{chats.map(({ id, data: { chatName, image, userId } }) => (
					<View key={id}>
						{loading ? (
							<LoadingView key={id} id={id} />
						) : (
							<CustomListItem
								key={id}
								id={id}
								chatName={chatName}
								image={image}
								userId={userId}
								enterChat={enterChat}
							/>
						)}
					</View>
				))}
			</ScrollView>

			<View style={styles.animation}>
				<LottieView
					style={{ height: chats.length > 7 ? 100 : 200 }}
					source={require('../assets/animations/21333-writer.json')}
					autoPlay
					speed={2}
				/>
			</View>
		</SafeAreaView>
	);
};

export default HomeScreen;

const styles = StyleSheet.create({
	scrollContainer: {
		height: '100%',
		width: Dimensions.get('window').width,
		// backgroundColor: 'blue',
	},
	animation: {
		position: 'absolute',
		bottom: 10,
		left: 10,
	},
});
