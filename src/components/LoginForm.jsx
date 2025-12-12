import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';
import argon2 from 'argon2-wasm-pro';

import { useCrypto } from '../hooks/useCrypto.js'; // Hook global CryptoProvider
import { useAuth } from '../hooks/useAuth'; // hook d'auth
import { SUBKEYS, fromUtf8, deriveSubKey } from '../utils/cryptoKeys.js'; // Utilitaires centralisés

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

const base64ToUint8 = (b64) =>
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const ENVELOPE_META = {
    version: 1,
    kdf: { alg: 'argon2id', params: { m: 65536, t: 3, p: 1, hashLen: 32 } },
    encryption: { alg: 'aes-256-gcm', tagBits: 128 },
};

const wipe = (buf) => {
    try {
        if (buf && typeof buf.fill === 'function') buf.fill(0);
    } catch {
        // best-effort
    }
};

async function deriveMasterKey(password, saltUint8) {
    const { hash } = await argon2.hash({
        pass: password,
        salt: saltUint8,
        type: 'argon2id',
        memoryCost: ENVELOPE_META.kdf.params.m,
        timeCost: ENVELOPE_META.kdf.params.t,
        parallelism: ENVELOPE_META.kdf.params.p,
        hashLen: ENVELOPE_META.kdf.params.hashLen,
    });

    return new Uint8Array(hash);
}

async function encryptWithSubkey(
    masterKeyBytes,
    subkeyLabel,
    aadObj,
    payloadStr,
    saltB64
) {
    const subkey = await deriveSubKey(masterKeyBytes, subkeyLabel, 32);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        subkey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    // 4. IV/nonce aléatoire (12 octets) pour GCM
    //    Généré côté client et préfixé au ciphertext pour que le serveur puisse le réutiliser au déchiffrement.
    const nonce = new Uint8Array(12);
    crypto.getRandomValues(nonce);

    // 5. AAD (contexte)
    //    "Additional Authenticated Data" : données non chiffrées mais couvertes par la tag d'authentification.
    //    On inclut la version, l'email, les paramètres KDF et la date de login afin d'éviter le replay et
    //    d'attacher le contexte à la preuve.
    const aadString = JSON.stringify(aadObj);
    const aad = fromUtf8(aadString);

    // 6. Payload minimal
    //    Preuve minimale (par exemple 'login_proof_v1') encodée en bytes et chiffrée avec AES-GCM.
    const payload = fromUtf8(payloadStr);

    try {
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: nonce,
                additionalData: aad,
                tagLength: ENVELOPE_META.encryption.tagBits,
            },
            cryptoKey,
            payload
        );

        const dataB64 = toBase64(
            new Uint8Array([...nonce, ...new Uint8Array(ciphertext)]).buffer
        );

        return {
            ...ENVELOPE_META,
            salt: saltB64,
            aad_json: aadString,
            data_b64: dataB64,
        };
    } finally {
        wipe(subkey);
        wipe(nonce);
        if (aad)
            try {
                new Uint8Array(aad.buffer).fill(0);
            } catch {
                // best-effort
            }

        if (payload)
            try {
                new Uint8Array(payload.buffer).fill(0);
            } catch {
                // best-effort
            }
    }
}

export default function LoginForm({ onToast }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { setMasterKeyBytes, clearKeys } = useCrypto();
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = useCallback(
        async (e) => {
            e.preventDefault();
            setLoading(true);

            let salt = null;
            let masterKeyBytes = null;

            try {
                // 1. Récupérer le sel côté serveur (lié à l’utilisateur)
                const { data: serverData } = await api.post('/auth/salt', {
                    email,
                });
                salt = base64ToUint8(serverData.salt);

                // 2. Dériver la clé maître avec Argon2id
                masterKeyBytes = await deriveMasterKey(password, salt);
                setMasterKeyBytes(masterKeyBytes); // stockée globalement dans CryptoProvider

                // 3. HKDF : dériver une sous-clé spécifique pour la connexion et chiffrer la preuve
                const aadObj = {
                    v: ENVELOPE_META.version,
                    email,
                    kdf: ENVELOPE_META.kdf,
                    login_at: Date.now(),
                };

                // 4/5/6. Générer nonce, préparer AAD et payload, chiffrer avec sous-clé (AES-GCM)
                const envelope = await encryptWithSubkey(
                    masterKeyBytes,
                    SUBKEYS.login,
                    aadObj,
                    'login_proof_v1',
                    serverData.salt
                );

                // 7. Envoyer au AuthProvider (qui fera /auth/login + gestion tokens)
                await login({
                    email,
                    passwordHash: toBase64(masterKeyBytes),
                    envelope,
                });

                // 8. Nettoyage local (on garde la masterKey en mémoire côté CryptoProvider)
                wipe(masterKeyBytes);
                wipe(salt);

                setEmail('');
                setPassword('');
                
                onToast?.(
                    'success',
                    'Connexion réussie. Bienvenue dans Locksy.'
                );
                navigate('/dashboard/passwords');
            } catch (err) {
                try {
                    if (masterKeyBytes) wipe(masterKeyBytes);
                    clearKeys?.();
                } catch {
                    // best-effort
                }

                console.error('Login error:', err?.message || err);
                const errorMsg =
                    err?.response?.data?.message ||
                    'Échec de la connexion. Vérifiez vos identifiants.';
                onToast?.('error', errorMsg);
            } finally {
                masterKeyBytes = null;
                salt = null;
                setLoading(false);
            }
        },
        [
            email,
            password,
            setMasterKeyBytes,
            clearKeys,
            login,
            navigate,
            onToast,
        ]
    );

    return (
        <form
            onSubmit={handleLogin}
            className="card w-full max-w-md bg-base-100 shadow-sm p-6 space-y-4"
        >
            <h2 className="text-2xl font-bold text-center">Connexion</h2>
            <EmailInput value={email} onChange={setEmail} />
            <PasswordInput
                value={password}
                onChange={setPassword}
                validate={false}
            />
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
                    <span className="loading loading-ring loading-sm text-primary" />
                ) : (
                    'Se connecter'
                )}
            </button>
            <div className="divider" />
            <div className="text-xs text-base-content/60">
                <p>
                    Conseil : utilisez une phrase de passe longue. En cas
                    d'oubli, vos données chiffrées sont irrécupérables (modèle
                    zero-knowledge).
                </p>
            </div>
        </form>
    );
}
