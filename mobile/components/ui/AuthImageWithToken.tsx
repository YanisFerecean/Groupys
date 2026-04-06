import AuthImage from '@/components/ui/AuthImage'
import { useAuthToken } from '@/hooks/useAuthToken'
import type { StyleProp, ImageStyle, ImageResizeMode } from 'react-native'

interface Props {
  uri: string
  className?: string
  style?: StyleProp<ImageStyle>
  resizeMode?: ImageResizeMode
}

export default function AuthImageWithToken({ uri, className, style, resizeMode }: Props) {
  const { token } = useAuthToken()

  return (
    <AuthImage
      uri={uri}
      token={token}
      className={className || "w-full rounded-xl"}
      style={style || { height: 200 }}
      resizeMode={resizeMode}
    />
  )
}
