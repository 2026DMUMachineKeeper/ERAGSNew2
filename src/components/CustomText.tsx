import React from 'react';
import { Text, TextProps } from 'react-native';

type Weight = 'regular' | 'medium' | 'bold';

type Props = TextProps & {
  weight?: Weight;
};

const weightToFont: Record<Weight, string> = {
  regular: 'SUIT-Regular',
  medium: 'SUIT-Medium',
  bold: 'SUIT-Bold',
};

export function CustomText({ weight = 'medium', style, ...props }: Props) {
  const fontFamily = weightToFont[weight] ?? weightToFont.medium;
  return <Text {...props} style={[{ fontFamily }, style]} />;
}

export default CustomText;
