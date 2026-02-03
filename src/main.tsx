import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";

createRoot(document.getElementById('root')!).render(
  <App />
)
