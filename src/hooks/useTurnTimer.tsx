import { useEffect, useMemo, useRef, useState } from 'react'

export type TurnTimerState = {
    active: boolean
    remainingMs: number
    remainingSec: number
    totalMs: number
    progress: number
    mmss: string
    onExpire?: () => void
}

export function useTurnTimer(
    startsAt?: string | null,
    endsAt?: string | null,
    tickMs = 250,
    onExpire?: () => void
): TurnTimerState {
    const startMs = useMemo(() => (startsAt ? new Date(startsAt).getTime() : NaN), [startsAt])
    const endMs = useMemo(() => (endsAt ? new Date(endsAt).getTime() : NaN), [endsAt])

    const [now, setNow] = useState<number>(() => Date.now())
    const timerRef = useRef<number | null>(null)
    const wasActiveRef = useRef<boolean>(false)
    const firedRef = useRef<boolean>(false)

    const active = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > now
    const totalMs = Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startMs) : 0
    const remainingMs = Number.isFinite(endMs) ? Math.max(0, endMs - now) : 0
    const remainingSec = Math.ceil(remainingMs / 1000)
    const progress = totalMs > 0 ? Math.min(1, Math.max(0, (totalMs - remainingMs) / totalMs)) : 0

    const mm = Math.floor(remainingSec / 60).toString().padStart(2, '0')
    const ss = Math.floor(remainingSec % 60).toString().padStart(2, '0')
    const mmss = `${mm}:${ss}`

    useEffect(() => {
        if (!Number.isFinite(endMs)) return
        if (endMs <= Date.now()) return

        timerRef.current = window.setInterval(() => setNow(Date.now()), tickMs)
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [endMs, tickMs])

    useEffect(() => {
        if (active) {
            wasActiveRef.current = true
            firedRef.current = false
            return
        }

        if (wasActiveRef.current && !active && !firedRef.current) {
            firedRef.current = true
            onExpire?.()
        }
    }, [active, onExpire])

    return { active, remainingMs, remainingSec, totalMs, progress, mmss }
}
