// src/context/CryptoProvider.jsx
import { useState } from 'react';
import { CryptoContext } from './cryptoContext.js';
import { deriveSubKey, SUBKEYS } from '../utils/cryptoKeys.js';

/**
 * Fournit la clé maître et les sous-clés dérivées via HKDF
 * - La clé maître est issue d'Argon2id (Uint8Array)
 * - Les sous-clés sont dérivées à la demande
 */
export function CryptoProvider({ children }) {
    const [masterKey, setMasterKey] = useState(null);

    // Définir la clé maître (appelé après inscription/connexion)
    const setMasterKeyBytes = (bytes) => {
        setMasterKey(bytes);
    };

    // Dériver une sous-clé HKDF pour un usage donné
    const getSubKey = async (info) => {
        if (!masterKey) throw new Error('Master key not set');
        return await deriveSubKey(masterKey, info, 32);
    };

    // Effacer toutes les clés (déconnexion)
    const clearKeys = () => {
        if (masterKey) masterKey.fill(0);
        setMasterKey(null);
    };

    return (
        <CryptoContext.Provider
            value={{ masterKey, setMasterKeyBytes, getSubKey, clearKeys }}
        >
            {children}
        </CryptoContext.Provider>
    );
}
