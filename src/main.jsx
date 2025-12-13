import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import setupMock from './mockBackend';

// Récupération de la variable d'environnement avec fallback à false
const useMockBackend = import.meta.env.VITE_MOCK_BACKEND === 'true';

// On active le mock uniquement si on est en DEV et que VITE_MOCK_BACKEND vaut true
if (import.meta.env.DEV && useMockBackend) {
  setupMock();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
