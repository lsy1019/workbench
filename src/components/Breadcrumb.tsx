import { useNavigate } from 'react-router-dom';
import './Breadcrumb.css';

interface Props {
  items: { label: string; path?: string }[];
}

export default function Breadcrumb({ items }: Props) {
  const navigate = useNavigate();

  return (
    <nav className="breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          {item.path ? (
            <button className="breadcrumb-link" onClick={() => navigate(item.path!)}>
              {item.label}
            </button>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
