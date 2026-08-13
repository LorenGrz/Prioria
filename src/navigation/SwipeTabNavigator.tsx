import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Keyboard, Pressable, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import TopAppBar from '../components/TopAppBar';
import { useTheme } from '../context/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import FiltersScreen from '../screens/FiltersScreen';
import TrainScreen from '../screens/TrainScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AjustesScreen from '../screens/AjustesScreen';

const TABS = [
  { label: 'Inicio',   icon: 'home-variant-outline' as const, iconFocused: 'home-variant' as const },
  { label: 'Filtros',  icon: 'tune-variant' as const,         iconFocused: 'tune' as const },
  { label: 'Chat',     icon: 'forum-outline' as const,        iconFocused: 'forum' as const },
  { label: 'Log',      icon: 'history' as const,              iconFocused: 'history' as const },
  { label: 'Ajustes',  icon: 'cog-outline' as const,          iconFocused: 'cog' as const },
] as const;

const SCREENS = [HomeScreen, FiltersScreen, TrainScreen, HistoryScreen, AjustesScreen];

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_WIDTH = SCREEN_WIDTH / TABS.length;
// Pill wide enough for icon + longest label ("Ajustes" ~42px + icon 18px + gap 5px + h-pad 20px)
const PILL_WIDTH = Math.min(Math.round(TAB_WIDTH * 0.90), 88);
const PILL_HEIGHT = 36;
const TAB_BAR_HEIGHT = 60;

export default function SwipeTabNavigator() {
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const tappedRef = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const animateIndicator = (index: number) => {
    Animated.spring(indicatorAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  };

  const goTo = (index: number) => {
    tappedRef.current = true;
    pagerRef.current?.setPage(index);
    setActiveIndex(index);
    animateIndicator(index);
  };

  const barBg       = isDark ? '#0e1416' : '#faf8ff';
  const borderColor = isDark ? '#474554' : '#c4c6cf';
  const iconColor   = isDark ? '#c8c4d7' : '#6b7280';
  const pillBg      = isDark ? '#6c5ce7' : '#1a365d';
  const pillText    = isDark ? '#faf6ff' : '#e8eef9';
  const navBg       = isDark ? '#0e1416' : '#faf8ff';

  // Pill slides to center of each tab
  const pillTranslateX = indicatorAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => i * TAB_WIDTH + (TAB_WIDTH - PILL_WIDTH) / 2),
  });

  // Pill vertical center: (TAB_BAR_HEIGHT - PILL_HEIGHT) / 2
  const pillTop = (TAB_BAR_HEIGHT - PILL_HEIGHT) / 2;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: navBg }}>
      <TopAppBar />
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        scrollEnabled={!keyboardOpen}
        onPageSelected={(e) => {
          const idx = e.nativeEvent.position;
          setActiveIndex(idx);
          if (tappedRef.current) {
            tappedRef.current = false;
          } else {
            animateIndicator(idx);
          }
        }}
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
        backgroundColor: barBg,
        borderTopWidth: 1,
        borderTopColor: borderColor,
        paddingBottom: insets.bottom || 8,
      }}>
        {/* Animated sliding pill — sits behind the tab buttons */}
        <Animated.View
          style={{
            position: 'absolute',
            top: pillTop,
            left: 0,
            width: PILL_WIDTH,
            height: PILL_HEIGHT,
            borderRadius: 999,
            backgroundColor: pillBg,
            transform: [{ translateX: pillTranslateX }],
          }}
        />

        {/* Tab buttons */}
        <View style={{ flexDirection: 'row', height: TAB_BAR_HEIGHT }}>
          {TABS.map((tab, i) => {
            const focused = activeIndex === i;
            return (
              <Pressable
                key={tab.label}
                onPress={() => goTo(i)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                hitSlop={4}
              >
                {focused ? (
                  // Active: icon (smaller) + label side by side inside pill area
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon name={tab.iconFocused} size={18} color={pillText} />
                    <Text style={{
                      color: pillText,
                      fontSize: 12,
                      fontWeight: '700',
                      letterSpacing: 0.2,
                    }}>
                      {tab.label}
                    </Text>
                  </View>
                ) : (
                  // Inactive: larger icon, no pill
                  <Icon name={tab.icon} size={24} color={iconColor} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
