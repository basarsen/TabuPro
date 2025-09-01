import { Outlet } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import SignUp from '@/pages/SignUp'
import { SignIn } from '@/pages'
// import UsernamePrompt from '@/pages/UsernamePrompt'

export default function Gate() {
    const { user, loading } = useAuth()
    if (loading) return <div>Loading...</div>
    if (!user) return <SignIn />
    //   if (!profile) return <UsernamePrompt />
    return <Outlet />
}
