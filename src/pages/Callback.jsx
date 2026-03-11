import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@workos-inc/authkit-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function Callback() {
  const navigate = useNavigate()
  const { isLoading: authKitLoading, user: authKitUser } = useAuth()
  const upsertUser = useMutation(api.users.upsertUser)
  const hasUpserted = useRef(false)
  const [serverUser, setServerUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check server session (for production flow)
  useEffect(() => {
    const checkSession = async () => {
      // Skip if we have authKit user (devMode)
      if (authKitUser) {
        setCheckingSession(false)
        return
      }

      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' })
        const data = await res.json()
        
        if (data?.user) {
          setServerUser(data.user)
        }
      } catch (e) {
        console.error('Session check failed:', e)
      } finally {
        setCheckingSession(false)
      }
    }

    // Only check after authKit finishes loading
    if (!authKitLoading) {
      checkSession()
    }
  }, [authKitLoading, authKitUser])

  // Use authKit user (devMode) or server user (production)
  const effectiveUser = authKitUser || serverUser
  const effectiveUserId = effectiveUser?.id

  // Query Convex user
  const convexUser = useQuery(
    api.users.getByWorkosId,
    effectiveUserId ? { workosId: effectiveUserId } : 'skip'
  )

  // Save user to Convex
  useEffect(() => {
    const saveUser = async () => {
      if (hasUpserted.current || !effectiveUser) return
      
      hasUpserted.current = true
      
      try {
        await upsertUser({
          workosId: effectiveUser.id,
          email: effectiveUser.email,
          firstName: effectiveUser.firstName ?? undefined,
          lastName: effectiveUser.lastName ?? undefined,
          profileImageUrl: effectiveUser.profilePictureUrl ?? undefined,
        })
      } catch (error) {
        console.error('Failed to save user:', error)
      }
    }

    saveUser()
  }, [effectiveUser, upsertUser])

  // Navigate after everything is ready
  useEffect(() => {
    // Wait for authKit and session check
    if (authKitLoading || checkingSession) return

    // No user found
    if (!effectiveUserId) {
      navigate('/login', { replace: true })
      return
    }

    // Wait for Convex query
    if (convexUser === undefined) return

    // Redirect based on onboarding status
    if (convexUser?.hasCompletedPreferences) {
      navigate('/home', { replace: true })
    } else {
      navigate('/preferences', { replace: true })
    }
  }, [authKitLoading, checkingSession, effectiveUserId, convexUser, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#161621]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Authenticating...</p>
      </div>
    </div>
  )
}
