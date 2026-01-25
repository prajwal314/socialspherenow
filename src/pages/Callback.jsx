import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@workos-inc/authkit-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function Callback() {
  const navigate = useNavigate()
  const { isLoading, user } = useAuth()
  const upsertUser = useMutation(api.users.upsertUser)
  const hasUpserted = useRef(false)

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
