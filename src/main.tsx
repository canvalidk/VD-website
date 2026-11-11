import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './theme.css';
import './network.css';
import './edge.css';
import './dictionary.css';
import './traces.css';
import './home.css';
import './ideas.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
