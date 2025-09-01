import { useAuth } from "@/auth/AuthProvider"
import { Room, SignIn } from "@/pages"

export default function Gate() {
    const { user } = useAuth()
    return (
        !user ? <SignIn /> : <Room />
    )
}