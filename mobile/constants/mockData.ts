import type { Post } from '@/models/Post'
import type { Artist } from '@/models/Artist'
import type { CuratorProfile } from '@/models/CuratorProfile'
import type { MatchProfile } from '@/models/MatchProfile'
import type { UserProfile } from '@/models/UserProfile'
import type { AlbumOfWeek } from '@/models/AlbumOfWeek'
import type { Genre } from '@/models/Genre'
import type { Community } from '@/models/Community'
import type { ChatMessage } from '@/models/ChatMessage'
import type { ListeningMetric } from '@/models/ListeningMetric'
import type { DiscoverUser } from '@/models/DiscoverUser'

// Feed
export const featuredPost: Post = {
  id: '1',
  title: 'Midnight City Pulse',
  image: 'https://picsum.photos/seed/featured/800/500',
  author: 'The Synthwave Society',
  group: 'The Synthwave Society',
  timeAgo: '2h ago',
  likes: 1200,
  comments: 84,
  badge: 'NEW RELEASE',
  description:
    '"The bassline on the third track is absolutely transformative. Reminds me of 80s Tokyo nights. A must-listen for anyone into retro-futurism."',
}

export const artistSpotlight: Artist = {
  id: '1',
  name: 'Elias Thorne',
  image: 'https://picsum.photos/seed/elias/200/200',
  role: 'Artist',
  bio: 'Exploring the intersections of folk and experimental ambient soundscapes from hi...',
}

export const gridPosts: Post[] = [
  {
    id: '2',
    title: 'Blue Note Sessions',
    image: 'https://picsum.photos/seed/bluenote/400/400',
    author: 'Marcus V.',
    group: '',
    timeAgo: '',
    likes: 0,
    comments: 0,
  },
  {
    id: '3',
    title: 'Live from Red Rocks',
    image: 'https://picsum.photos/seed/redrocks/400/400',
    author: 'Sarah G.',
    group: '',
    timeAgo: '',
    likes: 0,
    comments: 0,
  },
]

export const listPosts: Post[] = [
  {
    id: '4',
    title: 'Vinyl Sundays Weekly',
    image: 'https://picsum.photos/seed/vinyl/100/100',
    author: '',
    group: '',
    timeAgo: '',
    likes: 0,
    comments: 0,
    badge: 'LIVE NOW',
    description: 'Join 4.2k collectors in discussing this week\'s rare finds and pressings.',
  },
]

// Discover
export const trendingArtists: Artist[] = [
  { id: '1', name: 'Elena Rosas', image: 'https://picsum.photos/seed/elena/300/300', role: 'VOCALIST' },
  { id: '2', name: 'The Arsonist', image: 'https://picsum.photos/seed/arsonist/300/300', role: 'PRODUCER' },
  { id: '3', name: 'Kai Mori', image: 'https://picsum.photos/seed/kai/300/300', role: 'DJ' },
]

export const genres: Genre[] = [
  { id: '1', name: 'Synthwave', color: '#4338ca', icon: 'musical-notes' },
  { id: '2', name: 'Neo-Soul', color: '#c2410c', icon: 'heart' },
  { id: '3', name: 'Ambient Noir', color: '#18181b', icon: 'moon' },
  { id: '4', name: 'Lush Pop', color: '#0f766e', icon: 'sparkles' },
]

export const communities: Community[] = [
  { id: '1', name: 'Vinyl Heads', tagline: 'Crate diggers & analog lovers', members: 12400, color: '#7c3aed', icon: 'disc', isLive: true },
  { id: '2', name: 'Late Night Beats', tagline: 'After-hours producers & DJs', members: 8700, color: '#be185d', icon: 'moon', isLive: false },
  { id: '3', name: 'Synth Collective', tagline: 'Modular jams & sound design', members: 5200, color: '#0891b2', icon: 'pulse', isLive: true },
  { id: '4', name: 'Acoustic Sessions', tagline: 'Stripped-back & soulful', members: 9100, color: '#b45309', icon: 'cafe', isLive: false },
  { id: '5', name: 'Bass Culture', tagline: 'Sub-heavy & genre-bending', members: 15300, color: '#059669', icon: 'volume-high', isLive: false },
  { id: '6', name: 'Dream Pop Society', tagline: 'Shoegaze, ethereal & hazy', members: 6800, color: '#6366f1', icon: 'cloudy-night', isLive: true },
]

export const curators: CuratorProfile[] = [
  { id: '1', name: 'Marcus Thorne', image: 'https://picsum.photos/seed/marcus/100/100', topPick: '"Neon Dusk" EP' },
  { id: '2', name: 'Sasha Grey', image: 'https://picsum.photos/seed/sasha/100/100', topPick: '"Vinyl Sessions"' },
]

