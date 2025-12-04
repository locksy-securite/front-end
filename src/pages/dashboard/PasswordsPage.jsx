import { useCallback } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PasswordsList from '../../components/dashboard/PasswordsList';
import { useToast } from '../../hooks/useToast';
import { useCrypto } from '../../hooks/useCrypto';
import { fromUtf8, SUBKEYS } from '../../utils/cryptoKeys.js';

// Utilitaires binaires
const base64ToUint8 = (b64) => {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

const uint8ToBase64 = (u8) => {
    let binary = '';
    for (let i = 0; i < u8.byteLength; i++)
        binary += String.fromCharCode(u8[i]);
    return btoa(binary);
};

const toUtf8 = (ab) => new TextDecoder().decode(ab);

// Domaine de chiffrement / AAD
const AAD_TEXT = 'passwords_v1';

export default function PasswordsPage() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const cryptoCtx = useCrypto();
    const getSubKey = cryptoCtx?.getSubKey;

    // Importer et préparer une clé AES-GCM dérivée via HKDF (info = SUBKEYS.passwords)
    const importAesKey = useCallback(
        async (info = SUBKEYS.passwords) => {
            if (!getSubKey) throw new Error('Crypto non initialisé');
            const keyBytes = await getSubKey(info); // Uint8Array
            try {
                const cryptoKey = await crypto.subtle.importKey(
                    'raw',
                    keyBytes,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['encrypt', 'decrypt']
                );
                return { cryptoKey, raw: keyBytes };
            } catch (e) {
                // tenter de nettoyer keyBytes si possible, puis remonter l'erreur
                try {
                    if (keyBytes && typeof keyBytes.fill === 'function')
                        keyBytes.fill(0);
                } catch (cleanupErr) {
                    console.warn('Nettoyage keyBytes échoué', cleanupErr);
                }
                throw e;
            }
        },
        [getSubKey]
    );

    // Chiffre une chaîne -> Base64(nonce + ciphertext + tag)
    const encryptSecret = useCallback(
        async (plaintext) => {
            if (plaintext == null) return null;
            const { cryptoKey, raw } = await importAesKey();
            const nonce = new Uint8Array(12);
            crypto.getRandomValues(nonce);

            const aad = fromUtf8(AAD_TEXT);
            const payload = fromUtf8(plaintext);

            try {
                const ciphertext = await crypto.subtle.encrypt(
                    {
                        name: 'AES-GCM',
                        iv: nonce,
                        additionalData: aad,
                        tagLength: 128,
                    },
                    cryptoKey,
                    payload
                );

                const combined = new Uint8Array(
                    nonce.byteLength + ciphertext.byteLength
                );
                combined.set(nonce, 0);
                combined.set(new Uint8Array(ciphertext), nonce.byteLength);
                return uint8ToBase64(combined);
            } finally {
                // nettoyage best-effort des buffers sensibles
                try {
                    if (raw && typeof raw.fill === 'function') raw.fill(0);
                } catch (err) {
                    console.warn('Nettoyage raw key échoué', err);
                }
                try {
                    nonce.fill(0);
                } catch (err) {
                    console.warn('Nettoyage nonce échoué', err);
                }
                try {
                    const p = new Uint8Array(payload.buffer);
                    p.fill(0);
                } catch (err) {
                    console.warn('Nettoyage payload échoué', err);
                }
                try {
                    const a = new Uint8Array(aad.buffer);
                    a.fill(0);
                } catch (err) {
                    console.warn('Nettoyage aad échoué', err);
                }
            }
        },
        [importAesKey]
    );

    // Déchiffre Base64(nonce + ciphertext + tag) -> string
    const decryptSecret = useCallback(
        async (dataB64) => {
            if (!dataB64) return '';
            const bytes = base64ToUint8(dataB64);
            if (bytes.length <= 12) return '';

            const nonce = bytes.slice(0, 12);
            const ciphertext = bytes.slice(12).buffer;

            const { cryptoKey, raw } = await importAesKey();
            const aad = fromUtf8(AAD_TEXT);

            try {
                const decrypted = await crypto.subtle.decrypt(
                    {
                        name: 'AES-GCM',
                        iv: nonce,
                        additionalData: aad,
                        tagLength: 128,
                    },
                    cryptoKey,
                    ciphertext
                );
                return toUtf8(decrypted);
            } catch (e) {
                console.error('Déchiffrement failed for secret:', e);
                return '';
            } finally {
                try {
                    if (raw && typeof raw.fill === 'function') raw.fill(0);
                } catch (err) {
                    console.warn('Nettoyage raw key échoué', err);
                }
                try {
                    nonce.fill(0);
                } catch (err) {
                    console.warn('Nettoyage nonce échoué', err);
                }
                try {
                    const a = new Uint8Array(aad.buffer);
                    a.fill(0);
                } catch (err) {
                    console.warn('Nettoyage aad échoué', err);
                }
            }
        },
        [importAesKey]
    );

    // Récupère la liste (et déchiffre chaque secret). Retourne [] si backend indisponible.
    const fetchPasswords = useCallback(async () => {
        if (!getSubKey) {
            // pas de clé maîtresse : rien à afficher (utilisateur non connecté)
            return [];
        }
        try {
            const res = await axios.get('/passwords');
            const list = Array.isArray(res.data) ? res.data : [];

            const decrypted = await Promise.all(
                list.map(async (item) => {
                    let secretPlain = '';
                    try {
                        secretPlain = await decryptSecret(item.secret);
                    } catch (e) {
                        console.error(
                            'Erreur déchiffrement item',
                            item.id_password,
                            e
                        );
                        secretPlain = '';
                    }
                    return {
                        id_password: item.id_password,
                        name: item.name,
                        username: item.username,
                        secret: secretPlain,
                    };
                })
            );

            return decrypted;
        } catch (err) {
            // backend indisponible -> log et renvoyer liste vide pour garder l'UI vivante en dev
            if (import.meta.env.DEV) {
                console.warn(
                    'Impossible de joindre /passwords (backend absent?)',
                    err
                );
            }
            return [];
        }
    }, [decryptSecret, getSubKey]);

    // Query pour la liste des mots de passe
    const {
        data: passwords = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ['passwords'],
        queryFn: fetchPasswords,
        refetchOnWindowFocus: true,
        retry: 1,
        onError: (err) => {
            addToast?.(
                'error',
                err?.message || 'Impossible de charger les mots de passe.'
            );
        },
    });

    const invalidatePasswords = useCallback(
        () => queryClient.invalidateQueries({ queryKey: ['passwords'] }),
        [queryClient]
    );

    // Mutations pour create/update/delete
    const saveMutation = useMutation({
        mutationFn: async (payload) => {
            if (!getSubKey) throw new Error('Clé maître absente.');
            const encrypted = await encryptSecret(payload.secret);
            const body = {
                name: payload.name,
                username: payload.username,
                secret: encrypted,
            };

            if (payload.id_password) {
                await axios.put(`/passwords/${payload.id_password}`, body);
                return { mode: 'update', id: payload.id_password };
            }
            await axios.post('/passwords', body);
            return { mode: 'create' };
        },
        onSuccess: (data, variables) => {
            invalidatePasswords();
            if (variables?.id_password) {
                addToast?.('success', 'Mot de passe mis à jour.');
            } else {
                addToast?.('success', 'Mot de passe ajouté.');
            }
        },
        onError: (err) => {
            addToast?.(
                'error',
                err?.message || 'Erreur lors de la sauvegarde.'
            );
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await axios.delete(`/passwords/${id}`);
            return id;
        },
        onSuccess: () => {
            invalidatePasswords();
            addToast?.('success', 'Mot de passe supprimé.');
        },
        onError: (err) => {
            addToast?.(
                'error',
                err?.message || 'Erreur lors de la suppression.'
            );
        },
    });

    // Wrappers exposés au composant enfant
    const handleSave = async (payload) => saveMutation.mutateAsync(payload);
    const handleDelete = async (id) => deleteMutation.mutateAsync(id);

    return (
        <div className="p-4 lg:p-6">
            <h1 className="text-2xl font-bold mb-6">Mots de passe</h1>

            {isLoading ? (
                <div className="space-y-1">
                    <div className="animate-pulse space-y-3">
                        <div className="skeleton h-6 w-full" />
                        <div className="skeleton h-6 w-1/2" />
                        <div className="skeleton h-6 w-1/4" />
                    </div>
                </div>
            ) : isError ? (
                <div className="alert alert-error">
                    <div>
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
                                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <span>
                            Erreur : {error?.message || 'Impossible de charger'}
                        </span>
                    </div>
                </div>
            ) : (
                <PasswordsList
                    passwords={passwords}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onToast={addToast}
                />
            )}
        </div>
    );
}
