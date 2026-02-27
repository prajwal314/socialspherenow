import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@workos-inc/authkit-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useEffect, useState } from 'react'

export default function ProtectedRoute({ children }) {
  const { isLoading, user } = useAuth()
  const location = useLocation()
  const [checkingServerSession, setCheckingServerSession] = useState(true)
  const [serverUserId, setServerUserId] = useState(null)

  // Check server session on mount (must be before any conditional returns)
  useEffect(() => {
    let mounted = true
    const checkSession = async () => {
      // If we already have a client user, skip server check
      if (user) {
        setCheckingServerSession(false)
        return
      }
      
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' })
        const data = await res.json()
        if (!mounted) return
        if (data?.user?.id) {
          setServerUserId(data.user.id)
        }
      } catch (e) {
        console.error('Session check failed:', e)
      } finally {
        if (mounted) setCheckingServerSession(false)
      }
    }

    checkSession()
    return () => { mounted = false }
  }, [user])

  // Use the client user id if present, otherwise use server-side user id
  const effectiveUserId = user?.id || serverUserId
  const convexUser = useQuery(
    api.users.getByWorkosId,
    effectiveUserId ? { workosId: effectiveUserId } : 'skip'
  )

  // Show loading while auth SDK is initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#161621]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading while checking server session
  if (checkingServerSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#161621]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Checking session...</p>
        </div>
      </div>
    )
  }

  // No user from either client SDK or server session
  if (!effectiveUserId) {
    return <Navigate to="/login" replace />
  }

  // Still loading Convex user data
  if (convexUser === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#161621]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // If we're NOT on the preferences page and user hasn't completed preferences, redirect
  if (location.pathname !== '/preferences') {
    // User doesn't exist in Convex yet or hasn't completed preferences
    if (!convexUser || !convexUser.hasCompletedPreferences) {
      return <Navigate to="/preferences" replace />
    }
  }

  return children
}
