import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Platform, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useAuth, useUser } from '@clerk/expo'
import { Redirect, useRouter } from 'expo-router'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import {
  connectMusic,
  fetchMusicTopAlbums,
  fetchMusicTopArtists,
  fetchMusicTopTracks,
  fetchUserByClerkId,
  getMusicDeveloperToken,
  getMusicErrorMessage,
  saveOnboardingArtists,
  syncMusic,
  updateBackendUser,
  upsertBackendUserIdentity,
} from '@/lib/api'
import {
  APPLE_MUSIC_CONNECT_ENABLED,
  getAppleMusicDevBuildMessage,
  getCapabilityStatus,
  getMusicUserToken,
  isAppleMusicNativeBridgeAvailable,
  requestAuthorization,
} from '@/lib/appleMusicAuth'
import { getUserDisplayName, isAccountSetupComplete, normalizeDisplayName, normalizeUsername } from '@/lib/auth'
import { getClerkErrorMessage } from '@/lib/clerk'
import type { ProfileCustomization, TopAlbum, TopArtist, TopSong } from '@/models/ProfileCustomization'

import { EMPTY_ONBOARDING, PROGRESS_STEPS, progressIndex, type OnboardingData, type StepKey } from './types'
import type { PickItem } from './MusicSearchPicker'
import WelcomeStep from './steps/WelcomeStep'
import AccountStep from './steps/AccountStep'
import GreetingStep from './steps/GreetingStep'
import BioStep from './steps/BioStep'
import CountryStep from './steps/CountryStep'
import TagsStep from './steps/TagsStep'
import MusicIntroStep from './steps/MusicIntroStep'
import BuildingStep from './steps/BuildingStep'
import MusicReviewStep from './steps/MusicReviewStep'
import ManualPicksStep from './steps/ManualPicksStep'
import TasteRevealStep from './steps/TasteRevealStep'
import FollowNudgeStep from './steps/FollowNudgeStep'

const TOTAL_PROGRESS = PROGRESS_STEPS.length

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') || null }
}

function appleAvailability(): { available: boolean; reason?: string } {
  if (!APPLE_MUSIC_CONNECT_ENABLED) return { available: false, reason: 'Apple Music connect is off in this build — add your favorites by hand.' }
  if (Platform.OS !== 'ios') return { available: false, reason: 'Apple Music connect is iOS-only right now — add your favorites by hand.' }
  if (!isAppleMusicNativeBridgeAvailable()) return { available: false, reason: getAppleMusicDevBuildMessage() }
  return { available: true }
}

function composeTasteSummary(d: OnboardingData): string {
  const artists = d.topArtists.map((a) => a.name).filter(Boolean).slice(0, 3)
  const genres = d.tags.slice(0, 3)
  const parts: string[] = []
  if (genres.length) parts.push(`${genres.join(', ')} at heart`)
  if (artists.length) parts.push(`always coming back to ${artists.join(', ')}`)
  if (!parts.length) return 'A music lover with taste all your own.'
  const text = parts.join(' — ')
  return text.charAt(0).toUpperCase() + text.slice(1) + '.'
}

const pickItemToArtist = (p: PickItem): TopArtist => ({ id: p.id, name: p.title, imageUrl: p.image })
const pickItemToSong = (p: PickItem): TopSong => ({ id: p.id, title: p.title, artist: p.subtitle ?? '', coverUrl: p.image })
const pickItemToAlbum = (p: PickItem): TopAlbum => ({ id: p.id, title: p.title, artist: p.subtitle ?? '', coverUrl: p.image })

