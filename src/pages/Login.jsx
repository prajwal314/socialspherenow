import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@workos-inc/authkit-react'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, isLoading, user } = useAuth()

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/home')
    }
  }, [isLoading, user, navigate])

  const handleLogin = () => {
    signIn()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">Sign in to SocialSphere</h1>
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Sign In with WorkOS'}
      </button>
    </div>
  )
}
