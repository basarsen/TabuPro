// src/api/room.ts
import { supabase } from '@/lib/supabase'
import type { Room } from '@/types'

export type CreateRoomInput = {
    round_second: number
    pass_limit: number
    category_id: string
    stream_url?: string | null
}

/**
 * Oda oluşturur ve oluşturulan Room kaydını döner.
 * RLS gereği owner_id = auth.uid() olmalı; bu yüzden ownerId parametresi zorunlu.
 */
export async function createRoom(
    ownerId: string,
    input: CreateRoomInput
): Promise<{ data: Room | null; error: string | null }> {
    const payload = {
        owner_id: ownerId,
        round_second: input.round_second,
        pass_limit: input.pass_limit,
        category_id: input.category_id,
        stream_url: input.stream_url ?? null,
    }

    const { data, error } = await supabase
        .from('rooms')
        .insert(payload)
        .select(
            'id, code, owner_id, stream_url, round_second, pass_limit, active_team, explainer_id, controller_id, current_card_id, used_card_ids, passes_used, teams, starts_at, ends_at, category_id, created_at, updated_at'
        )
        .single()

    return { data: (data as Room) ?? null, error: error?.message ?? null }
}

export async function getRoomByCode(code: string): Promise<{
    data: Room | null
    error: string | null
}> {
    const { data, error } = await supabase
        .from('rooms')
        .select(
            'id, code, owner_id, stream_url, round_second, pass_limit, active_team, explainer_id, controller_id, current_card_id, used_card_ids, passes_used, teams, starts_at, ends_at, category_id, created_at, updated_at'
        )
        .eq('code', code.toUpperCase())
        .single()

    return { data: (data as Room) ?? null, error: error?.message ?? null }
}
