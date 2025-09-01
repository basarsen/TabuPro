import { useAuth } from '@/auth/AuthProvider'
import { Button, Input, Modal } from '@/components'
import { useState } from 'react'
import { toast } from 'react-toastify'

export default function SignIn() {
    const { signIn } = useAuth()
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
            alert()

            const { error } = await signIn(email, password)
            if (error)
                toast.error('E-posta veya şifre hatalı')


        } catch (err: any) {
            toast.error(err?.message ?? 'Bir hata oluştu')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal title='Giriş yap'>
            <form onSubmit={onSubmit} className="gap gap-32">
                <Input
                    type="email"
                    value={email}
                    label='E-posta'
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    required
                />
                <Input
                    type="password"
                    value={password}
                    label='Parola'
                    onChange={(e) => setPassword(e.target.value)}
                    contanainerClassName='mb-16'
                    required
                />
                <Button
                    type="submit"
                    label={submitting ? 'Gönderiliyor…' : 'Giriş yap'}
                    disabled={submitting}
                    color='pink'
                />
                <div className='text-center'>Hesabın yok mu?</div>
                <Button
                    type='button'
                    label='Kayıt ol'
                    color='gradient'
                />
            </form>
        </Modal>
    )
}
