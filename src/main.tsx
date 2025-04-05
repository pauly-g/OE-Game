/**
 * Main Entry Point
 * 
 * Changes:
 * - Initial setup: React application entry point
 * - Added StrictMode wrapper
 * - Imported global styles
 * - Added routing to support landing page and intro sequence
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Check if we're running from the main game page
const isGamePage = window.location.pathname.includes('game.html');

// Only render the game if we're on the game page
if (isGamePage || window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
  const rootElement = document.getElementById('root');
  
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } else {
    console.error('Root element not found');
  }
}
