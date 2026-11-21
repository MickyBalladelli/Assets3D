import { createRoot } from 'react-dom/client'
import { Visualizer } from './Visualizer'
import './styles.css'

const root = document.getElementById('root')
if (root) createRoot(root).render(<Visualizer />)
