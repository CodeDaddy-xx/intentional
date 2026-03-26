// src/components/Nav.jsx
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Today', icon: '○' },
  { to: '/morning', label: 'Plan', icon: '✎' },
  { to: '/habits', label: 'Habits', icon: '◈' },
  { to: '/progress', label: 'Progress', icon: '▦' },
  { to: '/settings', label: 'Settings', icon: '⚙' }
]

export default function Nav() {
  return (
    <nav className="bottom-nav">
      {links.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
