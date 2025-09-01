import { AuthProvider } from '@/auth/AuthProvider'
import { Gate } from './components'
import { ToastContainer } from 'react-toastify'

export default function App() {
  return (
    <AuthProvider>
      <Gate />
      <ToastContainer />
    </AuthProvider >
  )
}