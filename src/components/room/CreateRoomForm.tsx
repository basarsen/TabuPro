import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { fetchCategories } from '@/api/categories'
import { createRoom } from '@/api/room'
import type { Category } from '@/types'
import type { TeamColor } from '@/types'

type CreateRoomFormProps = {
    defaultRoundSecond?: number
    defaultPassLimit?: number
    onCreated: (roomCode: string, roomId: string) => void
}

export default function CreateRoomForm({
    defaultRoundSecond = 10,
    defaultPassLimit = 3,
    onCreated
}: CreateRoomFormProps) {
    const { user, profile } = useAuth()

    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [roundSecond, setRoundSecond] = useState(defaultRoundSecond)
    const [passLimit, setPassLimit] = useState(defaultPassLimit)
    const [categoryId, setCategoryId] = useState<string>('')
    const [streamUrl, setStreamUrl] = useState<string>('')
    const [preferredTeam, setPreferredTeam] = useState<TeamColor>('Kırmızı')

    useEffect(() => {
        load()
    }, [])

    const load = async () => {
        const { data } = await fetchCategories()
        setCategories(data)
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const { data } = await createRoom(user!.id, {
            round_second: roundSecond,
            pass_limit: passLimit,
            category_id: categoryId,
            stream_url: streamUrl.trim() || null,
            preferred_team: preferredTeam,
            owner_username: profile?.username ?? null
        })

        if (data) onCreated(data.code, data.id)
    }

    if (loading) return <div>Kategoriler yükleniyor…</div>

    return (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
            <label>
                Kategori
                <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                >
                    <option value="">Seçin…</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </label>

            <label>
                Tur süresi (saniye)
                <input
                    type="number"
                    min={10}
                    step={5}
                    value={roundSecond}
                    onChange={(e) => setRoundSecond(Number(e.target.value))}
                    required
                />
            </label>

            <label>
                Pas limiti
                <input
                    type="number"
                    min={0}
                    step={1}
                    value={passLimit}
                    onChange={(e) => setPassLimit(Number(e.target.value))}
                    required
                />
            </label>

            <fieldset style={{ border: 'none', padding: 0 }}>
                <legend>Takım tercihi</legend>
                <label style={{ marginRight: 12 }}>
                    <input
                        type="radio"
                        name="prefTeam"
                        value="Kırmızı"
                        checked={preferredTeam === 'Kırmızı'}
                        onChange={() => setPreferredTeam('Kırmızı')}
                    />
                    Kırmızı
                </label>
                <label>
                    <input
                        type="radio"
                        name="prefTeam"
                        value="Mavi"
                        checked={preferredTeam === 'Mavi'}
                        onChange={() => setPreferredTeam('Mavi')}
                    />
                    Mavi
                </label>
            </fieldset>

            <label>
                Yayın URL (opsiyonel)
                <input
                    type="url"
                    placeholder="https://…"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                />
            </label>

            <button type="submit">
                Oda Oluştur
            </button>
        </form>
    )
}
