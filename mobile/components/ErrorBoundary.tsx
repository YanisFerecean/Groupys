import { Component, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import Button from '@/components/ui/Button'
import { logError } from '@/lib/logging'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Top-level error boundary. Catches render-time crashes anywhere in the tree
 * and shows a recoverable fallback instead of a white screen / native crash.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    logError('[error-boundary] uncaught render error', error)
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-surface px-8">
          <Text className="text-on-surface text-xl font-bold text-center">
            Something went wrong
          </Text>
          <Text className="text-on-surface-variant text-base text-center mt-2 mb-6">
            An unexpected error occurred. Please try again.
          </Text>
          <Button title="Try again" onPress={this.handleReset} />
        </View>
      )
    }

    return this.props.children
  }
}
