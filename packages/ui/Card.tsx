
import './styles.css';

interface CardProps {
  title: string;
  description: string;
  href: string;
  actionLabel?: string;
}

export const Card = ({ title, description, href, actionLabel = "Open project" }: CardProps) => {
  return (
    <a href={href} className="project-card" target="_blank" rel="noopener noreferrer">
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
      </div>
      <p className="card-desc">{description}</p>
      <div className="card-footer">
        {actionLabel}
        <span className="arrow-icon">→</span>
      </div>
    </a>
  );
};
