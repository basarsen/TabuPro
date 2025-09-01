// src/components/room/TurnTimer.tsx
import { useTurnTimer } from '@/hooks/useTurnTimer'

type TurnTimerProps = {
    startsAt?: string | null
    endsAt?: string | null
}

export default function TurnTimer({ startsAt, endsAt }: TurnTimerProps) {
    const { active, mmss, progress } = useTurnTimer(startsAt, endsAt)

    if (!active) {
        return <div style={styles.box}>Tur aktif değil</div>
    }

    return (
        <div style={styles.box}>
            <div style={styles.row}>
                <b>Kalan süre:</b> <span style={{ fontVariantNumeric: 'tabular-nums' }}>{mmss}</span>
            </div>
            <div style={styles.barWrap}>
                <div style={{ ...styles.barFill, transform: `scaleX(${progress})` }} />
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    box: {
        padding: 12,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    row: { display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 8 },
    barWrap: {
        width: '100%',
        height: 8,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 999,
        overflow: 'hidden',
        transform: 'translateZ(0)',
    },
    barFill: {
        height: '100%',
        background: 'rgba(76, 217, 100, 0.9)',
        transformOrigin: 'left center',
        transition: 'transform .2s linear',
    },
}
