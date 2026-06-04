export interface HotTakePick {
  answer: string
  imageUrl: string | null
  musicType: string | null
  preview?: string | null
}

export function answerTypeNoun(answerType: string): string {
  switch (answerType.toUpperCase()) {
    case 'ARTIST':
      return 'artist'
    case 'ALBUM':
      return 'album'
    case 'SONG':
      return 'song'
    case 'USER':
      return 'user'
    case 'COMMUNITY':
      return 'community'
    default:
      return 'answer'
  }
}

export function isUserType(musicType: string | null | undefined): boolean {
  return musicType?.toUpperCase() === 'USER'
}
