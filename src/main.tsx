import { createRoot } from 'react-dom/client'
import { Visualizer } from './Visualizer'
import './demo.css'
import './styles.css'

const root = document.getElementById('root')
if (root) createRoot(root).render(<Visualizer />)