export default function OnboardingFlow() {
  const router = useRouter()
  const { isSignedIn, isLoaded: isAuthLoaded, getToken } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

  const [step, setStep] = useState<StepKey>('welcome')
  const [data, setData] = useState<OnboardingData>(EMPTY_ONBOARDING)
  const [manualArtists, setManualArtists] = useState<PickItem[]>([])
  const [manualSongs, setManualSongs] = useState<PickItem[]>([])
  const [manualAlbums, setManualAlbums] = useState<PickItem[]>([])

  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [tasteSummary, setTasteSummary] = useState('')

  const [prefilled, setPrefilled] = useState(false)
  const [backendChecked, setBackendChecked] = useState(false)
  const backendUserId = useRef<string | null>(null)
  const getTokenRef = useRef(getToken)
  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const apple = appleAvailability()

  // Prefill display name / username from Clerk + existing backend row.
  useEffect(() => {
    if (prefilled || !user) return
    setData((d) => ({
      ...d,
      displayName: d.displayName || normalizeDisplayName(getUserDisplayName(user)),
      username: d.username || normalizeUsername(user.username),
    }))
    setPrefilled(true)
  }, [prefilled, user])

  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded || !isSignedIn || !user || backendChecked) return
    let cancelled = false
    ;(async () => {
      try {
        const token = await getTokenRef.current()
        const bu = await fetchUserByClerkId(user.id, token)
        if (cancelled) return
        if (bu) {
          backendUserId.current = bu.id
          setData((d) => ({
            ...d,
            displayName: d.displayName || normalizeDisplayName(bu.displayName),
            username: d.username || normalizeUsername(bu.username),
            bio: d.bio || (bu.bio ?? ''),
            country: d.country || (bu.country ?? ''),
            tags: d.tags.length ? d.tags : bu.tags ?? [],
          }))
        }
      } catch {
        /* non-critical */
      } finally {
        if (!cancelled) setBackendChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthLoaded, isUserLoaded, isSignedIn, user, backendChecked])

  const progress: [number, number] = [progressIndex(step), TOTAL_PROGRESS]

  // ── Account ────────────────────────────────────────────────────────────────
  const handleAccountSubmit = useCallback(
    async (displayName: string, username: string) => {
      if (!user) return
      setAccountSaving(true)
      setAccountError(null)
      try {
        const { firstName, lastName } = splitDisplayName(displayName)
        await user.update({ username, firstName, lastName })

        const token = await getTokenRef.current()
        const bu = await upsertBackendUserIdentity(
          { clerkId: user.id, username, displayName, profileImage: user.imageUrl ?? undefined },
          token,
        )
        backendUserId.current = bu.id
        setData((d) => ({ ...d, displayName, username }))
        setStep('greeting')
      } catch (e) {
        const message = e instanceof Error ? e.message : ''
        if (message.toLowerCase().includes('username') || message.includes('(409)')) {
          setAccountError('That username is already taken. Please choose a different one.')
        } else if (message.includes('(401)') || message.includes('(403)')) {
          setAccountError('Your session expired. Please sign out and sign in again.')
        } else {
          setAccountError(getClerkErrorMessage(e, 'Could not save your profile. Please try again.'))
        }
      } finally {
        setAccountSaving(false)
      }
    },
    [user],
  )

  // ── Persistence ─────────────────────────────────────────────────────────────
  const persistProfile = useCallback(
    async (picks: { topArtists: TopArtist[]; topSongs: TopSong[]; topAlbums: TopAlbum[] }, synced: boolean, artistIds: number[]) => {
      if (!user) return
      setSaving(true)
      try {
        const token = await getTokenRef.current()
        let userId = backendUserId.current
        if (!userId) {
          const bu = await fetchUserByClerkId(user.id, token)
          userId = bu?.id ?? null
          backendUserId.current = userId
        }
        if (!userId) throw new Error('Profile not ready (404)')

        const profile: Partial<ProfileCustomization> = {
          displayName: data.displayName || undefined,
          bio: data.bio || undefined,
          country: data.country || undefined,
          tags: data.tags,
          topArtists: picks.topArtists,
          topSongs: picks.topSongs,
          topAlbums: picks.topAlbums,
          syncTopArtistsWithMusic: synced,
          syncTopSongsWithMusic: synced,
          syncTopAlbumsWithMusic: synced,
        }
        await updateBackendUser(userId, profile, token)

        if (artistIds.length) {
          await saveOnboardingArtists(artistIds, token).catch(() => {})
        }

        const nextData = { ...data, ...picks, musicConnected: synced || data.musicConnected }
        setData(nextData)
        setTasteSummary(composeTasteSummary(nextData))
        setStep('reveal')
      } catch (e) {
        const message = e instanceof Error ? e.message : ''
        Alert.alert('Couldn’t save', message ? `Please try again.\n${message}` : 'Please try again.')
      } finally {
        setSaving(false)
      }
    },
    [data, user],
  )

  // ── Apple Music connect ───────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    setStep('building')
    try {
      const token = await getTokenRef.current()
      const devToken = await getMusicDeveloperToken(token)

      const status = await requestAuthorization()
      if (status !== 'authorized') throw new Error('Apple Music permission was not granted.')

      const capability = await getCapabilityStatus()
      if (!capability.musicCatalogPlayback) {
        throw new Error('This Apple account cannot access Music catalog playback.')
      }

      const musicUserToken = await getMusicUserToken(devToken.token)
      await connectMusic(token, musicUserToken)
      await syncMusic(token)

      const [artists, tracks, albums] = await Promise.all([
        fetchMusicTopArtists(token),
        fetchMusicTopTracks(token),
        fetchMusicTopAlbums(token),
      ])

      const topArtists: TopArtist[] = artists.slice(0, 3).map((a) => ({ name: a.name, imageUrl: a.imageUrl ?? undefined }))
      const topSongs: TopSong[] = tracks.slice(0, 3).map((t) => ({ title: t.title, artist: t.artist, coverUrl: t.coverUrl ?? undefined }))
      const topAlbums: TopAlbum[] = albums.slice(0, 3).map((a) => ({
        title: a.title,
        artist: a.artist,
        coverUrl: a.coverUrl ?? undefined,
        appleMusicId: a.appleMusicId ?? undefined,
      }))

      if (!topArtists.length && !topSongs.length && !topAlbums.length) {
        Alert.alert('Apple Music', 'We couldn’t find listening history yet — pick your favorites instead.')
        setStep('manual')
        return
      }

      setData((d) => ({ ...d, musicConnected: true, topArtists, topSongs, topAlbums }))
      setStep('musicReview')
    } catch (e) {
      Alert.alert('Apple Music', getMusicErrorMessage(e, 'Couldn’t connect Apple Music. You can pick your favorites instead.'))
      setStep('manual')
    }
  }, [])

  const handleLoveApplePicks = useCallback(() => {
    persistProfile({ topArtists: data.topArtists, topSongs: data.topSongs, topAlbums: data.topAlbums }, true, [])
  }, [data, persistProfile])

  const handleManualSave = useCallback(() => {
    const topArtists = manualArtists.map(pickItemToArtist)
    const topSongs = manualSongs.map(pickItemToSong)
    const topAlbums = manualAlbums.map(pickItemToAlbum)
    const artistIds = manualArtists.map((p) => p.id).filter((id) => Number.isFinite(id))
    persistProfile({ topArtists, topSongs, topAlbums }, false, artistIds)
  }, [manualArtists, manualSongs, manualAlbums, persistProfile])

  // ── Finish ──────────────────────────────────────────────────────────────────
  const finish = useCallback(async () => {
    if (!user) return
    setFinishing(true)
    try {
      const meta = (user.unsafeMetadata ?? {}) as Record<string, unknown>
      await user.update({ unsafeMetadata: { ...meta, onboarding_completed: true } })
      await user.reload().catch(() => {})
      router.replace('/(home)/(feed)')
    } catch (e) {
      Alert.alert('Almost there', getClerkErrorMessage(e, 'Could not finish setup. Please try again.'))
      setFinishing(false)
    }
  }, [user, router])

  // ── Guards ───────────────────────────────────────────────────────────────
  if (!isAuthLoaded || !isUserLoaded) return <FullscreenSpinner />
  if (!isSignedIn) return <Redirect href="/(auth)/landing" />
  if (isAccountSetupComplete(user)) {
    if (!backendChecked) return <FullscreenSpinner />
    if (backendUserId.current) return <Redirect href="/(home)/(feed)" />
  }

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeStep onStart={() => setStep('account')} />
      case 'account':
        return (
          <AccountStep
            initialDisplayName={data.displayName}
            initialUsername={data.username}
            saving={accountSaving}
            submitError={accountError}
            progress={progress}
            onBack={() => setStep('welcome')}
            onSubmit={handleAccountSubmit}
          />
        )
      case 'greeting':
        return <GreetingStep name={data.displayName} onDone={() => setStep('bio')} />
      case 'bio':
        return (
          <BioStep
            value={data.bio}
            onChange={(bio) => setData((d) => ({ ...d, bio }))}
            progress={progress}
            onBack={() => setStep('account')}
            onContinue={() => setStep('country')}
            onSkip={() => {
              setData((d) => ({ ...d, bio: '' }))
              setStep('country')
            }}
          />
        )
      case 'country':
        return (
          <CountryStep
            value={data.country}
            onChange={(country) => setData((d) => ({ ...d, country }))}
            progress={progress}
            onBack={() => setStep('bio')}
            onContinue={() => setStep('tags')}
            onSkip={() => {
              setData((d) => ({ ...d, country: '' }))
              setStep('tags')
            }}
          />
        )
      case 'tags':
        return (
          <TagsStep
            selected={data.tags}
            onChange={(tags) => setData((d) => ({ ...d, tags }))}
            progress={progress}
            onBack={() => setStep('country')}
            onContinue={() => setStep('musicIntro')}
          />
        )
      case 'musicIntro':
        return (
          <MusicIntroStep
            appleAvailable={apple.available}
            appleUnavailableReason={apple.reason}
            progress={progress}
            onBack={() => setStep('tags')}
            onConnect={handleConnect}
            onManual={() => setStep('manual')}
          />
        )
      case 'building':
        return <BuildingStep />
      case 'musicReview':
        return (
          <MusicReviewStep
            topArtists={data.topArtists}
            topSongs={data.topSongs}
            topAlbums={data.topAlbums}
            saving={saving}
            progress={progress}
            onBack={() => setStep('musicIntro')}
            onLove={handleLoveApplePicks}
            onPickManually={() => setStep('manual')}
          />
        )
      case 'manual':
        return (
          <ManualPicksStep
            artists={manualArtists}
            songs={manualSongs}
            albums={manualAlbums}
            onChangeArtists={setManualArtists}
            onChangeSongs={setManualSongs}
            onChangeAlbums={setManualAlbums}
            saving={saving}
            progress={progress}
            onBack={() => setStep('musicIntro')}
            onSave={handleManualSave}
          />
        )
      case 'reveal':
        return (
          <TasteRevealStep
            displayName={data.displayName}
            tasteSummary={tasteSummary}
            tags={data.tags}
            topArtists={data.topArtists}
            topSongs={data.topSongs}
            topAlbums={data.topAlbums}
            progress={progress}
            onEnter={() => setStep('follow')}
          />
        )
      case 'follow':
        return <FollowNudgeStep progress={progress} finishing={finishing} onFinish={finish} />
      default:
        return null
    }
  }

  return (
    <Animated.View key={step} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} className="flex-1">
      <View className="flex-1">{renderStep()}</View>
    </Animated.View>
  )
}
