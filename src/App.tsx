import { AuthProvider } from '@/auth/AuthProvider'
import { Gate } from '@/components'

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
