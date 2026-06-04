import { create } from 'zustand'
import type { CommunityResDto } from '@/models/CommunityRes'

export interface CreatePostDraftMedia {
  uri: string
  type?: string | null
  mimeType?: string | null
  name?: string | null
}

export interface CreatePostDraftFile {
  uri: string
  name: string
  mimeType?: string | null
  size?: number
}

export type CreatePostDraftCommunity = Pick<
  CommunityResDto,
  'id' | 'name' | 'iconType' | 'iconEmoji' | 'iconUrl' | 'description'
>

export interface CreatePostDraft {
  title: string
  content: string
  media: CreatePostDraftMedia[]
  files: CreatePostDraftFile[]
  community: CreatePostDraftCommunity | null
  updatedAt: number
}

interface CreatePostDraftState {
  draft: CreatePostDraft | null
  pendingCommunitySelection: CreatePostDraftCommunity | null
  saveDraft: (draft: CreatePostDraft) => void
  clearDraft: () => void
  setPendingCommunitySelection: (community: CreatePostDraftCommunity | null) => void
}

export const useCreatePostDraftStore = create<CreatePostDraftState>((set) => ({
  draft: null,
  pendingCommunitySelection: null,
  saveDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
  setPendingCommunitySelection: (community) => set({ pendingCommunitySelection: community }),
}))
