import { useState } from 'react'
import { useNavigate } from 'react-router'

export default function JoinRoomByCode() {
    const [code, setCode] = useState('')
    const navigate = useNavigate()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = code.trim().toUpperCase()
        navigate(`/room/${trimmed}`)
    }

    return (
        <form onSubmit={handleSubmit}>
            <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6 haneli kod"
                maxLength={6}
            />
            <button type="submit">Odaya Git</button>
        </form>
    )
}
