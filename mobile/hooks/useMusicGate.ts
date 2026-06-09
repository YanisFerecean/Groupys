import { useCallback, useState } from 'react'

import { useMusicCapability, type MusicCapability } from '@/hooks/useMusicCapability'
import type { MusicUpsellMode } from '@/components/music/MusicUpsellSheet'

interface UpsellState {
  visible: boolean
  mode: MusicUpsellMode
  action?: string
}

export interface MusicGate {
  capability: MusicCapability
  /**
   * Gate a subscription-requiring action. Returns `'ok'` when allowed, otherwise opens the
   * upsell sheet (Connect when not linked, Subscribe when linked without a subscription) and
   * returns `'blocked'`.
   */
  requireMusic: (name: string) => 'ok' | 'blocked'
  upsell: UpsellState
  closeUpsell: () => void
}

/**
 * Capability + upsell controller (ticket 0.2). Consumers render <MusicUpsellSheet> with the
 * returned `upsell` state and call `requireMusic` before performing a gated action.
 */
export function useMusicGate(): MusicGate {
  const capability = useMusicCapability()
  const [upsell, setUpsell] = useState<UpsellState>({ visible: false, mode: 'connect' })

  const requireMusic = useCallback((name: string): 'ok' | 'blocked' => {
    if (capability.canPlayFull) {
      return 'ok'
    }
    setUpsell({
      visible: true,
      mode: capability.connected ? 'subscribe' : 'connect',
      action: name,
    })
    return 'blocked'
  }, [capability.canPlayFull, capability.connected])

  const closeUpsell = useCallback(() => {
    setUpsell(state => ({ ...state, visible: false }))
  }, [])

  return { capability, requireMusic, upsell, closeUpsell }
}
