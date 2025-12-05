import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';
import argon2 from 'argon2-wasm-pro';
import zxcvbn from 'zxcvbn';

import { useCrypto } from '../hooks/useCrypto.js';
import { useAuth } from '../hooks/useAuth';
import { SUBKEYS, fromUtf8, deriveSubKey } from '../utils/cryptoKeys.js';
import { checkPwnedCount } from '../utils/pwned.js';

// Helpers sécurisés pour encodage
const toBase64 = (bytes) => {
    let binary = '';
    const bytesArray = new Uint8Array(bytes);
    const len = bytesArray.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytesArray[i]);
    }
    return window.btoa(binary);
};

const ENVELOPE_META = {
    version: 1,
    kdf: { alg: 'argon2id', params: { m: 65536, t: 3, p: 1, hashLen: 32 } },
    encryption: { alg: 'aes-256-gcm', tagBits: 128 },
};

export default function RegisterForm({ onToast }) {
    const navigate = useNavigate();
    const { setMasterKeyBytes, clearKeys } = useCrypto(); // accès au contexte crypto
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(null);

    // Vérification force du mot de passe avec zxcvbn
    useEffect(() => {
        if (password) {
            const result = zxcvbn(password);
            setPasswordStrength(result);
        } else {
            setPasswordStrength(null);
        }
    }, [password]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Buffers à effacer après usage
        let salt = null;
        let masterKeyBytes = null;
        let registrationKeyBytes = null;
        let nonce = null;
        let aad = null;
        let registrationPayload = null;

        const HIBP_BLOCK_ON_PWNED = true;
        
        const withTimeout = (promise, ms = 5000) =>
            Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), ms)
                ),
            ]);

        // Vérification HaveIBeenPwned
        try {
            // Timeout de 5 secondes maximum
            const pwnedCount = await withTimeout(checkPwnedCount(password), 5000);

            if (pwnedCount > 0) {
                // Message clair pour l’utilisateur
                const msg = `Ce mot de passe apparaît ${pwnedCount.toLocaleString()} fois dans des fuites connues. Veuillez en choisir un autre.`;

                if (HIBP_BLOCK_ON_PWNED) {
                    // Refus : mot de passe compromis
                    onToast?.('error', msg);
                    setLoading(false);
                    return;
                } else {
                    // Politique permissive : avertir mais autoriser (optionnel)
                    onToast?.('warning', msg);
                }
            }
        } catch (hibpErr) {
            /// Erreur réseau / API / timeout : on informe, mais on autorise l'inscription
            console.warn(
                'Échec de la vérification HIBP — procédure ignorée.',
                hibpErr
            );

            onToast?.(
                'info',
                'Impossible de vérifier si le mot de passe figure dans des fuites — vérification ignorée.'
            );
        }

        try {
            // 1. Sel aléatoire pour Argon2id (16 octets)
            salt = new Uint8Array(16);
            crypto.getRandomValues(salt);

            // 2. Dérivation côté client (clé maître) — jamais envoyer le mot de passe brut
            const { hash } = await argon2.hash({
                pass: password,
                salt,
                type: 'argon2id',
                memoryCost: ENVELOPE_META.kdf.params.m, // 64 MiB
                timeCost: ENVELOPE_META.kdf.params.t, // 3
                parallelism: ENVELOPE_META.kdf.params.p, // 1
                hashLen: ENVELOPE_META.kdf.params.hashLen, // 32
            });

            // Clé maître issue d'Argon2id
            masterKeyBytes = new Uint8Array(hash);
            setMasterKeyBytes(masterKeyBytes); // stockée globalement dans CryptoProvider

            // 3. HKDF : dériver une sous-clé spécifique pour l'inscription
            registrationKeyBytes = await deriveSubKey(
                masterKeyBytes,
                SUBKEYS.registration,
                32
            );

            // 4. Chiffrement de la preuve d'inscription (AES-GCM)
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                registrationKeyBytes,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            );

            // IV/nonce aléatoire (12 octets) pour GCM
            nonce = new Uint8Array(12);
            crypto.getRandomValues(nonce);

            const createdAt = Date.now();
            const aadString = JSON.stringify({
                v: ENVELOPE_META.version,
                email,
                kdf: ENVELOPE_META.kdf,
                created_at: createdAt,
            });
            aad = fromUtf8(aadString);

            // Preuve minimale d'inscription
            registrationPayload = fromUtf8('registration_proof_v1');

            // Chiffrement authentifié (AES-GCM)
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: nonce,
                    additionalData: aad,
                    tagLength: ENVELOPE_META.encryption.tagBits,
                },
                cryptoKey,
                registrationPayload
            );

            // 5. Enveloppe transportable (nonce + ciphertext en Base64)
            const envelope = {
                ...ENVELOPE_META,
                salt_b64: toBase64(salt),
                aad_json: aadString,
                data_b64: toBase64(
                    new Uint8Array([...nonce, ...new Uint8Array(ciphertext)])
                        .buffer
                ),
            };

            // 6. Envoi au serveur (inscription)
            // - users.email : VARCHAR
            // - users.password_hash : BYTEA (convertir depuis Base64 côté serveur)
            // - users.salt : BYTEA (convertir depuis Base64 côté serveur)
            await api.post('/auth/register', {
                email,
                password_hash_b64: toBase64(masterKeyBytes), // le "verifier" dérivé, pas le mot de passe
                salt_b64: toBase64(salt),
                envelope,
            });

            // 7. Auto-login : dériver sous-clé login, créer enveloppe login et appeler useAuth().login()
            try {
                // dériver sous-clé login
                const loginKeyBytes = await deriveSubKey(
                    masterKeyBytes,
                    SUBKEYS.login,
                    32
                );

                const loginCryptoKey = await crypto.subtle.importKey(
                    'raw',
                    loginKeyBytes,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['encrypt']
                );

                const loginNonce = new Uint8Array(12);
                crypto.getRandomValues(loginNonce);

                const loginAadString = JSON.stringify({
                    v: ENVELOPE_META.version,
                    email,
                    kdf: ENVELOPE_META.kdf,
                    login_at: Date.now(),
                });
                const loginAad = fromUtf8(loginAadString);
                const loginPayload = fromUtf8('login_proof_v1');

                const loginCiphertext = await crypto.subtle.encrypt(
                    {
                        name: 'AES-GCM',
                        iv: loginNonce,
                        additionalData: loginAad,
                        tagLength: ENVELOPE_META.encryption.tagBits,
                    },
                    loginCryptoKey,
                    loginPayload
                );

                const loginEnvelope = {
                    ...ENVELOPE_META,
                    salt_b64: toBase64(salt),
                    aad_json: loginAadString,
                    data_b64: toBase64(
                        new Uint8Array([
                            ...loginNonce,
                            ...new Uint8Array(loginCiphertext),
                        ]).buffer
                    ),
                };

                // Appel login via AuthProvider (serveur doit set cookie refresh + renvoyer accessToken)
                await login({
                    email,
                    password_hash_b64: toBase64(masterKeyBytes),
                    envelope: loginEnvelope,
                });

                onToast?.('success', 'Compte créé et connecté avec succès.');
                // cleanup des buffers loginKey/nonce/payload
                try {
                    registrationKeyBytes && registrationKeyBytes.fill(0);
                } catch {
                    // Ignorer : nettoyage mémoire non critique
                }

                try {
                    if (salt) salt.fill(0);
                } catch {
                    // Ignorer : nettoyage mémoire non critique
                }

                try {
                    if (nonce) nonce.fill(0);
                } catch {
                    // Ignorer : nettoyage mémoire non critique
                }

                try {
                    if (aad) {
                        const a = new Uint8Array(aad.buffer);
                        a.fill(0);
                    }
                } catch {
                    // Ignorer : nettoyage mémoire non critique
                }

                try {
                    if (registrationPayload) {
                        const p = new Uint8Array(registrationPayload.buffer);
                        p.fill(0);
                    }
                } catch {
                    // Ignorer : nettoyage mémoire non critique
                }

                // redirection vers dashboard
                navigate('/dashboard/passwords');
            } catch {
                // Si auto-login échoue, informer et rediriger vers /login (utilisateur peut se connecter manuellement)
                onToast?.(
                    'info',
                    'Compte créé. Connexion automatique impossible — connectez-vous.'
                );
                navigate('/login');
            } finally {
                // Wiping élargi des buffers sensibles liés à l'inscription
                try {
                    registrationKeyBytes && registrationKeyBytes.fill(0);
                } catch {
                    // Ignorer : nettoyage mémoire non critique
                }

                try {
                    if (salt) salt.fill(0);
                } catch {
                    // Ignorer : nettoyage mémoire non critique
                }

                try {
                    if (nonce) nonce.fill(0);
                } catch {
                    // Ignorer : nettoyage mémoire non critique
                }

                try {
                    if (aad) {
                        const a = new Uint8Array(aad.buffer);
                        a.fill(0);
                    }
                } catch {
                    // Ignorer : nettoyage mémoire non critique
                }

                try {
                    if (registrationPayload) {
                        const p = new Uint8Array(registrationPayload.buffer);
                        p.fill(0);
                    }
                } catch {
                    // Ignorer : nettoyage mémoire non critique
                }
            }
        } catch (err) {
            console.error('Registration error:', err?.message || err);
            const errorMsg =
                err?.response?.data?.message ||
                "Échec de l'inscription. Réessayez.";
            onToast?.('error', errorMsg);
            // en cas d'erreur critique, effacer la clé maître globale si définie
            try {
                if (masterKeyBytes) {
                    masterKeyBytes.fill(0);
                }
                clearKeys?.();
            } catch {
                // Ignorer : nettoyage mémoire non critique
            }
            // rester sur la page d'inscription
        } finally {
            // Nettoyage des références locales
            masterKeyBytes = null;
            registrationKeyBytes = null;
            salt = null;
            nonce = null;
            aad = null;
            registrationPayload = null;
            setLoading(false);
            setEmail('');
            setPassword('');
        }
    };

    const renderStrength = () => {
        if (!passwordStrength) return null;
        const levels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
        const colors = [
            'badge-error',
            'badge-warning',
            'badge-info',
            'badge-success',
            'badge-success',
        ];
        return (
            <div className={`badge ${colors[passwordStrength.score]} mt-2`}>
                <span>
                    Force du mot de passe : {levels[passwordStrength.score]}
                </span>
            </div>
        );
    };

    return (
        <form
            onSubmit={handleRegister}
            className="card w-full max-w-md bg-base-100 shadow-sm p-6 space-y-4"
        >
            <h2 className="text-2xl font-bold text-center">Créer un compte</h2>
            <EmailInput value={email} onChange={setEmail} />
            <PasswordInput value={password} onChange={setPassword} validate />
            {renderStrength()}
            <div className="text-sm text-base-content/70">
                <p>
                    Votre clé de chiffrement est dérivée de votre mot de passe
                    sur votre appareil. Elle ne quitte jamais votre navigateur.
                </p>
            </div>
            <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
            >
                {loading ? (
                    <span className="loading loading-ring loading-sm text-primary"></span>
                ) : (
                    'Créer un compte'
                )}
            </button>
            <div className="divider" />
            <div className="text-xs text-base-content/60">
                <p>
                    Conseil : utilisez une phrase de passe longue. En cas
                    d'oubli, les données chiffrées sont irrécupérables (modèle
                    zero-knowledge).
                </p>
            </div>
        </form>
    );
}
