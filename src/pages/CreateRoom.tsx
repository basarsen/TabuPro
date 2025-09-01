import { CreateRoomForm } from '@/components'
import { useNavigate } from 'react-router'

export default function CreateRoom() {
    const navigate = useNavigate()
    return (
        <div style={{ padding: 16 }}>
            <h1>Yeni Oda</h1>
            <CreateRoomForm onCreated={(code) => navigate(`/room/${code}`)} />
        </div>
    )
}
