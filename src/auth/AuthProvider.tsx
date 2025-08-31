import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Profile = { id: string; username: string | null }

type AuthCtx = {
    user: User | null
    session: Session | null
    profile: Profile | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signUp: (email: string, password: string, username?: string) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    async function loadProfile(uid?: string | null) {
        if (!uid) { setProfile(null); return }
        const { data } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('id', uid)
            .single()
        if (data) setProfile(data as Profile)
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session ?? null)
            setUser(data.session?.user ?? null)
            supabase.realtime.setAuth(data.session?.access_token ?? '')
            setLoading(false)
            if (data.session?.user?.id) loadProfile(data.session.user.id)
        })

        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s)
            setUser(s?.user ?? null)
            supabase.realtime.setAuth(s?.access_token ?? '')
            if (s?.user?.id) loadProfile(s.user.id); else setProfile(null)
        })
        return () => sub.subscription.unsubscribe()
    }, [])

    const signIn: AuthCtx['signIn'] = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { error: error.message }
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
            options: { data: username ? { username } : undefined },
        })
        return { error: error?.message ?? null }
    }

    const signOut = async () => { await supabase.auth.signOut() }

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
