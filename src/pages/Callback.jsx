import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@workos-inc/authkit-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function Callback() {
  const navigate = useNavigate()
  const { isLoading, user } = useAuth()
  const upsertUser = useMutation(api.users.upsertUser)
  const hasUpserted = useRef(false)
  const hasStartedExchange = useRef(false)
  const [serverUserId, setServerUserId] = useState(null)
  const [exchangeComplete, setExchangeComplete] = useState(false)
  const [exchangeError, setExchangeError] = useState(null)

  // Step 1: Exchange authorization code for session cookie (production flow)
  useEffect(() => {
    const tryServerExchange = async () => {
      // Prevent duplicate exchange attempts
      if (hasStartedExchange.current) return
      
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      
      // No code means we're not in OAuth callback flow
      if (!code) {
        setExchangeComplete(true)
        return
      }

      hasStartedExchange.current = true

      try {
        // Call our serverless exchange endpoint which sets the session cookie
        const exchangeRes = await fetch(`/api/auth/exchange?code=${encodeURIComponent(code)}`, {
          credentials: 'include',
        })

        if (!exchangeRes.ok) {
          const errorData = await exchangeRes.json().catch(() => ({}))
          console.error('Exchange failed:', errorData)
          setExchangeError(errorData.error || 'exchange_failed')
          setExchangeComplete(true)
          return
        }

        // After the exchange, verify the session was created
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include',
        })
        const sessionData = await sessionRes.json()

        if (sessionData?.user?.id) {
          setServerUserId(sessionData.user.id)
        }
        
        setExchangeComplete(true)
      } catch (e) {
        console.error('Server exchange failed', e)
        setExchangeError('network_error')
        setExchangeComplete(true)
      }
    }

    tryServerExchange()
  }, [])

  // Determine effective user ID (client-side AuthKit OR server session)
  const effectiveUserId = user?.id || serverUserId

  // Query Convex user only when we have an effective user ID
  const convexUser = useQuery(
    api.users.getByWorkosId,
    effectiveUserId ? { workosId: effectiveUserId } : 'skip'
  )

  // Step 2: Upsert user to Convex database
  useEffect(() => {
    const saveUser = async () => {
      if (hasUpserted.current) return
      
      // For client-side user (AuthKit devMode)
      if (user) {
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
      // For server-side session, we may not have full user details
      // The user should already exist from a previous upsert during login
    }

    saveUser()
  }, [user, upsertUser])

  // Step 3: Navigate after everything is ready
  useEffect(() => {
    // Wait for exchange to complete
    if (!exchangeComplete) return
    
    // Wait for AuthKit to finish loading
    if (isLoading) return

    // If exchange failed, redirect to login with error
    if (exchangeError) {
      navigate(`/login?error=${exchangeError}`, { replace: true })
      return
    }

    // No user from either source - redirect to login
    if (!effectiveUserId) {
      navigate('/login', { replace: true })
      return
    }

    // Wait for Convex user query to load
    if (convexUser === undefined) return

    // Redirect based on onboarding status
    if (convexUser?.hasCompletedPreferences) {
      navigate('/home', { replace: true })
    } else {
      navigate('/preferences', { replace: true })
    }
  }, [exchangeComplete, exchangeError, isLoading, effectiveUserId, convexUser, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#161621]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">
          {exchangeError ? 'Redirecting...' : 'Authenticating...'}
        </p>
      </div>
    </div>
  )
}
