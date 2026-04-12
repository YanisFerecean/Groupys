import { Image, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import SSOButtons from '@/components/auth/SSOButtons'

const BASE_WIDTH = 390

const stickers = [
  { src: require('../../assets/illustrations/weeknd.png'), top: '-3%', left: '-5%',  width: 165, rotate: '180deg'  },
  { src: require('../../assets/illustrations/lips.png'),   top: '30%', left: '35%',  width: 130, rotate: '-17deg'  },
  { src: require('../../assets/illustrations/sade.png'),   top: '65%', left: '-5%',  width: 150, rotate: '0deg'    },
  { src: require('../../assets/illustrations/lamar.png'),  top: '0%',  left: '70%',  width: 180, rotate: '180deg'  },
  { src: require('../../assets/illustrations/ocean.png'),  top: '60%', left: '70%',  width: 170, rotate: '0deg'    },
]

export default function LandingScreen() {
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const scale = screenWidth / BASE_WIDTH
  const useGlass = isLiquidGlassAvailable()

  return (
    <View
      className="flex-1 justify-between bg-surface px-6"
      style={{ paddingTop: insets.top + 80, paddingBottom: insets.bottom + 32 }}
    >
      {/* Hero */}
      <View>
        <Text className="mb-6 text-5xl font-extrabold tracking-tighter text-primary">
          Groupys
        </Text>
        <Text className="text-4xl font-extrabold tracking-tighter text-on-surface">
          Music is{'\n'}better together.
        </Text>
        <Text className="mt-3 mb-3 text-lg text-on-surface-variant">
          Discover, connect, and share.
        </Text>
      </View>

      {/* Sticker wall */}
      {useGlass ? (
        <GlassView isInteractive style={{ flex: 1, borderRadius: 28, overflow: 'hidden', marginVertical: 8 }}>
          {stickers.map((s, i) => {
            const size = s.width * scale
            return (
              <Image
                key={i}
                source={s.src}
                style={{
                  position: 'absolute',
                  top: s.top as any,
                  left: s.left as any,
                  width: size,
                  height: size,
                  resizeMode: 'contain',
                  transform: [{ rotate: s.rotate }],
                }}
              />
            )
          })}
        </GlassView>
      ) : (
        <View
          style={{
            flex: 1,
            borderRadius: 28,
            overflow: 'hidden',
            marginVertical: 8,
            backgroundColor: 'rgba(0,0,0,0.04)',
          }}
        >
          {stickers.map((s, i) => {
            const size = s.width * scale
            return (
              <Image
                key={i}
                source={s.src}
                style={{
                  position: 'absolute',
                  top: s.top as any,
                  left: s.left as any,
                  width: size,
                  height: size,
                  resizeMode: 'contain',
                  transform: [{ rotate: s.rotate }],
                }}
              />
            )
          })}
        </View>
      )}

      {/* CTAs */}
      <View className="mt-8">
        <SSOButtons mode="sign-up" />
      </View>
    </View>
  )
}
