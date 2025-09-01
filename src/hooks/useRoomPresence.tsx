import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'

export type PresenceState = {
    onlineIds: string[]
}

export function useRoomPresence(roomId?: string) {
    const { user } = useAuth()
    const [state, setState] = useState<PresenceState>({ onlineIds: [] })
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    useEffect(() => {
        if (!roomId) return
        const channel = supabase.channel(`room-presence-${roomId}`, {
            config: { presence: { key: user?.id || crypto.randomUUID() } }
        })

        const sync = () => {
            const raw = channel.presenceState()
            const ids = Object.keys(raw)
            setState({
                onlineIds: ids
            })
        }

        channel
            .on('presence', { event: 'sync' }, sync)
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    channel.track({
                        user_id: user?.id ?? null,
                        at: new Date().toISOString(),
                    })
                }
            })

        channelRef.current = channel
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
            }
        }
    }, [roomId, user?.id])

    const onlineCount = useMemo(() => state.onlineIds.length, [state.onlineIds])

    return { ...state, onlineCount }
}
