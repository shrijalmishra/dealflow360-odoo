import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// MUST import mock adapter BEFORE App so axios interceptors are registered first
import './mocks/mockAdapter';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
