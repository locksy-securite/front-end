import { useContext } from 'react';
import { CryptoContext } from '../context/cryptoContext.js';

export const useCrypto = () => useContext(CryptoContext);
