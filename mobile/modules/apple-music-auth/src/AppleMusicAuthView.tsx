import { requireNativeView } from 'expo';
import * as React from 'react';

import { AppleMusicAuthViewProps } from './AppleMusicAuth.types';

const NativeView: React.ComponentType<AppleMusicAuthViewProps> =
  requireNativeView('AppleMusicAuth');

export default function AppleMusicAuthView(props: AppleMusicAuthViewProps) {
  return <NativeView {...props} />;
}
