import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {DialogHost} from './components/DialogHost';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <DialogHost />
  </StrictMode>,
);
