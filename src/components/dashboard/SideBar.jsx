import { Link, useLocation } from 'react-router-dom';

export default function SideBar() {
    const location = useLocation();

    return (
        <div className="drawer flex flex-col lg:drawer-open">
            {/* Toggle pour mobile */}
            <input
                id="dashboard-drawer"
                type="checkbox"
                className="drawer-toggle"
            />
            <div className="drawer-content lg:hidden">
                {/* Bouton pour ouvrir le drawer sur mobile */}
                <label
                    htmlFor="dashboard-drawer"
                    className="btn btn-square btn-secondary drawer-button lg:hidden"
                    aria-label="Ouvrir le menu de navigation"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-4 h-4"
                        fill="currentColor"
                    >
                        <path d="M0,3.5c0-.83,.67-1.5,1.5-1.5H17.5c.83,0,1.5,.67,1.5,1.5s-.67,1.5-1.5,1.5H1.5c-.83,0-1.5-.67-1.5-1.5Zm17.5,14.5H1.5c-.83,0-1.5,.67-1.5,1.5s.67,1.5,1.5,1.5H17.5c.83,0,1.5-.67,1.5-1.5s-.67-1.5-1.5-1.5Zm5-8H6.5c-.83,0-1.5,.67-1.5,1.5s.67,1.5,1.5,1.5H22.5c.83,0,1.5-.67,1.5-1.5s-.67-1.5-1.5-1.5Z" />
                    </svg>
                </label>
            </div>

            {/* Sidebar */}
            <div className="drawer-side lg:w-full">
                <label
                    htmlFor="dashboard-drawer"
                    aria-label="Fermer le menu de navigation"
                    className="drawer-overlay"
                ></label>
                <ul className="menu bg-base-100 w-auto lg:w-full p-1 m-6 lg:m-0 rounded-2xl space-y-1 shadow-sm">
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
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-5 h-5"
                                fill="currentColor"
                            >
                                <path d="M7.505,24A7.5,7.5,0,0,1,5.469,9.283,7.368,7.368,0,0,1,9.35,9.235l7.908-7.906A4.5,4.5,0,0,1,20.464,0h0A3.539,3.539,0,0,1,24,3.536a4.508,4.508,0,0,1-1.328,3.207L22,7.415A2.014,2.014,0,0,1,20.586,8H19V9a2,2,0,0,1-2,2H16v1.586A1.986,1.986,0,0,1,15.414,14l-.65.65a7.334,7.334,0,0,1-.047,3.88,7.529,7.529,0,0,1-6.428,5.429A7.654,7.654,0,0,1,7.505,24Zm0-13a5.5,5.5,0,1,0,5.289,6.99,5.4,5.4,0,0,0-.1-3.3,1,1,0,0,1,.238-1.035L14,12.586V11a2,2,0,0,1,2-2h1V8a2,2,0,0,1,2-2h1.586l.672-.672A2.519,2.519,0,0,0,22,3.536,1.537,1.537,0,0,0,20.465,2a2.52,2.52,0,0,0-1.793.743l-8.331,8.33a1,1,0,0,1-1.036.237A5.462,5.462,0,0,0,7.5,11ZM5,18a1,1,0,1,0,1-1A1,1,0,0,0,5,18Z" />
                            </svg>
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
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-5 h-5"
                                fill="currentColor"
                            >
                                <path d="M12,2a10.032,10.032,0,0,1,7.122,3H16a1,1,0,0,0-1,1h0a1,1,0,0,0,1,1h4.143A1.858,1.858,0,0,0,22,5.143V1a1,1,0,0,0-1-1h0a1,1,0,0,0-1,1V3.078A11.981,11.981,0,0,0,.05,10.9a1.007,1.007,0,0,0,1,1.1h0a.982.982,0,0,0,.989-.878A10.014,10.014,0,0,1,12,2Z" />
                                <path d="M22.951,12a.982.982,0,0,0-.989.878A9.986,9.986,0,0,1,4.878,19H8a1,1,0,0,0,1-1H9a1,1,0,0,0-1-1H3.857A1.856,1.856,0,0,0,2,18.857V23a1,1,0,0,0,1,1H3a1,1,0,0,0,1-1V20.922A11.981,11.981,0,0,0,23.95,13.1a1.007,1.007,0,0,0-1-1.1Z" />
                            </svg>
                            <span>Générateur</span>
                        </Link>
                    </li>
                </ul>
            </div>
        </div>
    );
}
