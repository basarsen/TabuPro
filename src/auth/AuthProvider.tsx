import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase';

type Profile = { id: string; username: string | null }

type AuthCtx = {
    loading: boolean
    user: User | null
    session: Session | null
    profile: Profile | null
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signUp: (email: string, password: string, username?: string) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
    loadProfile: (uid: string | null) => Promise<{ error: string | null }>
    upsertProfile: (username: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthCtx>({
    loading: true,
    user: null,
    session: null,
    profile: null,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => { },
    loadProfile: async () => ({ error: null }),
    upsertProfile: async () => ({ error: null })
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session ?? null)
            setUser(data.session?.user ?? null)
            supabase.realtime.setAuth(data.session?.access_token ?? '')
            setLoading(false)
            if (data.session?.user?.id)
                loadProfile(data.session.user.id)
        })

        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s)
            setUser(s?.user ?? null)
            supabase.realtime.setAuth(s?.access_token ?? '')
            if (s?.user?.id)
                loadProfile(s.user.id);
            else
                setProfile(null)
        })
        return () => sub.subscription.unsubscribe()
    }, [])

    const signIn: AuthCtx['signIn'] = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error)
            return { error: error.message }

        setSession(data.session)
        setUser(data.user)

        supabase.realtime.setAuth(data.session?.access_token ?? '')
        await loadProfile(data.user.id)
        return { error: null }
    }

    const signUp: AuthCtx['signUp'] = async (email, password, username) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: username ? { username } : undefined }
        })
        return { error: error?.message ?? null }
    }

    const signOut = async () => { await supabase.auth.signOut() }

    const loadProfile: AuthCtx['loadProfile'] = async (uid: string | null) => {
        if (!uid) {
            setProfile(null);
            return { error: null }
        }
        const { data } = await supabase
            .from('profiles')
            .select('id:user_id, username')
            .eq('user_id', uid)
            .single()

        if (data)
            setProfile((data ?? null) as Profile | null)

        return { error: null }
    }

    const upsertProfile: AuthCtx['upsertProfile'] = async (username) => {
        if (!user?.id) return { error: 'Oturum bulunamadı.' }
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({ user_id: user.id, username }, { onConflict: 'user_id' })
            if (error) return { error: error.message }
            await loadProfile(user.id)
            return { error: null }
        } catch (e: any) {
            return { error: e?.message ?? 'Profil kaydedilemedi.' }
        }
    }

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, loadProfile, upsertProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
