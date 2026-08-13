import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import OnboardingScreen from '../screens/OnboardingScreen';
import SwipeTabNavigator from './SwipeTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('prioria_onboarding_done').then((val) => {
      setInitialRoute(val ? 'Main' : 'Onboarding');
    });
  }, []);

  if (!initialRoute) return <View style={{ flex: 1 }} />;

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Main" component={SwipeTabNavigator} />
    </Stack.Navigator>
  );
}
