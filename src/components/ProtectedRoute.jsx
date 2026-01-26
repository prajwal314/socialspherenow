import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@workos-inc/authkit-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useEffect, useState } from 'react'

export default function ProtectedRoute({ children }) {
  const { isLoading, user } = useAuth()
  const location = useLocation()
  const [checkingServerSession, setCheckingServerSession] = useState(false)
  const [serverUserId, setServerUserId] = useState(null)

  // Use the client user id if present, otherwise use server-side user id
  const convexUser = useQuery(
    api.users.getByWorkosId,
    user?.id ? { workosId: user.id } : serverUserId ? { workosId: serverUserId } : 'skip'
  )

  // Show loading while auth is checking
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

  // Not authenticated in client SDK. Check server session once before redirecting.
  useEffect(() => {
    let mounted = true
    const checkSession = async () => {
      if (user) return
      setCheckingServerSession(true)
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' })
        const data = await res.json()
        if (!mounted) return
        if (data?.user?.id) {
          setServerUserId(data.user.id)
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setCheckingServerSession(false)
      }
    }

    checkSession()
    return () => { mounted = false }
  }, [user])

  if (!user && checkingServerSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#161621]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Checking session...</p>
        </div>
      </div>
    )
  }

  if (!user && !checkingServerSession && !serverUserId) {
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
