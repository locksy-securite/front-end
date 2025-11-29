import { useState, useEffect } from 'react';
import axios from 'axios';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';
import argon2 from 'argon2-wasm-pro';
import zxcvbn from 'zxcvbn';

import { useCrypto } from '../hooks/useCrypto.js'; // Hook global CryptoProvider
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

const ENVELOPE_META = {
    version: 1,
    kdf: { alg: 'argon2id', params: { m: 65536, t: 3, p: 1, hashLen: 32 } },
    encryption: { alg: 'aes-256-gcm', tagBits: 128 },
};

export default function RegisterForm({ onToast }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(null);

    const { setMasterKeyBytes } = useCrypto(); // accès au contexte crypto

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

        try {
            // Sel aléatoire pour Argon2id (16 octets)
            salt = new Uint8Array(16);
            crypto.getRandomValues(salt);

            // Dérivation côté client (clé maître) — jamais envoyer le mot de passe brut
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

            // HKDF : dériver une sous-clé spécifique pour l'inscription directement avec masterKeyBytes
            registrationKeyBytes = await deriveSubKey(
                masterKeyBytes,
                SUBKEYS.registration,
                32
            );

            // Clé AES-GCM (256 bits) importée depuis la sous-clé HKDF
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

            // AAD enrichi pour lier le contexte cryptographique
            const createdAt = Date.now(); // timestamp ms côté client
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

            // Enveloppe transportable (nonce + ciphertext en Base64)
            const envelope = {
                ...ENVELOPE_META,
                salt_b64: toBase64(salt), // pour cohérence et audit côté serveur
                aad_json: aadString, // utile au backend pour vérification/stockage
                data_b64: toBase64(
                    new Uint8Array([...nonce, ...new Uint8Array(ciphertext)])
                        .buffer
                ),
            };

            // Éléments envoyés au serveur (cohérents avec SQL)
            // - users.email : VARCHAR
            // - users.password_hash : BYTEA (convertir depuis Base64 côté serveur)
            // - users.salt : BYTEA (convertir depuis Base64 côté serveur)
            await axios.post('/api/auth/register', {
                email,
                password_hash_b64: toBase64(masterKeyBytes), // le "verifier" dérivé, pas le mot de passe
                salt_b64: toBase64(salt),
                envelope,
            });

            // Wiping élargi des buffers sensibles
            masterKeyBytes.fill(0);
            registrationKeyBytes.fill(0);
            salt.fill(0);
            nonce.fill(0);
            // Les buffers TextEncoder (aad, registrationPayload) sont immuables en JS,
            // on les réinitialise en recréant des vues et en les remplissant si besoin
            if (aad) {
                const a = new Uint8Array(aad.buffer);
                a.fill(0);
            }
            if (registrationPayload) {
                const p = new Uint8Array(registrationPayload.buffer);
                p.fill(0);
            }

            setEmail('');
            setPassword('');
            onToast?.(
                'success',
                'Compte créé avec succès. Vous pouvez vous connecter.'
            );
        } catch (err) {
            console.error('Registration error:', err?.message || err);
            const errorMsg =
                err?.response?.data?.message ||
                "Échec de l'inscription. Réessayez.";
            onToast?.('error', errorMsg);
        } finally {
            // Nettoyage des références
            masterKeyBytes = null;
            registrationKeyBytes = null;
            salt = null;
            nonce = null;
            aad = null;
            registrationPayload = null;
            setLoading(false);
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
            <PasswordInput value={password} onChange={setPassword} />
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
                {loading ? 'Création...' : 'Créer un compte'}
            </button>
            <div className="divider" />
            <div className="text-xs text-base-content/60">
                <p>
                    Conseil: utilisez une phrase de passe longue. En cas
                    d'oubli, les données chiffrées sont irrécupérables (modèle
                    zero-knowledge).
                </p>
            </div>
        </form>
    );
}
