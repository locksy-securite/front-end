import Header from './Header';
import SideBar from './SideBar';
import { Outlet } from 'react-router-dom';

export default function Layout({ email, onLogout }) {
    return (
        <div className="flex flex-col h-screen bg-base-200">
            {/* Header en haut */}
            <Header email={email} onLogout={onLogout} />

            {/* Contenu principal avec sidebar + page */}
            <div className="flex flex-1 gap-1 p-1 lg:gap-6 lg:p-6 overflow-hidden">
                {/* Sidebar à gauche : full width sur mobile, 1/5 sur desktop */}
                <div className="w-auto lg:w-1/5">
                    <SideBar />
                </div>

                {/* Contenu de la page sélectionnée : prend l’espace restant */}
                <div className="flex-1 bg-base-100 rounded-xl overflow-y-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