// Match
export const matchProfiles: MatchProfile[] = [
  {
    id: '1',
    name: 'Julianna Vane',
    image: 'https://picsum.photos/seed/julianna/600/800',
    vibePercent: 94,
    genres: ['HYPERPOP', 'ELECTRONIC', 'GLITCHCORE'],
    similarArtists: ['The Weeknd', 'Daft Punk', 'Tame Impala'],
    sharedGenres: ['R&B', 'Soul', 'Indie Dance'],
  },
  {
    id: '2',
    name: 'Amara Chen',
    image: 'https://picsum.photos/seed/amara/600/800',
    vibePercent: 87,
    genres: ['JAZZ', 'NEO-SOUL', 'AMBIENT'],
    similarArtists: ['Hiatus Kaiyote', 'Erykah Badu'],
    sharedGenres: ['Jazz Fusion', 'Soul', 'Electronic'],
  },
]

// Profile
export const userProfile: UserProfile = {
  id: '1',
  name: 'Alex Rivera',
  image: 'https://picsum.photos/seed/alex/300/300',
  bio: 'Curating the future of sound.',
  followers: 1200,
  following: 482,
}

export const albumOfWeek: AlbumOfWeek = {
  id: '1',
  title: 'Vanguards of Neon',
  artist: 'The Synthetic Dream',
  image: 'https://picsum.photos/seed/album/400/400',
}

export const topArtists: Artist[] = [
  { id: '1', name: 'Solaris', image: 'https://picsum.photos/seed/solaris/200/200', role: 'Electronic', genre: 'Electronic' },
  { id: '2', name: 'Luna Ray', image: 'https://picsum.photos/seed/lunaray/200/200', role: 'Indie Pop', genre: 'Indie Pop' },
  { id: '3', name: 'The Echoes', image: 'https://picsum.photos/seed/echoes/200/200', role: 'Rock', genre: 'Rock' },
  { id: '4', name: 'Miles J.', image: 'https://picsum.photos/seed/milesj/200/200', role: 'Jazz', genre: 'Jazz' },
]

export const listeningMetrics: ListeningMetric[] = [
  { id: '1', label: 'Mood Sync', value: '94% ACCURACY', icon: 'analytics' },
  { id: '2', label: 'High Energy', value: '', icon: 'flash' },
  { id: '3', label: 'Flow State', value: '', icon: 'water' },
]

// Chat
export const chatMessages: ChatMessage[] = [
  {
    id: '1',
    text: 'Hey, did you check the new master for the track? I think the low end needs a bit more warmth.',
    sender: 'them',
    time: '11:42 PM',
    date: 'YESTERDAY',
  },
  {
    id: '2',
    text: "Just listening now. The vocals are sitting perfectly, but I see what you mean about the bass. I'll adjust the EQ.",
    sender: 'me',
    time: '11:45 PM',
  },
  {
    id: '3',
    text: 'Perfect. Also, what about that modular synth part in the bridge? Maybe a bit more reverb?',
    sender: 'them',
    time: '11:48 PM',
  },
  {
    id: '4',
    text: "I'll try a cathedral reverb on it. Should give it that ethereal vibe we were talking about.",
    sender: 'me',
    time: '10:15 AM',
    date: 'TODAY',
  },
  {
    id: '5',
    text: 'Thinking about using this outboard gear for the final mix.',
    image: 'https://picsum.photos/seed/gear/400/300',
    sender: 'them',
    time: '10:20 AM',
  },
]

// Who's On — active users
export const activeUsers: DiscoverUser[] = [
  {
    id: '1',
    name: 'Zara K.',
    image: 'https://picsum.photos/seed/zaraK/200/200',
    nowListening: 'Frank Ocean',
    genres: ['R&B', 'Alt'],
    vibePercent: 94,
  },
  {
    id: '2',
    name: 'Luca M.',
    image: 'https://picsum.photos/seed/lucaM/200/200',
    nowListening: 'Tame Impala',
    genres: ['Psych', 'Indie'],
    vibePercent: 88,
  },
  {
    id: '3',
    name: 'Nia O.',
    image: 'https://picsum.photos/seed/niaO/200/200',
    nowListening: 'SZA',
    genres: ['Neo-Soul', 'Pop'],
    vibePercent: 91,
  },
  {
    id: '4',
    name: 'Kael R.',
    image: 'https://picsum.photos/seed/kaelR/200/200',
    nowListening: 'Bladee',
    genres: ['Hyperpop', 'Cloud'],
    vibePercent: 79,
  },
  {
    id: '5',
    name: 'Isla T.',
    image: 'https://picsum.photos/seed/islaT/200/200',
    nowListening: 'Ethel Cain',
    genres: ['Art Pop', 'Dark'],
    vibePercent: 86,
  },
  {
    id: '6',
    name: 'Dev N.',
    image: 'https://picsum.photos/seed/devN/200/200',
    nowListening: 'JPEGMAFIA',
    genres: ['Experimental', 'Rap'],
    vibePercent: 82,
  },
]

// Settings
export const musicalAffinities = [
  { name: 'Jazz Fusion', active: true },
  { name: 'Electronic', active: false },
  { name: 'Classical', active: true },
  { name: 'Neo-Soul', active: false },
  { name: 'Post-Rock', active: false },
  { name: 'Ambient', active: false },
]
