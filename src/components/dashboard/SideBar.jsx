import { Link, useLocation } from 'react-router-dom';

export default function SideBar() {
    const location = useLocation();

    return (
        <div className="drawer lg:drawer-open">
            {/* Toggle pour mobile */}
            <input
                id="dashboard-drawer"
                type="checkbox"
                className="drawer-toggle"
            />
            <div className="drawer-content">
                {/* Bouton pour ouvrir le drawer sur mobile */}
                <label
                    htmlFor="dashboard-drawer"
                    className="btn btn-secondary drawer-button lg:hidden m-1"
                    aria-label="Ouvrir le menu de navigation"
                >
                    <img src="/menu.svg" alt="Icône menu" className="w-4 h-4" />
                </label>
            </div>

            {/* Sidebar */}
            <div className="drawer-side">
                <label
                    htmlFor="dashboard-drawer"
                    aria-label="Fermer le menu de navigation"
                    className="drawer-overlay"
                ></label>
                <ul className="menu bg-base-100 w-72 p-1 m-1 rounded-2xl space-y-1">
                    {/* Lien Mots de passe */}
                    <li>
                        <Link
                            to="/dashboard/passwords"
                            className={`flex items-center gap-3 ${
                                location.pathname === '/dashboard/passwords'
                                    ? 'active font-semibold'
                                    : ''
                            }`}
                            aria-label="Accéder à la gestion des mots de passe"
                        >
                            <img
                                src="/mots_de_passe.svg"
                                alt="Icône mots de passe"
                                className="w-5 h-5"
                            />
                            <span>Mots de passe</span>
                        </Link>
                    </li>

                    {/* Lien Générateur de mots de passe */}
                    <li>
                        <Link
                            to="/dashboard/password-generator"
                            className={`flex items-center gap-3 ${
                                location.pathname ===
                                '/dashboard/password-generator'
                                    ? 'active font-semibold'
                                    : ''
                            }`}
                            aria-label="Accéder au générateur de mots de passe"
                        >
                            <img
                                src="/generateur_mots_de_passe.svg"
                                alt="Icône générateur de mots de passe"
                                className="w-5 h-5"
                            />
                            <span>Générateur</span>
                        </Link>
                    </li>
                </ul>
            </div>
        </div>
    );
}
