'use client';
import { useState, useEffect, useRef } from 'react';

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    window.showToast = (message, type = 'info', duration = 4000) => {
      const id = Date.now();
      const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
      setToasts(prev => [...prev, { id, message, type, icon: icons[type] || 'ℹ️' }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    };
  }, []);

  return (
    <div id="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.icon}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
