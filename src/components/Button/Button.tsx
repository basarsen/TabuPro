import clsx from 'clsx';
import styles from './Button.module.scss'

type ButtonProps = {
    onClick?: () => void
    label: string
    icon?: string
    variant?: 'primary' | 'stroke'
    color?: 'blue' | 'green' | 'red' | 'orange' | 'gradient' | 'pink',
    fullWidth?: boolean
    shadow?: boolean
    disabled?: boolean
    className?: string
    size?: 'lg' | 'sm'
    type?: 'submit' | 'button'
}

export default function Button(
    {
        onClick,
        label,
        icon,
        variant = 'primary',
        color = 'blue',
        fullWidth = false,
        shadow = false,
        disabled = false,
        className,
        size = 'lg',
        type = 'submit'
    }: ButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={clsx(styles.btn, styles[variant], styles[size], styles[color], fullWidth && styles['full-width'], shadow && styles['shadow'], className)}>
            {
                icon &&
                <span className={clsx('material-symbols-outlined', styles.icon)}>
                    {icon}
                </span>
            }
            <span>{label}</span>
        </button>
    )
}
