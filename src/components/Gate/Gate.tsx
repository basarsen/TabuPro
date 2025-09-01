import { Outlet } from 'react-router'   // ⬅️ DİKKAT: react-router
import { useAuth } from '@/auth/AuthProvider'
import SignUp from '@/pages/SignUp'
// import UsernamePrompt from '@/pages/UsernamePrompt'

export default function Gate() {
    const { user, profile, loading } = useAuth()
    if (loading) return <div>Loading...</div>
    if (!user) return <SignUp />
    //   if (!profile) return <UsernamePrompt />
    return <Outlet />
}
