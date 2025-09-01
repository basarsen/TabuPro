import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getRoomByCode } from '@/api/room'
import type { Room } from '@/types'

export function useRoomByCode(code?: string) {
    const [room, setRoom] = useState<Room | null>(null)
    const [loading, setLoading] = useState<boolean>(!!code)
    const [error, setError] = useState<string | null>(null)
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    useEffect(() => {
        if (!code) return
        let disposed = false;

        (async () => {
            setLoading(true)
            const { data, error } = await getRoomByCode(code)
            if (disposed) return
            if (error) {
                setError(error)
                setLoading(false)
                return
            }
            setRoom(data)
            setLoading(false)

            if (!data) return

            const ch = supabase
                .channel(`room-db-${data.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${data.id}` },
                    (payload) => {
                        if (payload.eventType === 'DELETE') {
                            setRoom(null)
                        } else if (payload.new) {
                            setRoom(payload.new as Room)
                        }
                    }
                )
                .subscribe()
            channelRef.current = ch
        })()

        return () => {
            disposed = true
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
            }
        }
    }, [code])

    return { room, loading, error }
}