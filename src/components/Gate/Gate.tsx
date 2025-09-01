// src/auth/Gate.tsx
import { Outlet } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import SignUp from '@/pages/SignUp'
import { SignIn } from '@/pages'

export default function Gate() {
    const { user, profile, loading } = useAuth()


    // Oturum yoksa: kayıt/giriş ekranı
    if (!user) return <SignIn />

    // Oturum var ama profil yoksa: kullanıcı adını oluşturma akışı
    //   if (!profile) return <UsernamePrompt />

    // Her şey hazır: korunan rotaları aç
    return <Outlet />
}
