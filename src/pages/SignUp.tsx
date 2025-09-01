import { useAuth } from '@/auth/AuthProvider'
import { useState } from 'react'
import { toast } from 'react-toastify'

export default function SignUp() {
    const { signUp } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) {
            toast.warn('Email ve parola zorunlu')
            return
        }

        setSubmitting(true)
        try {
            const data = await signUp(email, password)

        } catch (err: any) {
            toast.error(err?.message ?? 'Kayıt sırasında bir hata oluştu')
        } finally {
            setSubmitting(false)
        }
    }

    const canSubmit =
        email.trim().length > 3 &&
        password.trim().length >= 6 &&
        !submitting

    return (
        <div className="max-w-md mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-4">Kayıt ol</h1>

            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm mb-1">E-posta</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded border px-3 py-2 bg-transparent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Parola</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded border px-3 py-2 bg-transparent"
                        minLength={6}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full rounded px-4 py-2 font-medium border disabled:opacity-60"
                >
                    {submitting ? 'Gönderiliyor…' : 'Kayıt ol'}
                </button>
            </form>
        </div>
    )
}
