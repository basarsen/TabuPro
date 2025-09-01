import type { ReactNode } from 'react'
import styles from './Modal.module.scss'
import clsx from 'clsx'

type ModalProps = {
    // isOpen: boolean
    // onClose: () => void
    title?: string
    children: ReactNode
};

export default function Modal({
    children,
    title
}: ModalProps) {
    return (
        <div className={styles.modal}>
            <div className={styles.modalBody}>
                <div className={styles.modalHeader}>
                    <h1>{title}</h1>
                    <span className={clsx(styles.modalBtnClose, 'animated', 'material-symbols-outlined')}>
                        close
                    </span>
                </div>
                <div className={styles.modalContent}>{children}</div>
            </div>
        </div>
    )
}
