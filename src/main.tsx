import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {DialogHost} from './components/DialogHost';
import './index.css';

// Never run inside a frame: another page on the same github.io origin (or any
// site) could otherwise overlay it or read what is typed into it.
if (window.top !== window.self) {
  document.body.textContent = 'VaultSecure cannot be opened inside a frame.';
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <DialogHost />
    </StrictMode>,
  );
}
