// src/components/room/create/CreateRoomForm.tsx
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { fetchCategories } from '@/api/categories'
import { createRoom } from '@/api/room'
import type { Category } from '@/types'
import type { TeamColor } from '@/types'

type Props = {
    defaultRoundSecond?: number
    defaultPassLimit?: number
    onCreated?: (roomCode: string, roomId: string) => void
}

export default function CreateRoomForm({
    defaultRoundSecond = 90,
    defaultPassLimit = 3,
    onCreated,
}: Props) {
    const { user, profile } = useAuth()
    const [categories, setCategories] = useState<Category[]>([])
    const [loadingCats, setLoadingCats] = useState(true)
    const [err, setErr] = useState<string | null>(null)

    const [roundSecond, setRoundSecond] = useState(defaultRoundSecond)
    const [passLimit, setPassLimit] = useState(defaultPassLimit)
    const [categoryId, setCategoryId] = useState<string>('')
    const [streamUrl, setStreamUrl] = useState<string>('')

    // YENİ: takım tercihi
    const [preferredTeam, setPreferredTeam] = useState<TeamColor>('Kırmızı')

    useEffect(() => {
        ; (async () => {
            const { data, error } = await fetchCategories()
            if (error) setErr(error)
            else setCategories(data)
            setLoadingCats(false)
        })()
    }, [])

    const canSubmit = useMemo(
        () =>
            !!user?.id &&
            roundSecond > 0 &&
            passLimit >= 0 &&
            categoryId.length > 0 &&
            !loadingCats,
        [user?.id, roundSecond, passLimit, categoryId, loadingCats]
    )

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!user?.id) {
            setErr('Oturum bulunamadı.')
            return
        }
        const { data, error } = await createRoom(user.id, {
            round_second: roundSecond,
            pass_limit: passLimit,
            category_id: categoryId,
            stream_url: streamUrl.trim() || null,
            preferred_team: preferredTeam,                 // <— YENİ
            owner_username: profile?.username ?? null,     // <— YENİ
        })
        if (error) {
            setErr(error)
            return
        }
        if (data) onCreated?.(data.code, data.id)
    }

    if (loadingCats) return <div>Kategoriler yükleniyor…</div>
    if (err) return <div style={{ color: 'tomato' }}>Hata: {err}</div>

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
                    {' '}Kırmızı
                </label>
                <label>
                    <input
                        type="radio"
                        name="prefTeam"
                        value="Mavi"
                        checked={preferredTeam === 'Mavi'}
                        onChange={() => setPreferredTeam('Mavi')}
                    />
                    {' '}Mavi
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

            <button type="submit" disabled={!canSubmit}>
                Oda Oluştur
            </button>
        </form>
    )
}
