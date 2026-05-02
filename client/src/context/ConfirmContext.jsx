import { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
        variant: 'danger', // 'danger' | 'primary' | 'warning'
    });

    const confirmAction = useCallback(({ title, message, onConfirm, onCancel, variant = 'danger' }) => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            onConfirm,
            onCancel,
            variant,
        });
    }, []);

    const closeConfirm = useCallback(() => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleConfirm = useCallback(() => {
        if (confirmState.onConfirm) confirmState.onConfirm();
        closeConfirm();
    }, [confirmState, closeConfirm]);

    const handleCancel = useCallback(() => {
        if (confirmState.onCancel) confirmState.onCancel();
        closeConfirm();
    }, [confirmState, closeConfirm]);

    return (
        <ConfirmContext.Provider value={{ confirmAction }}>
            {children}
            {confirmState.isOpen && (
                <div className="floating-confirm-container">
                    <div className={`floating-confirm floating-confirm--${confirmState.variant}`}>
                        <div className="floating-confirm__header">
                            <span className="floating-confirm__title">{confirmState.title}</span>
                            <button className="floating-confirm__close" onClick={handleCancel}>✕</button>
                        </div>
                        <div className="floating-confirm__body">
                            <p>{confirmState.message}</p>
                        </div>
                        <div className="floating-confirm__footer">
                            <button className="floating-confirm__btn floating-confirm__btn--cancel" onClick={handleCancel}>
                                Cancel
                            </button>
                            <button 
                                className={`floating-confirm__btn floating-confirm__btn--${confirmState.variant}`} 
                                onClick={handleConfirm}
                            >
                                Confirm
                            </button>
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
