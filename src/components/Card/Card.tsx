import { useEffect, useState } from 'react'
import { getCardById } from '@/api/cards'
import type { Card, Room } from '@/types'

type CardProps = {
    room: Room
}

export default function CurrentCard({ room }: CardProps) {
    const [card, setCard] = useState<Card | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        load()
    }, [room.current_card_id])

    const load = async () => {
        if (!room.current_card_id) {
            setCard(null)
            return
        }
        setLoading(true)
        const { data } = await getCardById(room.current_card_id)
        setCard(data)
        setLoading(false)
    }

    return (
        <>
            {loading && <div>Yükleniyor…</div>}
            {card && (
                <>
                    <div>{card.word}</div>
                    <ul>
                        {card.taboo_words.map((tw, i) => <li key={i}>{tw}</li>)}
                    </ul>
                </>
            )}
        </>
    )
}