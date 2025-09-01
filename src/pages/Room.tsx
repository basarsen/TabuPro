import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useRoomByCode } from '@/hooks/useRoom'
import StartTurnPopup from '@/components/room/StartTurnPopup'
import TurnTimer from '@/components/room/TurnTimer'
import { startTurn, finishTurn, passCard, markCorrect, markTaboo } from '@/api/roomActions'
import { useTurnTimer } from '@/hooks/useTurnTimer'
import { Card } from '@/components'
import { useAuth } from '@/auth/AuthProvider'
import { joinRoom, leaveRoom } from '@/api/room'

export default function RoomPage() {
    const { code } = useParams<{ code: string }>()
    const { room, loading, error } = useRoomByCode(code)

    useEffect(() => {
        if (room?.id)
            joinRoom(room.id)
    }, [room?.id])

    const { user, profile, signOut } = useAuth()

    const [showStartPopup, setShowStartPopup] = useState(false)
    const [busy, setBusy] = useState<'start' | 'pass' | 'correct' | 'taboo' | null>(null)
    const [errText, setErrText] = useState<string | null>(null)

    const isTurnActive = useMemo(
        () => !!room?.starts_at && !!room?.ends_at,
        [room?.starts_at, room?.ends_at]
    )
    const hasCard = !!room?.current_card_id
    const canPass = isTurnActive && hasCard && (room!.passes_used < room!.pass_limit)

    useTurnTimer(room?.starts_at, room?.ends_at, 250, async () => {
        if (!code) return
        const { error } = await finishTurn(code)
        if (error) {
            setErrText(error)
        }
    })

    if (loading) return <div>Oda yükleniyor…</div>
    if (error) return <div style={{ color: 'tomato' }}>Hata: {error}</div>
    if (!room || !code) return <div>Oda bulunamadı.</div>

    async function run(action: 'start' | 'pass' | 'correct' | 'taboo') {
        if (busy) return
        setBusy(action); setErrText(null)
        try {
            let res
            if (action === 'start') res = await startTurn(code as string)
            if (action === 'pass') res = await passCard(code as string)
            if (action === 'correct') res = await markCorrect(code as string)
            if (action === 'taboo') res = await markTaboo(code as string)
            if (res?.error) setErrText(res.error)
            if (action === 'start' && !res?.error) setShowStartPopup(false)
        } finally {
            setBusy(null)
        }
    }

    return (
        <div style={{ display: 'grid', gap: 12 }}>
            <h1>Oda {room.code}</h1>
            <button onClick={() => leaveRoom(room.id)}>Ayrıl</button>

            <TurnTimer startsAt={room.starts_at} endsAt={room.ends_at} />

            <Card room={room} />
            <button onClick={signOut}>ÇıkHesap</button>

            <div>
                <b>Skor:</b>{' '}
                {room.teams.map(t => `${t.color}: ${t.score ?? 0}`).join(' | ')}
            </div>

            <div>
                <b>Pas:</b> {room.passes_used} / {room.pass_limit}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <button onClick={() => setShowStartPopup(true)} disabled={busy !== null || isTurnActive}>Turu Başlat</button>

                <span style={{ width: 12 }} />

                <button onClick={() => run('pass')} disabled={busy !== null || !canPass}>Pas Geç</button>
                <button onClick={() => run('taboo')} disabled={busy !== null || !isTurnActive || !hasCard}>Tabu</button>
                <button onClick={() => run('correct')} disabled={busy !== null || !isTurnActive || !hasCard}>Doğru</button>
            </div>

            {JSON.stringify(room.rooms_teams_with_usernames)}

            {errText && <div style={{ color: 'tomato' }}>Hata: {errText}</div>}

            <StartTurnPopup
                open={showStartPopup}
                room={room}
                onClose={() => setShowStartPopup(false)}
                onStart={() => run('start')}
                currentUserId={user?.id}
            />
        </div>
    )
}
