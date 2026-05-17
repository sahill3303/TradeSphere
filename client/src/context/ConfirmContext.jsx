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
                                Confirm
                            </button>
                            <button className="bottom-sheet__btn bottom-sheet__btn--cancel" onClick={handleCancel}>
                                Cancel
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
