import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import AddChatScreen from './screens/AddChatScreen';
import ChatScreen from './screens/ChatScreen';

// Configure the global notification handler once at app startup.
// This ensures notifications are shown when the app is foregrounded,
// regardless of which screen is active. Placing it here (module scope, entry point)
// avoids re-registration on screen navigations or Fast Refresh reloads.
//
// expo-notifications 0.32 (SDK 54): shouldShowAlert was split into:
//   shouldShowBanner — the drop-down banner while the app is open
//   shouldShowList  — the entry in Notification Center / shade
// Both must be true to match the old shouldShowAlert: true behavior.
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

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
