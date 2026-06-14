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
  // Full-song playback (catalog store id = the track's appleMusicId).
  playCatalogId(storeId: string): void
  pausePlayback(): void
  resumePlayback(): void
  stopPlayback(): void
  seekTo(seconds: number): void
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AppleMusicAuthModule>('AppleMusicAuth');
