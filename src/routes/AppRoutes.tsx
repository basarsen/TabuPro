// src/router.tsx
import { Gate } from '@/components'
import { Room } from '@/pages'
import CreateRoom from '@/pages/CreateRoom'
import { createBrowserRouter, Navigate } from 'react-router'

function NotFound() {
    return <div style={{ padding: 16 }}>Aradığınız sayfa bulunamadı.</div>
}

export const router = createBrowserRouter([
    {
        element: <Gate />,
        children: [
            { path: '/', element: <CreateRoom /> },
            { path: '/rooms/new', element: <CreateRoom /> },
            { path: '/room/new', element: <Navigate to="/rooms/new" replace /> },
            { path: '/room/:code', element: <Room /> },
        ],
    },
    { path: '*', element: <NotFound /> },
])
