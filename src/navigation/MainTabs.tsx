import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import type { MainTabParamList } from '../types/navigation';
import Icon, { type IconProps } from '../components/Icon';
import HomeScreen from '../screens/HomeScreen';
import FiltersScreen from '../screens/FiltersScreen';
import TrainScreen from '../screens/TrainScreen';
import HistoryScreen from '../screens/HistoryScreen';
import VoiceScreen from '../screens/VoiceScreen';
import TestScreen from '../screens/TestScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, IconProps['name']> = {
  Inicio: 'home-variant-outline',
  Filtros: 'tune',
  Entrenar: 'forum-outline',
  Historial: 'history',
  Voz: 'microphone-outline',
  Prueba: 'bell-cog-outline',
};

function TabIcon({ focused, routeName }: { focused: boolean; routeName: keyof MainTabParamList }) {
  const iconName = TAB_ICONS[routeName];
  return (
    <View
      className={`flex-row items-center gap-1 rounded-full px-4 py-1 ${focused ? 'bg-primary-container' : ''}`}
    >
      <Icon name={iconName} size={22} color={focused ? '#86a0cd' : '#43474e'} />
      <Text
        className={`font-label-md ${focused ? 'text-on-primary-container' : 'text-on-surface-variant'}`}
      >
        {routeName}
      </Text>
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#86a0cd',
        tabBarInactiveTintColor: '#43474e',
        tabBarStyle: {
          backgroundColor: '#faf8ff',
          borderTopColor: '#c4c6cf',
          borderTopWidth: 1,
          height: 64,
          paddingTop: 8,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon focused={focused} routeName={route.name as keyof MainTabParamList} />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Filtros" component={FiltersScreen} />
      <Tab.Screen name="Entrenar" component={TrainScreen} />
      <Tab.Screen name="Historial" component={HistoryScreen} />
      <Tab.Screen name="Voz" component={VoiceScreen} />
      <Tab.Screen name="Prueba" component={TestScreen} />
    </Tab.Navigator>
  );
}
