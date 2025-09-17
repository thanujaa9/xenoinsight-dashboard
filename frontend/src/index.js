// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // This is where Tailwind's styles are injected
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);