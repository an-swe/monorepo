import type { ReactNode } from 'react';
import './styles.css';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export const Layout = ({ children, title = "anprogrammer.org" }: LayoutProps) => {
  return (
    <div className="app-container">
      <nav className="top-nav">
        <div className="nav-logo">
          <span style={{ fontWeight: 'bold' }}>{title.split('.')[0]}</span>.{title.split('.')[1]}
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
