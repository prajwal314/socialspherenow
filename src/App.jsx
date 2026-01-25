import { Routes, Route } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import Callback from './pages/Callback'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Inbox from './pages/Inbox'
import Profile from './pages/Profile'
import PreferenceOnboarding from './pages/PreferenceOnboarding'
import HelpSupport from './pages/HelpSupport'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Onboarding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/callback" element={<Callback />} />
      
      {/* Protected routes */}
      <Route path="/preferences" element={<ProtectedRoute><PreferenceOnboarding /></ProtectedRoute>} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
      <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
    </Routes>
  )
}
