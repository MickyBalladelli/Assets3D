import { createRoot } from 'react-dom/client'
import { FleetDemo } from './FleetDemo'
import '../src/demo.css'
import '../src/styles.css'
import './fleet.css'

const root = document.getElementById('root')
if (root) createRoot(root).render(<FleetDemo />)
