import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { useTheme } from '../context/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import FiltersScreen from '../screens/FiltersScreen';
import TrainScreen from '../screens/TrainScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AjustesScreen from '../screens/AjustesScreen';

const TABS = [
  { label: 'Inicio',    icon: 'home-variant-outline' as const, iconFocused: 'home-variant' as const },
  { label: 'Filtros',   icon: 'tune-variant' as const,         iconFocused: 'tune' as const },
  { label: 'Chat',      icon: 'forum-outline' as const,        iconFocused: 'forum' as const },
  { label: 'Log',       icon: 'history' as const,              iconFocused: 'history' as const },
  { label: 'Ajustes',   icon: 'cog-outline' as const,          iconFocused: 'cog' as const },
] as const;

const SCREENS = [HomeScreen, FiltersScreen, TrainScreen, HistoryScreen, AjustesScreen];

export default function SwipeTabNavigator() {
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const goTo = (index: number) => {
    pagerRef.current?.setPage(index);
    setActiveIndex(index);
  };

  const barBg      = isDark ? '#0e1416' : '#faf8ff';
  const borderColor = isDark ? '#474554' : '#c4c6cf';
  const iconColor   = isDark ? '#c8c4d7' : '#43474e';
  const pillBg      = isDark ? '#6c5ce7' : '#1a365d';
  const pillText    = isDark ? '#faf6ff' : '#86a0cd';

  return (
    <View style={{ flex: 1 }}>
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        scrollEnabled={!keyboardOpen}
        onPageSelected={(e) => setActiveIndex(e.nativeEvent.position)}
        overdrag
      >
        {SCREENS.map((Screen, i) => (
          <View key={i} style={{ flex: 1 }}>
            <Screen />
          </View>
        ))}
      </PagerView>

      {/* Tab bar */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: barBg,
        borderTopWidth: 1,
        borderTopColor: borderColor,
        paddingBottom: insets.bottom || 8,
        paddingTop: 8,
        height: 64 + (insets.bottom || 0),
      }}>
        {TABS.map((tab, i) => {
          const focused = activeIndex === i;
          return (
            <Pressable
              key={tab.label}
              onPress={() => goTo(i)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              hitSlop={8}
            >
              {focused ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: pillBg, borderRadius: 999,
                  paddingHorizontal: 10, paddingVertical: 5,
                  maxWidth: '95%',
                }}>
                  <Icon name={tab.iconFocused} size={18} color={pillText} />
                  <Text
                    numberOfLines={1}
                    style={{ color: pillText, fontSize: 12, fontWeight: '700', flexShrink: 1 }}
                  >
                    {tab.label}
                  </Text>
                </View>
              ) : (
                <Icon name={tab.icon} size={24} color={iconColor} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
