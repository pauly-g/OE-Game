/**
 * Main Entry Point
 * 
 * Changes:
 * - Initial setup: React application entry point
 * - Added StrictMode wrapper
 * - Imported global styles
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
