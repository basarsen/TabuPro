import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { RouterProvider } from 'react-router'
import { router } from './routes/AppRoutes.tsx'
import './styles/global.scss'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
)
