import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type MCIName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type IconProps = {
  name: MCIName;
  size?: number;
  color?: string;
  className?: string;
};

/**
 * Thin wrapper around MaterialCommunityIcons so screens can request icons
 * by the same semantic role the mockups used (data-icon), just mapped to
 * the closest MCI glyph. Centralizing the mapping here means we only have
 * one place to fix a glyph if it ever looks wrong on device.
 */
export default function Icon({ name, size = 24, color = '#131b2e', className }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} className={className} />;
}
