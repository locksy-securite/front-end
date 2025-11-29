import { useState, useEffect } from 'react';
import RegisterForm from '../components/RegisterForm';
import ToastAlert from '../components/ToastAlert';

export default function RegisterPage() {
    const [toasts, setToasts] = useState([]);

    // Auto-dismiss chaque toast après 10s
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 space-y-12 p-6">
            {/* Logo Locksy */}
            <div className="flex flex-col items-center justify-center space-y-3">
                <img
                    src="/logo_locksy.png"
                    alt="Locksy Logo"
                    className="w-12 h-12"
                />
                <h1 className="text-3xl font-semibold text-center">Locksy</h1>
            </div>

            {/* Formulaire d'inscription */}
            <RegisterForm onToast={addToast} />

            {/* Pile de toasts */}
            {toasts.map((t) => (
                <ToastAlert key={t.id} type={t.type} message={t.message} />
            ))}
        </div>
    );
}
