import { useState, useEffect, useCallback } from 'react';
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
const toBase64Reg = (bytes) => {
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

const ENVELOPE_META_REG = ENVELOPE_META;

const wipeReg = (buf) => {
    try {
        if (buf && typeof buf.fill === 'function') buf.fill(0);
    } catch {
        // best-effort
    }
};

async function deriveMasterKeyReg(password, saltUint8) {
    const { hash } = await argon2.hash({
        pass: password,
        salt: saltUint8,
        type: 'argon2id',
        memoryCost: ENVELOPE_META_REG.kdf.params.m,
        timeCost: ENVELOPE_META_REG.kdf.params.t,
        parallelism: ENVELOPE_META_REG.kdf.params.p,
        hashLen: ENVELOPE_META_REG.kdf.params.hashLen,
    });

    return new Uint8Array(hash);
}

async function encryptWithSubkeyReg(
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
    //    "Additional Authenticated Data" — données non chiffrées mais couvertes par la tag d'authentification.
    //    On inclut la version, l'email, les paramètres KDF et la date de création afin d'éviter le replay et
    //    d'attacher le contexte à la preuve.
    const aadString = JSON.stringify(aadObj);
    const aad = fromUtf8(aadString);

    // 6. Payload minimal
    //    Preuve minimale (par exemple 'registration_proof_v1') encodée en bytes et chiffrée avec AES-GCM.
    const payload = fromUtf8(payloadStr);

    try {
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: nonce,
                additionalData: aad,
                tagLength: ENVELOPE_META_REG.encryption.tagBits,
            },
            cryptoKey,
            payload
        );

        const dataB64 = toBase64Reg(
            new Uint8Array([...nonce, ...new Uint8Array(ciphertext)]).buffer
        );

        return {
            ...ENVELOPE_META_REG,
            salt: saltB64,
            aad_json: aadString,
            data_b64: dataB64,
        };
    } finally {
        wipeReg(subkey);
        wipeReg(nonce);
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

    const withTimeout = (promise, ms = 5000) =>
        Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), ms)
            ),
        ]);

    const handleRegister = useCallback(
        async (e) => {
            e.preventDefault();
            setLoading(true);

            let salt = null;
            let masterKeyBytes = null;

            const HIBP_BLOCK_ON_PWNED = true;

            try {
                // Vérification HaveIBeenPwned (timeout 5s)
                try {
                    const pwnedCount = await withTimeout(
                        checkPwnedCount(password),
                        5000
                    );

                    if (pwnedCount > 0) {
                        const msg = `Ce mot de passe apparaît ${pwnedCount.toLocaleString()} fois dans des fuites connues. Veuillez en choisir un autre.`;

                        if (HIBP_BLOCK_ON_PWNED) {
                            onToast?.('error', msg);
                            setLoading(false);
                            return;
                        }

                        onToast?.('warning', msg);
                    }
                } catch (hibpErr) {
                    console.warn(
                        'Échec de la vérification HIBP — procédure ignorée.',
                        hibpErr
                    );
                    onToast?.(
                        'info',
                        'Impossible de vérifier si le mot de passe figure dans des fuites — vérification ignorée.'
                    );
                }

                // 1. Sel aléatoire pour Argon2id (16 octets)
                salt = new Uint8Array(16);
                crypto.getRandomValues(salt);

                // 2. Dérivation côté client (clé maître) — jamais envoyer le mot de passe brut
                masterKeyBytes = await deriveMasterKeyReg(password, salt);
                setMasterKeyBytes(masterKeyBytes);

                // 3. HKDF : dériver une sous-clé spécifique pour l'inscription et chiffrer la preuve
                const aadObj = {
                    v: ENVELOPE_META_REG.version,
                    email,
                    kdf: ENVELOPE_META_REG.kdf,
                    created_at: Date.now(),
                };

                // 4/5/6. Générer nonce, préparer AAD et payload, chiffrer avec sous-clé (AES-GCM)
                const envelope = await encryptWithSubkeyReg(
                    masterKeyBytes,
                    SUBKEYS.registration,
                    aadObj,
                    'registration_proof_v1',
                    toBase64Reg(salt)
                );

                // 7. Envoi au serveur (inscription)
                await api.post('/auth/register', {
                    email,
                    passwordHash: toBase64Reg(masterKeyBytes), // le "verifier" dérivé, pas le mot de passe
                    salt: toBase64Reg(salt),
                    envelope,
                });

                // 8. Auto-login : dériver sous-clé login, créer enveloppe login et appeler useAuth().login()
                try {
                    const loginAadObj = {
                        v: ENVELOPE_META_REG.version,
                        email,
                        kdf: ENVELOPE_META_REG.kdf,
                        login_at: Date.now(),
                    };

                    const loginEnvelope = await encryptWithSubkeyReg(
                        masterKeyBytes,
                        SUBKEYS.login,
                        loginAadObj,
                        'login_proof_v1',
                        toBase64Reg(salt)
                    );

                    await login({
                        email,
                        passwordHash: toBase64Reg(masterKeyBytes),
                        envelope: loginEnvelope,
                    });

                    setEmail('');
                    setPassword('');

                    onToast?.(
                        'success',
                        'Compte créé et connecté avec succès.'
                    );
                    navigate('/dashboard/passwords');
                } catch (autoLoginErr) {
                    console.warn('Auto-login failed', autoLoginErr);
                    onToast?.(
                        'info',
                        'Compte créé. Connexion automatique impossible — connectez-vous.'
                    );
                    navigate('/login');
                }
            } catch (err) {
                console.error('Registration error:', err?.message || err);
                const errorMsg =
                    err?.response?.data?.message ||
                    "Échec de l'inscription. Réessayez.";
                onToast?.('error', errorMsg);

                try {
                    if (masterKeyBytes) wipeReg(masterKeyBytes);
                    clearKeys?.();
                } catch {
                    // best-effort
                }
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
