import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppPremium from './AppPremium.tsx'

const Launcher = () => {
  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem('zenit_mode') === 'premium';
  });

  useEffect(() => {
    const handleStorage = () => {
      setIsPremium(localStorage.getItem('zenit_mode') === 'premium');
    };
    window.addEventListener('storage', handleStorage);
    // Custom event for same-window changes
    window.addEventListener('zenit_mode_change', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('zenit_mode_change', handleStorage);
    };
  }, []);

  return isPremium ? <AppPremium /> : <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Launcher />
  </StrictMode>,
)
