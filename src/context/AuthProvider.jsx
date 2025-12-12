import React, { useState, useEffect, useCallback, useRef } from 'react';
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
            u.pathname.includes('/auth/refresh-token') ||
            u.pathname.includes('/auth/login') ||
            u.pathname.includes('/auth/logout')
        );
    } catch {
        return (
            url.includes('/auth/refresh-token') ||
            url.includes('/auth/login') ||
            url.includes('/auth/logout')
        );
    }
};

export function AuthProvider({ children }) {
    const { addToast } = useToast();
    const crypto = useCrypto();

    const [accessToken, setAccessToken] = useState(null); // token en mémoire
    const [refreshToken, setRefreshToken] = useState(null); // refresh token en mémoire (rotation)
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    // refs pour éviter les closures obsolètes dans les interceptors
    const accessTokenRef = useRef(accessToken);
    const refreshTokenRef = useRef(refreshToken);

    // garder les refs synchronisées avec l'état
    useEffect(() => {
        accessTokenRef.current = accessToken;
    }, [accessToken]);

    useEffect(() => {
        refreshTokenRef.current = refreshToken;
    }, [refreshToken]);

    // Interceptors Axios — enregistrer UNE seule fois au montage
    useEffect(() => {
        // Ajoute le token Authorization à chaque requête sortante
        const reqInterceptor = api.interceptors.request.use(
            (config) => {
                const token = accessTokenRef.current;
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
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
                    const currentRefresh = refreshTokenRef.current;

                    // Si pas de refresh token en mémoire -> on déconnecte directement
                    if (!currentRefresh) {
                        // Pas de refresh possible côté client (refresh token non disponible)
                        setAccessToken(null);
                        setUser(null);
                        crypto?.clearKeys?.();
                        addToast?.(
                            'error',
                            'Session expirée. Veuillez vous reconnecter.'
                        );
                        return Promise.reject(err);
                    }

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
                        // On envoie le refreshToken dans le body (JSON)
                        // Backend: /auth/refresh-token renvoie { accessToken, refreshToken } (rotation)
                        const { data } = await api.post('/auth/refresh-token', {
                            refreshToken: currentRefresh,
                        });

                        const newToken = data?.accessToken || null;
                        const newRefreshToken = data?.refreshToken || null;

                        if (!newToken) {
                            throw new Error(
                                'No accessToken returned from /auth/refresh-token'
                            );
                        }

                        // Mettre à jour état ET refs (refs seront mis à jour par les effects d'état)
                        setAccessToken(newToken);
                        if (newRefreshToken) setRefreshToken(newRefreshToken);

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
                        setRefreshToken(null);
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

        // Cleanup au démontage
        return () => {
            api.interceptors.request.eject(reqInterceptor);
            api.interceptors.response.eject(resInterceptor);
        };
        // NOTA: [] — on veut installer les interceptors une seule fois au montage
    }, [addToast, crypto]);

    // Initialisation : tentative de refresh silencieux
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Dans la version originale le refresh utilisait un cookie
                // Ici, comme le refreshToken est en mémoire, on ne tente un refresh silencieux que si refreshToken est déjà présent.
                if (!refreshTokenRef.current) return;

                const { data } = await api.post('/auth/refresh-token', {
                    refreshToken: refreshTokenRef.current,
                });
                if (!mounted) return;

                if (data?.accessToken) {
                    setAccessToken(data.accessToken);
                    if (data.user) setUser(data.user); // optionnel
                    if (data?.refreshToken) setRefreshToken(data.refreshToken); // rotation
                }
            } catch {
                // Pas de refresh possible -> reste déconnecté
            } finally {
                if (mounted) setInitializing(false);
            }
        })();

        // Si on n'a pas tenté de refresh (pas de refreshToken), on met directement initializing=false
        if (!refreshTokenRef.current) {
            setInitializing(false);
        }

        return () => {
            mounted = false;
        };
        // NOTE: on ne dépend pas de refreshToken ici car on utilise refreshTokenRef pour vérifier.
    }, []);

    // Actions
    const login = useCallback(
        async (loginPayload) => {
            try {
                const res = await api.post('/auth/login', loginPayload);
                const token = res.data?.accessToken || null;
                const rToken = res.data?.refreshToken || null;

                setAccessToken(token);
                setRefreshToken(rToken); // <-- stocke le refresh token en mémoire
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
            // /auth/logout reçoit refreshToken et le supprime de la base de données
            await api.post('/auth/logout', {
                refreshToken: refreshTokenRef.current,
            });
        } catch {
            // ignorer les erreurs réseau pour logout
        } finally {
            setAccessToken(null);
            setRefreshToken(null);
            setUser(null);
            crypto?.clearKeys?.(); // important : vider la clé maître
            addToast?.('success', 'Déconnecté.');
        }
    }, [addToast, crypto]);

    // Valeurs exposées au contexte
    const value = {
        accessToken,
        setAccessToken, // rarement utilisé directement
        refreshToken,
        setRefreshToken, // exposé au cas où un composant externe doit le remplacer
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
