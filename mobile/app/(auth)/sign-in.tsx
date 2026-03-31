import AuthScaffold from '@/components/auth/AuthScaffold'
import SSOButtons from '@/components/auth/SSOButtons'

export default function SignInScreen() {
  return (
    <AuthScaffold
      title="Sign in"
      subtitle="Use social sign-in to continue to Groupys."
    >
      <SSOButtons mode="sign-in" />
    </AuthScaffold>
  )
}
