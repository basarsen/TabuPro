import { supabase } from '@/lib/supabase'
import type { Category } from '@/types'

export async function fetchCategories(): Promise<{
    data: Category[]
    error: string | null
}> {
    const { data, error } = await supabase
        .from('categories')
        .select('id,name')
        .order('name', { ascending: true })

    return {
        data: data ?? [],
        error: error?.message ?? null,
    }
}
