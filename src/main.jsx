import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Conditionally initialize the mock API interceptor
if (import.meta.env.VITE_USE_MOCK_API === 'true') {
  console.log('📦 Mock API enabled. Intercepting API requests...');
  import('./mocks/mockAdapter');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
