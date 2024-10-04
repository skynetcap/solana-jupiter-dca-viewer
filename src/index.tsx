import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css'; // Updated import path for Ant Design v5
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);