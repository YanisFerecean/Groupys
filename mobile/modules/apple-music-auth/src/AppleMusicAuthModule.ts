import { NativeModule, requireNativeModule } from 'expo';

import type {
  AppleMusicAuthModuleEvents,
  AuthorizationStatus,
  CapabilityStatus,
} from './AppleMusicAuth.types';

declare class AppleMusicAuthModule extends NativeModule<AppleMusicAuthModuleEvents> {
  requestAuthorization(): Promise<AuthorizationStatus>
  getMusicUserToken(developerToken: string): Promise<string>
  getCapabilityStatus(): Promise<CapabilityStatus>
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AppleMusicAuthModule>('AppleMusicAuth');
