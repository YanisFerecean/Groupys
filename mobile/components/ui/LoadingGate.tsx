import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Buffer } from 'buffer'
import { Colors } from '@/constants/colors'
import { API_URL } from '@/lib/config'
import { getTrappedErrors } from '@/lib/globalErrorTrap'

/**
 * Temporary diagnostic replacement for FullscreenSpinner. Shows a spinner, but
 * if it is still mounted after DELAY_MS (i.e. loading is stuck) it reveals an
 * on-screen report: auth flags, the embedded Clerk key/API URL, live network
 * probes, and any trapped JS errors. Lets a TestFlight build self-report the
 * cause of the endless-loading hang without a USB cable.
 *
 * Remove this component (revert to FullscreenSpinner) once the cause is fixed.
 */

const DELAY_MS = 8000
const PROBE_TIMEOUT_MS = 6000

function clerkFrontendApi(): string | null {
  const pk = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!pk) return null
  try {
    const b64 = pk.replace(/^pk_(live|test)_/, '')
    const decoded = Buffer.from(b64, 'base64').toString('utf8')
    return `https://${decoded.replace(/\$+$/, '')}`
  } catch {
    return null
  }
}

async function probe(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    return `HTTP ${res.status}`
  } catch (err) {
    const e = err as { name?: string; message?: string }
    return `FAIL ${e?.name ?? ''} ${e?.message ?? String(err)}`.slice(0, 140)
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', marginVertical: 3 }}>
      <Text selectable style={{ color: '#9cdcfe', width: 120, fontSize: 13 }}>
        {label}
      </Text>
      <Text selectable style={{ color: '#ffffff', flex: 1, fontSize: 13 }}>
        {value}
      </Text>
    </View>
  )
}

export default function LoadingGate({
  isAuthLoaded,
  isSignedIn,
  isUserLoaded,
  label,
}: {
  isAuthLoaded: boolean
  isSignedIn?: boolean
  isUserLoaded?: boolean
  label?: string
}) {
  const [show, setShow] = useState(false)
  const [probes, setProbes] = useState<{ name: string; result: string }[] | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setShow(true), DELAY_MS)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!show) return
    let cancelled = false
    void (async () => {
      const fapi = clerkFrontendApi()
      const results = [
        {
          name: 'Clerk env',
          result: fapi ? await probe(`${fapi}/v1/environment?_clerk_js_version=5.0.0`) : 'no key',
        },
        { name: 'API', result: await probe(API_URL) },
      ]
      if (!cancelled) setProbes(results)
    })()
    return () => {
      cancelled = true
    }
  }, [show])

  if (!show) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    )
  }

  const pk = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  const errors = getTrappedErrors()

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#111418' }} contentContainerStyle={{ padding: 20, paddingTop: 80 }}>
      <Text selectable style={{ color: '#ffffff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
        Stuck loading — diagnostics
      </Text>
      <Row label="gate" value={label ?? '-'} />
      <Row label="isAuthLoaded" value={String(isAuthLoaded)} />
      <Row label="isSignedIn" value={String(isSignedIn)} />
      <Row label="isUserLoaded" value={String(isUserLoaded)} />
      <Row label="clerk key" value={pk ? `${pk.slice(0, 12)}…(len ${pk.length})` : 'MISSING'} />
      <Row label="frontendApi" value={clerkFrontendApi() ?? 'n/a'} />
      <Row label="API_URL" value={API_URL} />
      {probes === null ? (
        <Row label="probes" value="running…" />
      ) : (
        probes.map((p) => <Row key={p.name} label={p.name} value={p.result} />)
      )}
      <Text selectable style={{ color: '#ff6b6b', marginTop: 16, fontWeight: '700' }}>
        Trapped errors ({errors.length})
      </Text>
      {errors.length === 0 ? (
        <Text selectable style={{ color: '#aaaaaa', marginTop: 4 }}>
          none
        </Text>
      ) : (
        errors.map((e, i) => (
          <Text key={i} selectable style={{ color: '#ff9d9d', fontSize: 12, marginTop: 6 }}>
            {e}
          </Text>
        ))
      )}
    </ScrollView>
  )
}
