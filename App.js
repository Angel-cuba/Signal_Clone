import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';

// Configure the global notification handler once at app startup.
// This ensures notifications are shown as alerts even when the app is foregrounded,
// regardless of which screen is active. Placing it here (module scope, entry point)
// avoids re-registration on screen navigations or Fast Refresh reloads.
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import AddChatScreen from './screens/AddChatScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createNativeStackNavigator();

const globalScreenOptions = {
	headerStyle: { backgroundColor: '#2C6BED' },
	headerTitleStyle: { color: '#f5f7fa' },
	headerTintColor: '#deebdd',
};

export default function App() {
	return (
		<NavigationContainer>
			<Stack.Navigator screenOptions={globalScreenOptions}>
				<Stack.Screen
					options={{
						title: 'Login',
						headerTitleAlign: 'center',
					}}
					name="Login"
					component={LoginScreen}
				/>
				<Stack.Screen name="Register" component={RegisterScreen} />
				<Stack.Screen name="Home" component={HomeScreen} />
				<Stack.Screen name="AddChat" component={AddChatScreen} />
				<Stack.Screen name="Chat" component={ChatScreen} />
			</Stack.Navigator>
		</NavigationContainer>
	);
}
