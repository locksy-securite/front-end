import { createContext, useState, useEffect } from 'react';
import ToastAlert from '../components/ToastAlert';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        if (toasts.length > 0) {
            const timers = toasts.map((t) =>
                setTimeout(() => {
                    setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }, 10000)
            );
            return () => timers.forEach(clearTimeout);
        }
    }, [toasts]);

    const addToast = (type, message) => {
        setToasts((prev) => [
            ...prev,
            { id: Date.now() + Math.random(), type, message },
        ]);
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed top-4 right-4 space-y-2 z-50">
                {toasts.map((t) => (
                    <ToastAlert key={t.id} type={t.type} message={t.message} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export { ToastContext };
