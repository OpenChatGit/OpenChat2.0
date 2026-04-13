import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./hooks/useToast";
import { AuthProvider } from "./AuthProvider";
import "./index.css";

// Apply saved theme immediately before React renders to prevent flash
(async () => {
  try {
    const savedTheme = localStorage.getItem('theme');
    let theme = savedTheme ? JSON.parse(savedTheme) : 'system';
    
    // If theme is 'system', try to get theme from system preferences
    if (theme === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    
    console.log('[Theme Init] Setting initial theme:', theme);
    document.documentElement.setAttribute('data-theme', theme);
  } catch (error) {
    console.error('[Theme Init] Failed to load theme:', error);
    // Fallback to dark
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
);
