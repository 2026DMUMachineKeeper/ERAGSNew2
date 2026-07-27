import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type SettingsIconName =
  | 'check'
  | 'chevron'
  | 'close'
  | 'edit'
  | 'lock'
  | 'logout'
  | 'phone'
  | 'user';

interface SettingsIconProps {
  color: string;
  name: SettingsIconName;
  size?: number;
}

export const SettingsIcon = ({
  color,
  name,
  size = 22,
}: SettingsIconProps): React.JSX.Element => {
  if (name === 'user') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8} r={3.6} stroke={color} strokeWidth={2} />
        <Path
          d="M5 20C5.7 16.6 8.2 14.6 12 14.6C15.8 14.6 18.3 16.6 19 20"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  if (name === 'phone') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M7.4 4.6L9.5 9.3L7.8 10.7C8.9 13 10.9 15 13.3 16.2L14.7 14.5L19.4 16.6C19.8 16.8 20 17.2 19.9 17.6C19.7 18.8 19.1 19.7 18.3 20.4C17.8 20.8 17.2 21 16.6 21C9.1 21 3 14.9 3 7.4C3 6.8 3.2 6.2 3.6 5.7C4.3 4.9 5.2 4.3 6.4 4.1C6.8 4 7.2 4.2 7.4 4.6Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  if (name === 'edit') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 18.8L5.8 15.2L15.9 5.1C17 4 18.7 4 19.8 5.1C20.9 6.2 20.9 7.9 19.8 9L9.7 19.1L6.1 19.9C5.4 20 4.9 19.5 5 18.8Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
        <Path
          d="M14.4 6.6L18.3 10.5"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  if (name === 'check') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12.5L9.3 17L19 7"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.4}
        />
      </Svg>
    );
  }

  if (name === 'close') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M7 7L17 17M17 7L7 17"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={2.2}
        />
      </Svg>
    );
  }

  if (name === 'lock') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
          height={10}
          rx={2.2}
          stroke={color}
          strokeWidth={2}
          width={14}
          x={5}
          y={10}
        />
        <Path
          d="M8.4 10V8.1C8.4 6 10 4.4 12 4.4C14 4.4 15.6 6 15.6 8.1V10"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  if (name === 'logout') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M10 5H6.8C5.8 5 5 5.8 5 6.8V17.2C5 18.2 5.8 19 6.8 19H10"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={2}
        />
        <Path
          d="M14 8L18 12L14 16M18 12H9"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6L15 12L9 18"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
};

export default SettingsIcon;
