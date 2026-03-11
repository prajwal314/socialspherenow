import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@workos-inc/authkit-react'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signIn, isLoading, user } = useAuth()
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState(null)

  // Check for error from callback
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam)
    }
  }, [searchParams])

  // Check both client-side AuthKit and server session
  useEffect(() => {
    const checkAuth = async () => {
      // If AuthKit has a user, redirect immediately
      if (!isLoading && user) {
        navigate('/home', { replace: true })
        return
      }

      // If AuthKit is still loading, wait
      if (isLoading) return

      // AuthKit has no user, check server session
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' })
        const data = await res.json()
        
        if (data?.user?.id) {
          // Server session exists, redirect to home
          navigate('/home', { replace: true })
          return
        }
      } catch (e) {
        console.error('Session check failed:', e)
      }
      
      // No auth found, show login page
      setCheckingSession(false)
    }

    checkAuth()
  }, [isLoading, user, navigate])

  const handleLogin = () => {
    setError(null)
    signIn()
  }

  // Show loading while checking auth
  if (checkingSession || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#161621]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#161621]">
      <h1 className="text-2xl font-bold mb-6 text-white">Sign in to SocialSphere</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
          Authentication failed: {error}
        </div>
      )}
      
      <button
        onClick={handleLogin}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
      >
        Sign In with WorkOS
      </button>
    </div>
  )
}
