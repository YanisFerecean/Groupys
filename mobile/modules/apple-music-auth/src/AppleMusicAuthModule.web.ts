import { registerWebModule, NativeModule } from 'expo';

import type {
  AppleMusicAuthModuleEvents,
  AuthorizationStatus,
  CapabilityStatus,
} from './AppleMusicAuth.types';

class AppleMusicAuthModule extends NativeModule<AppleMusicAuthModuleEvents> {
  async requestAuthorization(): Promise<AuthorizationStatus> {
    throw new Error('Apple Music authorization is only available in iOS development builds.')
  }

  async getMusicUserToken(_developerToken: string): Promise<string> {
    throw new Error('Apple Music user token retrieval is only available in iOS development builds.')
  }

  async getCapabilityStatus(): Promise<CapabilityStatus> {
    return {
      musicCatalogPlayback: false,
      addToCloudMusicLibrary: false,
    }
  }
}

export default registerWebModule(AppleMusicAuthModule, 'AppleMusicAuthModule')
