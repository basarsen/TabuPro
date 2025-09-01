import { supabase } from '@/lib/supabase'

export async function usernameAvailable(username: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('username_available', { p_username: username })
    if (error) throw error
    return Boolean(data)
}

export async function createProfile(username: string) {
    const { data, error } = await supabase.rpc('create_profile', { p_username: username })
    if (error) throw error
    return data
}

export async function getMyProfileExists(userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', userId)

    if (error) throw error
    return (data === null) ? false : true
}