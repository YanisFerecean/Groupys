import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { useAuth } from '@clerk/expo'
import { API_URL, syncSpotifyMusic } from '@/lib/api'

WebBrowser.maybeCompleteAuthSession()

const SpotifyIcon = ({ size, color }: { size: number, color: string }) => (
  <MaterialCommunityIcons name="spotify" size={size} color={color} />
)

interface SpotifyConnectButtonProps {
  connected: boolean
  onConnect: () => void
}

export function SpotifyConnectButton({ connected, onConnect }: SpotifyConnectButtonProps) {
  const { getToken } = useAuth()

  const handleSpotifyConnect = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'mobile',
        path: 'spotify-auth',
      })
      const authUrl = `${API_URL}/spotify/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`
      
      const res = await fetch(authUrl, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)
        if (result.type === 'success' && result.url) {
          const urlParams = new URL(result.url)
          const code = urlParams.searchParams.get('code')
          
          if (code) {
            await fetch(`${API_URL}/spotify/callback`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ code, redirect_uri: redirectUri })
            })
            onConnect()
            syncSpotifyMusic(token).catch((err) => console.error('Background sync failed:', err))
          }
        }
      }
    } catch (err) {
      console.error('Spotify connect error:', err)
      alert('Failed to connect to Spotify')
    }
  }

  return (
    <View className="bg-surface-container rounded-xl p-4 flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        <SpotifyIcon size={28} color="#1DB954" />
        <Text className="text-base font-semibold text-on-surface">Spotify</Text>
      </View>
      
      {connected ? (
        <View className="bg-green-500/15 px-3 py-1.5 rounded-full flex-row items-center gap-1">
          <Ionicons name="checkmark-circle" size={16} color="#1DB954" />
          <Text className="text-sm font-bold text-[#1DB954]">Connected</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleSpotifyConnect}
          className="bg-primary px-4 py-2 rounded-full"
        >
          <Text className="text-sm font-bold text-white">Connect</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
