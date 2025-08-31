import './styles/global.scss'
import { createRoot } from 'react-dom/client'
import AppRoutes from './routes/AppRoutes'


createRoot(document.getElementById('root')!).render(
  <AppRoutes />
)
