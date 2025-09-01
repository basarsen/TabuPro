// src/api/roomActions.ts
import { supabase } from '@/lib/supabase'
import type { Room } from '@/types'

export async function startTurn(roomCode: string) {
    const { data, error } = await supabase.rpc('start_turn', { p_room_code: roomCode.toUpperCase() })
    return { data: (data as Room) ?? null, error: error?.message ?? null }
}

export async function finishTurn(roomCode: string) {
    const { data, error } = await supabase.rpc('finish_turn', { p_room_code: roomCode.toUpperCase() })
    return { data: (data as Room) ?? null, error: error?.message ?? null }
}

export async function passCard(roomCode: string) {
    const { data, error } = await supabase.rpc('pass_card', { p_room_code: roomCode.toUpperCase() })
    return { data: (data as Room) ?? null, error: error?.message ?? null }
}

export async function markCorrect(roomCode: string) {
    const { data, error } = await supabase.rpc('mark_correct', { p_room_code: roomCode.toUpperCase() })
    return { data: (data as Room) ?? null, error: error?.message ?? null }
}

export async function markTaboo(roomCode: string) {
    const { data, error } = await supabase.rpc('mark_taboo', { p_room_code: roomCode.toUpperCase() })
    return { data: (data as Room) ?? null, error: error?.message ?? null }
}
