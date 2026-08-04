import { Pressable, View, Text } from 'react-native';
import Icon from './Icon';

type TopAppBarProps = {
  onSensorsPress?: () => void;
};

/**
 * Shared top bar for the light-theme screens (Onboarding, Inicio, Filtros,
 * Historial, Voz). Mirrors the mockups: brand mark left, "sensors" status
 * icon right, bottom hairline border, fixed 48px (touch-target-min) height.
 */
export default function TopAppBar({ onSensorsPress }: TopAppBarProps) {
  return (
    <View className="h-touch-target-min w-full flex-row items-center justify-between border-b border-outline-variant bg-background px-margin-mobile">
      <View className="flex-row items-center gap-xs">
        <Icon name="shield-check" size={22} color="#002045" />
        <Text className="font-display text-[20px] leading-none tracking-tight text-primary">
          Prioria
        </Text>
      </View>
      <Pressable
        onPress={onSensorsPress}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-container-low"
      >
        <Icon name="access-point" size={22} color="#43474e" />
      </Pressable>
    </View>
  );
}
