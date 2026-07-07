import React, { useState } from 'react';
import {
  Pressable,
  TextInput,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type TextInputProps,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface AuthTextInputProps {
  iconName: 'email' | 'lock';
  inputProps: Pick<
    TextInputProps,
    | 'autoCapitalize'
    | 'autoCorrect'
    | 'onChangeText'
    | 'placeholder'
    | 'placeholderTextColor'
    | 'textContentType'
    | 'value'
  > & {
    keyboardType?: KeyboardTypeOptions;
    returnKeyType?: ReturnKeyTypeOptions;
  };
  isPassword?: boolean;
}

const ICON_COLOR = '#9CA3AF';

const renderInputIcon = (
  iconName: AuthTextInputProps['iconName'],
): React.JSX.Element => {
  if (iconName === 'email') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Rect
          x={3}
          y={5}
          width={18}
          height={14}
          rx={2}
          stroke={ICON_COLOR}
          strokeWidth={2}
        />
        <Path
          d="M4 7l8 6 8-6"
          stroke={ICON_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect
        x={5}
        y={10}
        width={14}
        height={10}
        rx={2}
        stroke={ICON_COLOR}
        strokeWidth={2}
      />
      <Path
        d="M8 10V8a4 4 0 018 0v2"
        stroke={ICON_COLOR}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={15} r={1.5} fill={ICON_COLOR} />
    </Svg>
  );
};

const renderEyeIcon = (): React.JSX.Element => {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
        stroke={ICON_COLOR}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={ICON_COLOR} strokeWidth={2} />
    </Svg>
  );
};

export const AuthTextInput = ({
  iconName,
  inputProps,
  isPassword = false,
}: AuthTextInputProps): React.JSX.Element => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handlePasswordVisibilityPress = (): void => {
    setIsPasswordVisible(currentIsPasswordVisible => !currentIsPasswordVisible);
  };

  return (
    <View className="relative h-16 justify-center rounded-xl border border-authInputBorder bg-white">
      <View className="absolute left-5 z-10">{renderInputIcon(iconName)}</View>
      <TextInput
        {...inputProps}
        className="h-full px-14 text-base font-suitRegular text-black"
        secureTextEntry={isPassword && !isPasswordVisible}
      />
      {isPassword ? (
        <Pressable
          className="absolute right-5 z-10 h-10 w-10 items-center justify-center"
          onPress={handlePasswordVisibilityPress}
        >
          {renderEyeIcon()}
        </Pressable>
      ) : null}
    </View>
  );
};

export default AuthTextInput;
