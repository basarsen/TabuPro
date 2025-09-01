import { useState } from 'react'
import { useNavigate } from 'react-router'

export default function JoinRoomByCode() {
    const [code, setCode] = useState('')
    const navigate = useNavigate()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const cleaned = code.trim().toUpperCase()
        if (cleaned.length === 6) navigate(`/room/${cleaned}`)
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
            <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6 haneli kod"
                maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: 2 }}
            />
            <button type="submit">Odaya Git</button>
        </form>
    )
}
