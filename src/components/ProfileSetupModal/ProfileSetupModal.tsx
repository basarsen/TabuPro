// src/components/ProfilePrompt.tsx
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'

export default function ProfileSetupModal() {
    const { user, profile, upsertProfile } = useAuth()
    const shouldAsk = useMemo(
        () => !!user && !profile,
        [user, profile]
    )
    const [open, setOpen] = useState(false)
    const [username, setUsername] = useState('')

    useEffect(() => {
        setOpen(shouldAsk)
    }, [shouldAsk])

    if (!open) return null

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const { error } = await upsertProfile(username.trim())
        if (error) {
            alert(error)
            return
        }
        setOpen(false)
    }

    // Basit bir modal; tasarımını istediğin gibi güzelleştir
    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <h3>Kullanıcı adını belirle</h3>
                <p>Oyunda görünecek ismini yaz.</p>
                <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
                    <input
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Örn. Basar"
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setOpen(false)}>Vazgeç</button>
                        <button type="submit">Kaydet</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
    display: 'grid', placeItems: 'center', zIndex: 9999
}
const modalStyle: React.CSSProperties = {
    width: 420, maxWidth: '90vw', background: '#fff', borderRadius: 12,
    padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,.2)'
}
