import './App.css';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeProvider';
import { CryptoProvider } from './context/CryptoProvider.jsx'; // <-- ajout
import ThemeSelector from './components/ThemeSelector';

import RegisterPage from './pages/RegisterPage';

function App() {
    return (
        <ThemeProvider>
            <CryptoProvider>
                {' '}
                {/* <-- enveloppe CryptoProvider */}
                <BrowserRouter>
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <div className="flex flex-col items-center mt-10">
                                    <h1 className="text-3xl font-bold mb-4">
                                        Locksy
                                    </h1>
                                    <p className="text-base-content/70">
                                        Bienvenue sur Locksy. Utilisez le menu
                                        pour naviguer.
                                    </p>
                                    <ThemeSelector />
                                </div>
                            }
                        />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route
                            path="*"
                            element={
                                <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 space-y-6">
                                    <div className="alert alert-warning">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6 shrink-0 stroke-current"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                            />
                                        </svg>
                                        <h1 className="font-bold">
                                            404 - Page non trouvée
                                        </h1>
                                        <p>Cette page n'existe pas.</p>
                                    </div>
                                    <Link to="/" className="btn btn-primary">
                                        Retour à l'accueil
                                    </Link>
                                </div>
                            }
                        />
                    </Routes>
                </BrowserRouter>
            </CryptoProvider>
        </ThemeProvider>
    );
}

export default App;
