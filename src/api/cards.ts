import { supabase } from '@/lib/supabase'
import type { Card } from '@/types'

export async function getCardById(id: string): Promise<{
    data: Card | null
    error: string | null
}> {
    const { data, error } = await supabase
        .from('cards')
        .select('id, word, taboo_words, category_id')
        .eq('id', id)
        .maybeSingle()

    return { data: (data as Card) ?? null, error: error?.message ?? null }
}
