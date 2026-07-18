// src/tools/console/index.tsx
import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
export default App;
