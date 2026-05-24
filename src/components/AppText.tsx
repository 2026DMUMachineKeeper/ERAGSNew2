import React from 'react';
import { Text as RNText } from 'react-native';

type Props = React.ComponentProps<typeof RNText> & { className?: string };

const AppText: React.FC<Props> = ({ className, style, children, ...rest }) => {
  return (
    <RNText
      {...rest}
      style={style}
      className={`${className ?? ''} font-suitRegular`}
    >
      {children}
    </RNText>
  );
};

export default AppText;
