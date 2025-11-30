import { Link } from 'react-router-dom';
import ThemeSelector from '../components/ThemeSelector';

export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col bg-base-200">
            <header className="navbar bg-base-100 shadow-xs p-3">
                <div className="flex-1 flex items-center space-x-3">
                    <Link to="/" className="flex items-center space-x-3">
                        <img
                            src="/logo_locksy.png"
                            alt="Locksy Logo"
                            className="w-8 h-8"
                        />
                        <span className="text-xl font-semibold">Locksy</span>
                    </Link>
                </div>
                <div className="flex">
                    <ThemeSelector />
                </div>
            </header>

            <main className="hero grow bg-base-200 p-12">
                <div className="hero-content container mx-auto max-w-5xl flex-col md:flex-row items-center justify-center gap-12">
                    {/* Colonne gauche */}
                    <div className="flex-1 text-center md:text-left space-y-6">
                        <h1 className="text-4xl font-bold">Accéder à Locksy</h1>

                        <p className="text-lg text-base-content/70">
                            Votre coffre-fort numérique pour protéger vos mots
                            de passe et données sensibles, accessible partout en
                            toute sécurité.
                        </p>

                        <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start">
                            <Link
                                to="/login"
                                className="btn btn-primary w-full md:w-auto"
                            >
                                Se connecter
                            </Link>
                            <Link
                                to="/register"
                                className="btn btn-secondary w-full md:w-auto"
                            >
                                S'inscrire
                            </Link>
                        </div>
                    </div>

                    {/* Colonne droite */}
                    <div className="hidden md:flex flex-1 justify-center">
                        <img
                            src="/coffre_fort.gif"
                            alt=""
                            className="rounded-xl max-w-md"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
