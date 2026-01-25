import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@workos-inc/authkit-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function ProtectedRoute({ children }) {
  const { isLoading, user } = useAuth()
  const location = useLocation()
  
  // Query user from Convex to check preferences
  const convexUser = useQuery(
    api.users.getByWorkosId,
    user?.id ? { workosId: user.id } : 'skip'
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

  // Not authenticated - redirect to login
  if (!user) {
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
