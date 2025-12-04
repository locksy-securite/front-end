import './App.css';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';

import { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from './context/ThemeProvider';
import { CryptoProvider } from './context/CryptoProvider.jsx';
import { ToastProvider } from './context/ToastProvider.jsx';
import AuthProvider from './context/AuthProvider.jsx';

import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PasswordsPage from './pages/dashboard/PasswordsPage.jsx';
import RequireAuth from './components/RequireAuth';

function App() {
    const queryClient = useMemo(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // réglages par défaut cohérents avec le code
                        refetchOnWindowFocus: true,
                        retry: 1,
                    },
                },
            }),
        []
    );

    return (
        <ThemeProvider>
            <CryptoProvider>
                <ToastProvider>
                    <AuthProvider>
                        <QueryClientProvider client={queryClient}>
                            <BrowserRouter>
                                <Routes>
                                    <Route path="/" element={<HomePage />} />
                                    <Route
                                        path="/register"
                                        element={<RegisterPage />}
                                    />
                                    <Route
                                        path="/login"
                                        element={<LoginPage />}
                                    />
                                    <Route
                                        path="/dashboard"
                                        element={
                                            <RequireAuth />
                                        }
                                    >
                                        <Route
                                            index
                                            element={
                                                <Navigate
                                                    to="passwords"
                                                    replace
                                                />
                                            }
                                        />
                                        <Route
                                            path="passwords"
                                            element={<PasswordsPage />}
                                        />
                                    </Route>
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
                                                    <p>
                                                        Cette page n'existe pas.
                                                    </p>
                                                </div>
                                                <Link
                                                    to="/"
                                                    className="btn btn-primary"
                                                >
                                                    Retour à l'accueil
                                                </Link>
                                            </div>
                                        }
                                    />
                                </Routes>
                            </BrowserRouter>
                        </QueryClientProvider>
                    </AuthProvider>
                </ToastProvider>
            </CryptoProvider>
        </ThemeProvider>
    );
}

export default App;
