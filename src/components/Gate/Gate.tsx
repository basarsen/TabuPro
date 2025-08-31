import { useAuth } from "@/auth/AuthProvider"
import { Outlet } from "react-router"

export default function Gate() {
    const { user, loading } = useAuth()

    if (loading) return <div>Loading...</div>
    if (!user) return <div>Login or Sign up</div>
    return <Outlet />
}