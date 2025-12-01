import { Link } from 'react-router-dom';
import ThemeSelector from '../ThemeSelector';
import AccountDropdown from './AccountDropdown';

export default function Header({ email, onLogout }) {
    return (
        <header className="navbar bg-base-200 shadow-xs p-2 px-4">
            {/* Logo Locksy */}
            <div className="flex-1 flex items-center space-x-3">
                <Link
                    to="/dashboard"
                    className="flex items-center space-x-3"
                    aria-label="Retour au tableau de bord Locksy"
                >
                    <img
                        src="/logo_locksy.png"
                        alt="Logo Locksy"
                        className="w-6 h-6"
                    />
                    <span className="text-lg font-semibold">Locksy</span>
                </Link>
            </div>

            {/* Actions à droite */}
            <div className="flex items-center space-x-2">
                <ThemeSelector />
                <AccountDropdown email={email} onLogout={onLogout} />
            </div>
        </header>
    );
}
