// src/tools/console/index.tsx
import React from 'react';
import {createRoot} from 'react-dom/client';
import {StudioApp} from './StudioApp';

const root = document.getElementById('root');
if (root) createRoot(root).render(<StudioApp />);
export default StudioApp;
