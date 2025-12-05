import LoginForm from '../components/LoginForm';
import { useToast } from '../hooks/useToast';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
    const { addToast } = useToast();
    const { isAuthenticated, initializing } = useAuth();

    // Si on restaure la session, afficher un loader léger pour éviter le flash
    if (initializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-200">
                <div className="loading loading-ring"></div>
            </div>
        );
    }

    // Si déjà connecté, rediriger vers le dashboard
    if (isAuthenticated) {
        return <Navigate to="/dashboard/passwords" replace />;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 space-y-12 p-6">
            {/* Logo Locksy */}
            <Link
                to="/"
                className="flex flex-col items-center justify-center space-y-3"
            >
                <img
                    src="/logo_locksy.png"
                    alt="Locksy Logo"
                    className="w-12 h-12"
                />
                <h1 className="text-3xl font-semibold text-center">Locksy</h1>
            </Link>

            {/* Formulaire de connexion */}
            <LoginForm onToast={addToast} />

            {/* Texte de bas de formulaire */}
            <p className="text-sm text-base-content/70">
                Pas de compte ?{' '}
                <Link
                    to="/register"
                    className="link link-primary underline-offset-4"
                >
                    S'inscrire
                </Link>
            </p>
        </div>
    );
}
