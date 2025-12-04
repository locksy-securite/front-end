import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useCrypto } from '../hooks/useCrypto';
import { AuthContext } from './authContext.js';

// Variables globales pour gérer le refresh
let isRefreshing = false;
let refreshQueue = [];

/**
 * Vide la file d’attente des requêtes en attente de refresh.
 * Si une erreur est passée, toutes les promesses sont rejetées.
 * Sinon, elles sont résolues avec le nouveau token.
 */
const processQueue = (error, token = null) => {
    refreshQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    refreshQueue = [];
};

/**
 * Détecte si une URL correspond à une route d’authentification
 * (login ou refresh). Gère les URLs relatives et absolues.
 */
const isAuthRoute = (url) => {
    if (!url) return false;
    try {
        const u = new URL(url, api.defaults.baseURL);
        return (
            u.pathname.includes('/auth/refresh') ||
            u.pathname.includes('/auth/login')
        );
    } catch {
        return url.includes('/auth/refresh') || url.includes('/auth/login');
    }
};

export function AuthProvider({ children }) {
    const { addToast } = useToast();
    const crypto = useCrypto();

    const [accessToken, setAccessToken] = useState(null); // token en mémoire
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    // Interceptors Axios
    useEffect(() => {
        // Ajoute le token Authorization à chaque requête sortante
        const reqInterceptor = api.interceptors.request.use(
            (config) => {
                if (accessToken && config.headers) {
                    config.headers.Authorization = `Bearer ${accessToken}`;
                }
                return config;
            },
            (err) => Promise.reject(err)
        );

        // Gère les erreurs 401 et tente un refresh
        const resInterceptor = api.interceptors.response.use(
            (res) => res,
            async (err) => {
                const originalRequest = err?.config;
                if (!originalRequest) return Promise.reject(err);

                const is401 = err?.response?.status === 401;

                if (
                    is401 &&
                    !originalRequest._retry &&
                    !isAuthRoute(originalRequest.url)
                ) {
                    if (isRefreshing) {
                        // Mettre en file d’attente jusqu’à la fin du refresh
                        return new Promise((resolve, reject) => {
                            refreshQueue.push({
                                resolve: (token) => {
                                    originalRequest.headers =
                                        originalRequest.headers || {};
                                    originalRequest.headers.Authorization = `Bearer ${token}`;
                                    resolve(api(originalRequest));
                                },
                                reject,
                            });
                        });
                    }

                    originalRequest._retry = true;
                    isRefreshing = true;

                    try {
                        const { data } = await api.post('/auth/refresh'); // cookie envoyé automatiquement
                        const newToken = data?.accessToken || null;

                        setAccessToken(newToken);
                        processQueue(null, newToken);
                        isRefreshing = false;

                        // Relancer la requête avec le nouveau token
                        originalRequest.headers = originalRequest.headers || {};
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return api(originalRequest);
                    } catch (refreshErr) {
                        isRefreshing = false;
                        processQueue(refreshErr, null);

                        // Dernier recours : vider la session côté client
                        setAccessToken(null);
                        setUser(null);
                        crypto?.clearKeys?.();
                        addToast?.(
                            'error',
                            'Session expirée. Veuillez vous reconnecter.'
                        );

                        return Promise.reject(refreshErr);
                    }
                }

                return Promise.reject(err);
            }
        );

        // Nettoyage des interceptors au démontage
        return () => {
            api.interceptors.request.eject(reqInterceptor);
            api.interceptors.response.eject(resInterceptor);
        };
    }, [accessToken, addToast, crypto]);

    // Initialisation : tentative de refresh silencieux
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await api.post('/auth/refresh'); // utilise le cookie
                if (!mounted) return;

                if (data?.accessToken) {
                    setAccessToken(data.accessToken);
                    if (data.user) setUser(data.user); // optionnel
                }
            } catch {
                // Pas de refresh possible -> reste déconnecté
            } finally {
                if (mounted) setInitializing(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    // Actions
    const login = useCallback(
        async (loginPayload) => {
            try {
                const res = await api.post('/auth/login', loginPayload);
                const token = res.data?.accessToken || null;
                setAccessToken(token);
                setUser(res.data?.user || null);
                return res.data;
            } catch (err) {
                addToast?.('error', 'Échec de la connexion.');
                throw err;
            }
        },
        [addToast]
    );

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout'); // supprime le cookie côté serveur
        } catch {
            // ignorer les erreurs réseau pour logout
        } finally {
            setAccessToken(null);
            setUser(null);
            crypto?.clearKeys?.(); // important : vider la clé maître
            addToast?.('success', 'Déconnecté.');
        }
    }, [addToast, crypto]);

    // Valeurs exposées au contexte
    const value = {
        accessToken,
        setAccessToken, // rarement utilisé directement
        user,
        setUser,
        login,
        logout,
        initializing,
        isAuthenticated: !!accessToken,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export default AuthProvider;
