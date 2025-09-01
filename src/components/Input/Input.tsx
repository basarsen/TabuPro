import styles from './Input.module.scss'
import clsx from 'clsx'

import React, {
    forwardRef,
    useImperativeHandle,
    useRef,
    type InputHTMLAttributes,
} from 'react'

export type InputTextProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string
    helpText?: string
    error?: string
    onClear?: () => void
    contanainerClassName?: string
}

export type InputTextRef = {
    focus: () => void
    select: () => void
    input: HTMLInputElement | null
}

const Input = forwardRef<InputTextRef, InputTextProps>(function InputText(
    {
        label,
        helpText,
        error,
        onClear,
        onChange,
        id,
        value,
        defaultValue,
        required = true,
        contanainerClassName,
        ...rest
    },
    ref
) {
    const inputRef = useRef<HTMLInputElement>(null)
    useImperativeHandle(
        ref,
        () => ({
            focus: () => inputRef.current?.focus(),
            select: () => inputRef.current?.select(),
            input: inputRef.current,
        }),
        []
    )

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e)

    return (
        <div className={clsx(styles.formControl, contanainerClassName)}>
            <input
                ref={inputRef}
                className={styles.input}
                value={value as any}
                defaultValue={defaultValue}
                onChange={handleChange}
                required={required}
                {...rest}
            />
            {label &&
                <label className={clsx(styles.label, 'animated')}>
                    {label}
                </label>
            }
        </div>
    )
})

export default Input
