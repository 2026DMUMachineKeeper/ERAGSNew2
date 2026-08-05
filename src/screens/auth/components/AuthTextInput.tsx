import React, { useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type TextInputProps,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface AuthTextInputProps {
  errorMessage?: string;
  iconName: 'email' | 'lock' | 'phone' | 'user';
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
  if (iconName === 'user') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8} r={4} stroke={ICON_COLOR} strokeWidth={2} />
        <Path
          d="M4 21a8 8 0 0116 0"
          stroke={ICON_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

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

  if (iconName === 'phone') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M7.5 4.5l2.2 5-2 1.4c1.1 2.3 3 4.2 5.4 5.4l1.4-2 5 2.2c.4.2.6.5.5.9-.2 1.1-.7 2.1-1.5 2.8-.5.5-1.2.8-1.9.8C9.1 21 3 14.9 3 7.4c0-.7.3-1.4.8-1.9.7-.8 1.7-1.3 2.8-1.5.4-.1.7.1.9.5z"
          stroke={ICON_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
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
  errorMessage,
  iconName,
  inputProps,
  isPassword = false,
}: AuthTextInputProps): React.JSX.Element => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputContainerClassName = errorMessage
    ? 'relative h-16 justify-center rounded-xl border border-red bg-white'
    : 'relative h-16 justify-center rounded-xl border border-authInputBorder bg-white';

  const handlePasswordVisibilityPress = (): void => {
    setIsPasswordVisible(currentIsPasswordVisible => !currentIsPasswordVisible);
  };

  return (
    <View>
      <View className={inputContainerClassName}>
        <View className="absolute left-5 z-10">
          {renderInputIcon(iconName)}
        </View>
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
      {errorMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-2 text-sm font-suitMedium text-red"
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
};

export default AuthTextInput;
