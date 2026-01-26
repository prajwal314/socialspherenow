import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@workos-inc/authkit-react'
// We'll call our serverless exchange endpoint in production to create a
// server-side session cookie. AuthKit's client-side flow (devMode) will
// continue to be used in localhost for faster iteration.
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function Callback() {
  const navigate = useNavigate()
  const { isLoading, user } = useAuth()
  const upsertUser = useMutation(api.users.upsertUser)
  const hasUpserted = useRef(false)

  // If the app receives an authorization code in the URL, exchange it
  // server-side so we set an httpOnly cookie. Only run this in prod
  // because local dev uses AuthKit devMode.
  useEffect(() => {
    const tryServerExchange = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (!code) return

      try {
        // Call our serverless exchange endpoint which sets the session cookie
        await fetch(`/api/auth/exchange?code=${encodeURIComponent(code)}`, {
          credentials: 'include',
        })
        // Reload so AuthKit can pick up the server session via its session
        // fetching behavior (or so our session endpoint is used by the app).
        window.location.replace('/callback')
      } catch (e) {
        console.error('Server exchange failed', e)
      }
    }

    tryServerExchange()
  }, [])

  const convexUser = useQuery(
    api.users.getByWorkosId,
    user?.id ? { workosId: user.id } : 'skip'
  )

  useEffect(() => {
    const saveUserAndRedirect = async () => {
      if (!isLoading && user && !hasUpserted.current) {
        hasUpserted.current = true

        try {
          await upsertUser({
            workosId: user.id,
            email: user.email,
            firstName: user.firstName ?? undefined,
            lastName: user.lastName ?? undefined,
            profileImageUrl: user.profilePictureUrl ?? undefined,
          })
        } catch (error) {
          console.error('Failed to save user to Convex:', error)
        }
      }
    }

    saveUserAndRedirect()
  }, [isLoading, user, upsertUser])

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true })
      return
    }

    if (convexUser === undefined) return

    if (convexUser?.hasCompletedPreferences) {
      navigate('/home', { replace: true })
    } else if (convexUser) {
      navigate('/preferences', { replace: true })
    }
  }, [isLoading, user, convexUser, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#161621]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Authenticating...</p>
      </div>
    </div>
  )
}
