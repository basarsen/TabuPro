import { supabase } from '@/lib/supabase'
import type { Room, Team, TeamPlayer, TeamColor } from '@/types'

export type CreateRoomInput = {
    round_second: number
    pass_limit: number
    category_id: string
    stream_url?: string | null
    preferred_team?: TeamColor
    owner_username?: string | null
}

export async function createRoom(
    ownerId: string,
    input: CreateRoomInput
): Promise<{ data: Room | null; error: string | null }> {
    const ownerPlayer: TeamPlayer = { id: ownerId, username: input.owner_username ?? null }

    const red: Team = { color: 'Kırmızı', players: [], score: 0 }
    const blue: Team = { color: 'Mavi', players: [], score: 0 }

    const preferred = input.preferred_team ?? 'Kırmızı'
    const target = preferred === 'Mavi' ? blue : red

    target.players = [ownerPlayer]

    const payload = {
        owner_id: ownerId,
        round_second: input.round_second,
        pass_limit: input.pass_limit,
        category_id: input.category_id,
        stream_url: input.stream_url ?? null,
        teams: [red, blue],
    }

    const { data, error } = await supabase
        .from('rooms')
        .insert(payload)
        .select('id, code, owner_id, stream_url, round_second, pass_limit, active_team, explainer_id, controller_id, current_card_id, used_card_ids, passes_used, teams, starts_at, ends_at, category_id, created_at, updated_at')
        .maybeSingle()

    return { data: (data as Room) ?? null, error: error?.message ?? null }
}

export async function getRoomByCode(code: string) {
    const { data, error } = await supabase
        .from('rooms')
        .select('id, code,rooms_teams_with_usernames, owner_id, stream_url, round_second, pass_limit, active_team, explainer_id, controller_id, current_card_id, used_card_ids, passes_used, teams, starts_at, ends_at, category_id, created_at, updated_at')
        .eq('code', code.toUpperCase())
        .maybeSingle()

    return { data: (data as Room) ?? null, error: error?.message ?? null }
}

export async function leaveRoom(roomId: string): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc('leave_room', { p_room_id: roomId })
    return { error: error?.message ?? null }
}

export async function joinRoom(roomId: string) {
    await supabase.rpc('join_room', { p_room_id: roomId, p_team: 'Kırmızı' })
}

