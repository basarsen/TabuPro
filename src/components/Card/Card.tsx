import { useEffect, useState } from 'react'
import { getCardById } from '@/api/cards'
import type { Card, Room } from '@/types'

type CardProps = {
    room: Room
}

export default function CurrentCard({ room }: CardProps) {
    const [card, setCard] = useState<Card | null>(null)
    const [loading, setLoading] = useState(false)
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        async function load() {
            if (!room.current_card_id) {
                setCard(null)
                return
            }
            setLoading(true)
            const { data, error } = await getCardById(room.current_card_id)
            if (!cancelled) {
                if (error) setErr(error)
                setCard(data)
                setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [room.current_card_id])

    return (
        <div style={styles.wrap}>
            <div style={styles.header}><b>Kart</b></div>

            {loading && <div>Yükleniyor…</div>}
            {err && <div style={{ color: 'tomato' }}>Hata: {err}</div>}
            {!loading && !card && <div>Henüz kart yok. (Turu başlatın)</div>}

            {card && (
                <div style={styles.cardBox}>
                    <div style={styles.word}>{card.word}</div>
                    <ul style={styles.tabooList}>
                        {card.taboo_words.map((tw, i) => <li key={i}>{tw}</li>)}
                    </ul>
                </div>
            )}
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    wrap: { display: 'grid', gap: 8 },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    cardBox: {
        background: '#fff', color: '#111', borderRadius: 12, padding: 16,
        boxShadow: '0 8px 20px rgba(0,0,0,.15)',
    },
    word: { fontSize: 24, fontWeight: 800, marginBottom: 8 },
    tabooList: { listStyle: 'disc', paddingLeft: 18, margin: 0, display: 'grid', gap: 4 },
}
