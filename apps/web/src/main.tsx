import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

async function bootstrap() {
  if (import.meta.env.DEV) {
    // Dynamic import with variable path to prevent tsc from following
    const mswPath = '../mocks/browser';
    const { worker } = await import(/* @vite-ignore */ mswPath);
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
