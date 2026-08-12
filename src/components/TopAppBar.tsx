import { Pressable, View, Text } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';

type TopAppBarProps = {
  onSensorsPress?: () => void;
};

export default function TopAppBar({ onSensorsPress }: TopAppBarProps) {
  const { isDark } = useTheme();
  const iconColor = isDark ? '#c8c4d7' : '#43474e';
  const brandColor = isDark ? '#c6bfff' : '#002045';

  return (
    <View className="h-touch-target-min w-full flex-row items-center justify-between border-b border-outline-variant dark:border-train-outline-variant bg-background dark:bg-train-background px-margin-mobile">
      <View className="flex-row items-center gap-xs">
        <Icon name="shield-check" size={22} color={brandColor} />
        <Text className="font-display text-[20px] leading-none tracking-tight text-primary dark:text-train-primary">
          Prioria
        </Text>
      </View>
      <Pressable
        onPress={onSensorsPress}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-container-low"
      >
        <Icon name="access-point" size={22} color={iconColor} />
      </Pressable>
    </View>
  );
}
