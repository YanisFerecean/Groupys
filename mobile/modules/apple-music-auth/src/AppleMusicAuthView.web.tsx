import * as React from 'react';

import { AppleMusicAuthViewProps } from './AppleMusicAuth.types';

export default function AppleMusicAuthView(props: AppleMusicAuthViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
