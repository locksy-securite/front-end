import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../layouts/DashboardLayout';

export default function RequireAuth() {
    const { initializing, isAuthenticated, user, logout } = useAuth();
    const location = useLocation();

    if (initializing) {
        // Loader simple
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading loading-ring"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Rend le layout qui contient l'Outlet pour les routes enfant
    return (
        <DashboardLayout email={user} onLogout={logout}>
            <Outlet />
        </DashboardLayout>
    );
}
