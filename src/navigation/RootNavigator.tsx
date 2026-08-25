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

  const initialRoute = status === 'needsLogin' ? 'Login' : onboardingDone ? 'Main' : 'Onboarding';

  return (
    <Stack.Navigator key={initialRoute} initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Main" component={SwipeTabNavigator} />
    </Stack.Navigator>
  );
}
