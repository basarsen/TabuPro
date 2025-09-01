// src/components/room/StartTurnPopup.tsx
import { useMemo } from 'react'
import type { Room, Team, TeamPlayer, TeamColor } from '@/types'

type Props = {
    open: boolean
    room: Room
    currentUserId?: string | null   // ⬅️ eklendi
    onClose?: () => void
    onStart?: () => void
}

function resolveName(p?: TeamPlayer | null) {
    if (!p) return '—'
    return (p.username && p.username.trim().length) ? p.username : p.id.slice(0, 6)
}
const getTeam = (teams: Team[], color: TeamColor) => teams.find(t => t.color === color) ?? null
const otherTeam = (c: TeamColor) => (c === 'Kırmızı' ? 'Mavi' : 'Kırmızı')
function nextPlayer(team: Team | null, currentId?: string | null): TeamPlayer | null {
    if (!team || team.players.length === 0) return null
    if (!currentId) return team.players[0]
    const i = team.players.findIndex(p => p.id === currentId)
    return team.players[(i === -1 ? 0 : (i + 1) % team.players.length)]
}

export default function StartTurnPopup({ open, room, currentUserId, onClose, onStart }: Props) {
    const { nextTeamColor, nextExplainer, nextController, startAllowed } = useMemo(() => {
        const color: TeamColor = (room.active_team ?? 'Kırmızı') as TeamColor
        const explainerTeam = getTeam(room.teams, color)
        const controllerTeam = getTeam(room.teams, otherTeam(color))
        const nxtExpl = nextPlayer(explainerTeam, room.explainer_id)
        const nxtCtrl = nextPlayer(controllerTeam, room.controller_id)
        const allowed = !!currentUserId && (currentUserId === room.owner_id || currentUserId === nxtCtrl?.id)
        return { nextTeamColor: color, nextExplainer: nxtExpl, nextController: nxtCtrl, startAllowed: allowed }
    }, [room, currentUserId])

    if (!open) return null

    return (
        <div style={styles.backdrop} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ margin: '0 0 8px' }}>Sıradaki Tur</h2>
                <div style={{ marginBottom: 8 }}><b>Takım:</b> {nextTeamColor}</div>
                <div style={{ marginBottom: 4 }}><b>Anlatan:</b> {resolveName(nextExplainer)}</div>
                <div style={{ marginBottom: 8 }}><b>Kontrol:</b> {resolveName(nextController)}</div>

                {!startAllowed && (
                    <div style={{ fontSize: 12, opacity: .8, marginBottom: 8 }}>
                        Bu turu yalnızca oda sahibi veya sıradaki kontrol oyuncusu başlatabilir.
                    </div>
                )}

                <div style={{ display: 'grid', gap: 8 }}>
                    <button onClick={onStart} disabled={!startAllowed} style={styles.button}>Turu Başlat</button>
                    <button onClick={onClose} style={{ ...styles.button, opacity: .8 }}>Kapat</button>
                </div>
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 999 },
    modal: { background: '#1d1d1f', color: '#fff', minWidth: 320, maxWidth: 420, padding: 16, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,.35)' },
    button: { width: '100%', padding: '10px 12px', border: 'none', borderRadius: 8, cursor: 'pointer' },
}
