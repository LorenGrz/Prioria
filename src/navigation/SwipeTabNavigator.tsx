import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Keyboard, Pressable, View } from 'react-native';
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
const TAB_BAR_HEIGHT = 60;
// Fills the whole rectangle each tab owns, with a small gutter between tabs
const PILL_WIDTH = TAB_WIDTH - 12;
const PILL_HEIGHT = TAB_BAR_HEIGHT - 10;

export default function SwipeTabNavigator() {
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Native-driven scroll progress: PagerView feeds these directly for BOTH
  // swipes and tap-triggered setPage() calls (setPage animates through the
  // same native scroll, it isn't a separate transition). The indicator is
  // therefore always reading the real, current scroll position — there's no
  // second animation to fall out of sync with it.
  const positionAnim = useRef(new Animated.Value(0)).current;
  const offsetAnim = useRef(new Animated.Value(0)).current;
  const scrollAnim = useRef(Animated.add(positionAnim, offsetAnim)).current;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const goTo = (index: number) => {
    // Always the native scroll-through, adjacent or a multi-tab skip alike —
    // the indicator and the actual view transition are driven by the exact
    // same event stream, so they move together on a real device. This looked
    // slow/janky in the software-rendered emulator (no GPU accel), but that's
    // an emulator rendering limitation, not this code — a real phone drives
    // PagerView's native scroll at full speed.
    // Not setting activeIndex here on purpose: the icon glyph/color swap should
    // land exactly when the sliding block actually arrives (onPageSelected,
    // driven by the same native scroll as the block). Flipping it immediately
    // on tap made the icon change shape/color well before the block reached
    // it, which read as two separate, disconnected changes.
    pagerRef.current?.setPage(index);
  };

  const barBg       = isDark ? '#0e1416' : '#faf8ff';
  const iconColor   = isDark ? '#c8c4d7' : '#6b7280';
  const pillBg      = isDark ? '#6c5ce7' : '#1a365d';
  const pillText    = isDark ? '#faf6ff' : '#e8eef9';
  const navBg       = isDark ? '#0e1416' : '#faf8ff';

  // Pill slides to center of each tab
  const pillTranslateX = scrollAnim.interpolate({
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
        onPageScroll={Animated.event(
          // react-native-pager-view invokes this prop as a plain JS callback
          // (see its PagerView.tsx) rather than wiring it through the native
          // events system, so useNativeDriver here throws "Object is not a
          // function" — it needs the JS-side event mapping.
          [{ nativeEvent: { position: positionAnim, offset: offsetAnim } }],
          { useNativeDriver: false },
        )}
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
        backgroundColor: barBg,
        paddingBottom: insets.bottom || 8,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 12,
      }}>
        {/* Animated sliding block — fills each tab's rectangle, follows the swipe */}
        <Animated.View
          style={{
            position: 'absolute',
            top: pillTop,
            left: 0,
            width: PILL_WIDTH,
            height: PILL_HEIGHT,
            borderRadius: 18,
            backgroundColor: pillBg,
            transform: [{ translateX: pillTranslateX }],
          }}
        />

        {/* Tab buttons */}
        <View style={{ flexDirection: 'row', height: TAB_BAR_HEIGHT }}>
          {TABS.map((tab, i) => {
            const focused = activeIndex === i;
            // Grows as the sliding block approaches this tab, shrinks back as it leaves —
            // driven by the same value as the block, so both animate in lockstep.
            const scale = scrollAnim.interpolate({
              inputRange: [i - 1, i, i + 1],
              outputRange: [1, 1.15, 1],
              extrapolate: 'clamp',
            });
            return (
              <Pressable
                key={tab.label}
                onPress={() => goTo(i)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                hitSlop={4}
              >
                <Animated.View style={{ transform: [{ scale }] }}>
                  <Icon
                    name={focused ? tab.iconFocused : tab.icon}
                    size={24}
                    color={focused ? pillText : iconColor}
                  />
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
