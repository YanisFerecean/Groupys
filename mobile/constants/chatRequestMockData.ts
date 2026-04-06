import type { Conversation } from '@/models/Chat'

const MOCK_REQUEST_NAMES = [
  'Aria Lane',
  'Noel Vale',
  'Mika Storm',
  'Theo Blaze',
  'Lina Moon',
  'Kai Frost',
  'Rhea Sun',
  'Milo North',
]

export function buildMockRequestConversations(count: number = 8): Conversation[] {
  const now = Date.now()

  return Array.from({ length: count }, (_, index) => {
    const minutesAgo = index * 17 + 4
    const timestamp = new Date(now - minutesAgo * 60 * 1000).toISOString()
    const name = MOCK_REQUEST_NAMES[index % MOCK_REQUEST_NAMES.length]
    const username = `mock_request_user_${index + 1}`
    const isIncoming = index % 3 !== 0

    return {
      id: `mock-request-${index + 1}`,
      isGroup: false,
      groupName: null,
      participants: [
        {
          userId: `mock-request-user-id-${index + 1}`,
          username,
          displayName: name,
          profileImage: `https://picsum.photos/seed/dm-request-${index + 1}/160/160`,
          lastReadAt: null,
          lastSeenAt: timestamp,
        },
      ],
      requestStatus: isIncoming ? 'PENDING_INCOMING' : 'PENDING_OUTGOING',
      lastMessage: null,
      lastMessageAt: timestamp,
      unreadCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  })
}
