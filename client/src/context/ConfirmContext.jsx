import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
    const resolverRef = useRef(null);
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        variant: 'danger', // 'danger' | 'primary' | 'warning'
        alertOnly: false,
    });

    const confirmAction = useCallback(({ 
        title, 
        message, 
        onConfirm, 
        onCancel, 
        confirmLabel, 
        confirmText, 
        cancelLabel, 
        variant = 'danger', 
        alertOnly = false 
    }) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setConfirmState({
                isOpen: true,
                title,
                message,
                onConfirm,
                onCancel,
                confirmLabel: confirmLabel || confirmText || (alertOnly ? 'OK' : 'Confirm'),
                cancelLabel: cancelLabel || 'Cancel',
                variant,
                alertOnly
            });
        });
    }, []);

    const closeConfirm = useCallback(() => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleConfirm = useCallback(() => {
        if (confirmState.onConfirm) confirmState.onConfirm();
        if (resolverRef.current) {
            resolverRef.current(true);
            resolverRef.current = null;
        }
        closeConfirm();
    }, [confirmState, closeConfirm]);

    const handleCancel = useCallback(() => {
        if (confirmState.onCancel) confirmState.onCancel();
        if (resolverRef.current) {
            resolverRef.current(false);
            resolverRef.current = null;
        }
        closeConfirm();
    }, [confirmState, closeConfirm]);

    return (
        <ConfirmContext.Provider value={{ confirmAction }}>
            {children}
            {confirmState.isOpen && (
                <div className="bottom-sheet-overlay" onClick={handleCancel}>
                    <div className={`bottom-sheet bottom-sheet--${confirmState.variant}`} onClick={e => e.stopPropagation()}>
                        <div className="bottom-sheet__handle" />
                        <div className="bottom-sheet__header">
                            <span className="bottom-sheet__title">{confirmState.title}</span>
                        </div>
                        <div className="bottom-sheet__body">
                            <p>{confirmState.message}</p>
                        </div>
                        <div className="bottom-sheet__footer">
                            <button 
                                className={`bottom-sheet__btn bottom-sheet__btn--${confirmState.variant}`} 
                                onClick={handleConfirm}
                            >
                                {confirmState.confirmLabel}
                            </button>
                            {!confirmState.alertOnly && (
                                <button className="bottom-sheet__btn bottom-sheet__btn--cancel" onClick={handleCancel}>
                                    {confirmState.cancelLabel}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
    return context.confirmAction;
};
