import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useCrypto } from '../hooks/useCrypto';
import { AuthContext } from './authContext.js';

// file d’attente pour les requêtes pendant un refresh
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
    refreshQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    refreshQueue = [];
};

export function AuthProvider({ children }) {
    const { addToast } = useToast();
    const crypto = useCrypto();
    const [accessToken, setAccessToken] = useState(null); // en mémoire
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    // interceptor requêtes : ajoute Authorization depuis la mémoire
    useEffect(() => {
        const reqInterceptor = api.interceptors.request.use(
            (config) => {
                if (accessToken && config.headers) {
                    config.headers.Authorization = `Bearer ${accessToken}`;
                }
                return config;
            },
            (err) => Promise.reject(err)
        );

        const resInterceptor = api.interceptors.response.use(
            (res) => res,
            async (err) => {
                const originalRequest = err.config;
                // gérer uniquement les 401 hors refresh/login/logout
                if (
                    err.response &&
                    err.response.status === 401 &&
                    !originalRequest._retry &&
                    !originalRequest.url?.includes('/auth/refresh') &&
                    !originalRequest.url?.includes('/auth/login')
                ) {
                    if (isRefreshing) {
                        // mettre en file d’attente jusqu’à la fin du refresh
                        return new Promise((resolve, reject) => {
                            refreshQueue.push({
                                resolve: (token) => {
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
                        const newToken = data?.accessToken;
                        setAccessToken(newToken || null);
                        processQueue(null, newToken);
                        isRefreshing = false;
                        // relancer la requête avec le nouveau token
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return api(originalRequest);
                    } catch (refreshErr) {
                        isRefreshing = false;
                        processQueue(refreshErr, null);
                        // dernier recours : vider la session côté client
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

        return () => {
            api.interceptors.request.eject(reqInterceptor);
            api.interceptors.response.eject(resInterceptor);
        };
    }, [accessToken, addToast, crypto]);

    // au montage : tentative de refresh silencieux pour restaurer la session
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await api.post('/auth/refresh'); // utilise le cookie
                if (!mounted) return;
                if (data?.accessToken) {
                    setAccessToken(data.accessToken);
                    // optionnel : le serveur peut renvoyer l’utilisateur
                    if (data.user) setUser(data.user);
                }
            } catch {
                // pas de refresh possible -> reste déconnecté
            } finally {
                if (mounted) setInitializing(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const login = useCallback(async (loginPayload) => {
        // loginPayload construit par LoginForm
        const res = await api.post('/auth/login', loginPayload);
        // serveur doit poser le cookie refresh et renvoyer accessToken + user
        const token = res.data?.accessToken;
        setAccessToken(token || null);
        setUser(res.data?.user || null);
        return res.data;
    }, []);

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
