import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SwipeTabNavigator from './SwipeTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { status } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('prioria_onboarding_done').then((val) => {
      setOnboardingDone(Boolean(val));
    });
  }, []);

  // Login is a hard prerequisite — nothing in Main/Onboarding works without
  // a session, so it's checked before the onboarding flag, not after.
  if (status === 'checking' || onboardingDone === null) {
    return <View style={{ flex: 1 }} />;
  }

  // Conditionally rendering Stack.Screen (rather than swapping the whole
  // Navigator via a `key`) is the pattern react-navigation actually expects
  // for auth flows: the library reacts to the screen list changing and
  // switches on its own. The `key` remount looked correct but silently
  // didn't propagate to react-native-screens on Android — status/onboarding
  // would update (confirmed via logging) while the visible screen didn't,
  // stranding the user on Login after a real sign-in, and on Main after
  // sign-out, until the app was force-restarted.
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === 'needsLogin' ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : onboardingDone ? (
        <Stack.Screen name="Main" component={SwipeTabNavigator} />
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      )}
    </Stack.Navigator>
  );
}
