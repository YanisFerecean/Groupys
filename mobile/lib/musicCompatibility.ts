export interface WidgetSyncLike {
  syncWithMusic?: unknown
  syncWithSpotify?: unknown
  synced?: unknown
}

export function resolveMusicConnected(
  musicConnected?: boolean,
  spotifyConnected?: boolean,
): boolean {
  return musicConnected ?? spotifyConnected ?? false
}

export function resolveMusicSync(
  syncWithMusic?: boolean,
  syncWithSpotify?: boolean,
): boolean {
  return syncWithMusic === true || syncWithSpotify === true
}

export function resolveWidgetSyncFlags(data: WidgetSyncLike): boolean {
  return data.syncWithMusic === true || data.syncWithSpotify === true || data.synced === true
}

export function buildWidgetSyncFlags(sync: boolean): {
  syncWithMusic: boolean
  syncWithSpotify: boolean
  synced: boolean
} {
  return {
    syncWithMusic: sync,
    syncWithSpotify: sync,
    synced: sync,
  }
}
