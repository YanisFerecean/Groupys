export interface ChatMessage {
  id: string
  text: string
  image?: string
  sender: 'me' | 'them'
  time: string
  date?: string
}
