// src/pages/rooms/RoomPage.tsx
import { useMemo } from 'react'
import { useParams } from 'react-router'
import { useRoomByCode } from '@/hooks/useRoom'
import { useRoomPresence } from '@/hooks/useRoomPresence'

export default function RoomPage() {
    const { code } = useParams<{ code: string }>()
    const { room, loading, error } = useRoomByCode(code)
    const roomId = room?.id
    const { onlineIds, onlineCount } = useRoomPresence(roomId)

    const title = useMemo(
        () => (room ? `Oda ${room.code}` : code ? `Oda ${code}` : 'Oda'),
        [room, code]
    )

    if (loading) return <div>Oda yükleniyor…</div>
    if (error) return <div style={{ color: 'tomato' }}>Hata: {error}</div>
    if (!room) return <div>Oda bulunamadı.</div>

    return (
        <div style={{ display: 'grid', gap: 12 }}>
            <h1>{title}</h1>

            <div>
                <b>Tur süresi:</b> {room.round_second}s &nbsp; | &nbsp;
                <b>Pas limiti:</b> {room.pass_limit}
            </div>

            <div>
                <b>Kategori:</b> {room.category_id}
            </div>

            <div>
                <b>Aktif takım:</b> {room.active_team ?? '—'}
            </div>

            <div>
                <b>Online oyuncular:</b> {onlineCount} &nbsp;
                <small>({onlineIds.map((id) => id.slice(0, 6)).join(', ')})</small>
            </div>

            {/* Buraya oyun UI’nı (kart, timer vs.) bağlayacağız */}
        </div>
    )
}
