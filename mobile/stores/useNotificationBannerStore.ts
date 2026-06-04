import { create } from 'zustand'

export interface BannerItem {
  id: string
  title: string
  body?: string
  imageUrl?: string
  deeplink?: string
  type?: string
}

interface NotificationBannerState {
  current: BannerItem | null
  queue: BannerItem[]
  /** Enqueue a banner. If one is already showing, it waits its turn. */
  show: (item: BannerItem) => void
  /** Dismiss the current banner and advance to the next queued one. */
  dismiss: () => void
}

export const useNotificationBannerStore = create<NotificationBannerState>((set, get) => ({
  current: null,
  queue: [],
  show: (item) => {
    if (get().current) {
      set((state) => ({ queue: [...state.queue, item] }))
    } else {
      set({ current: item })
    }
  },
  dismiss: () => {
    set((state) => {
      const [next, ...rest] = state.queue
      return { current: next ?? null, queue: rest }
    })
  },
}))
