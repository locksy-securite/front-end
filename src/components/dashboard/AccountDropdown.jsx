export default function AccountDropdown({ email, onLogout }) {
    return (
        <div className="dropdown dropdown-end dropdown-hover">
            {/* Bouton rond avec icône compte */}
            <div
                tabIndex={0}
                role="button"
                aria-label="Menu compte utilisateur"
                className="btn btn-circle btn-secondary"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="currentColor"
                >
                    <path d="M12,12A6,6,0,1,0,6,6,6.006,6.006,0,0,0,12,12ZM12,2A4,4,0,1,1,8,6,4,4,0,0,1,12,2Z" />
                    <path d="M12,14a9.01,9.01,0,0,0-9,9,1,1,0,0,0,2,0,7,7,0,0,1,14,0,1,1,0,0,0,2,0A9.01,9.01,0,0,0,12,14Z" />
                </svg>
            </div>

            {/* Contenu du dropdown */}
            <div
                tabIndex={-1}
                className="dropdown-content bg-base-100 rounded-box z-10 w-56 shadow-sm"
            >
                {/* Bloc d'information non cliquable */}
                <div className="text-center border-b border-base-300 p-2">
                    <p className="text-sm text-base-content/70">
                        Connecté en tant que
                    </p>
                    <p className="truncate font-medium" title={email}>
                        {email}
                    </p>
                </div>

                {/* Menu interactif */}
                <ul className="menu w-full p-1" role="menu">
                    <li role="menuitem">
                        <button
                            onClick={onLogout}
                            className="text-error font-semibold"
                            aria-label="Se déconnecter"
                        >
                            Déconnexion
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    );
}
