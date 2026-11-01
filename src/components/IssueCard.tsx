import Link from 'next/link';
import { ThumbsUp, MapPin } from 'lucide-react';
import type { Issue } from '@/lib/types';
import {
  CategoryIcon,
  SeverityBadge,
  StatusBadge,
  priorityColor,
  timeAgo,
} from './ui';

export default function IssueCard({ issue }: { issue: Issue }) {
  return (
    <Link
      href={`/issues/${issue.id}`}
      className="glass-card hoverable"
      style={{ padding: '1.1rem', textDecoration: 'none', display: 'block' }}
    >
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: '0.6rem' }}>
        <span className="pill pill-primary">
          <CategoryIcon category={issue.category} size={13} /> {issue.category}
        </span>
        <SeverityBadge severity={issue.severity} />
      </div>

      <h3 style={{ fontSize: '1.02rem', marginBottom: '0.4rem', color: 'var(--foreground)' }}>
        {issue.title}
      </h3>
      <p className="muted small" style={{ marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {issue.description}
      </p>

      <div className="flex items-center gap-1 tiny muted" style={{ marginBottom: '0.75rem' }}>
        <MapPin size={12} /> {issue.location}
      </div>

      <div className="flex items-center gap-2 tiny muted" style={{ marginBottom: '0.4rem' }}>
        <span>Priority</span>
        <strong style={{ color: priorityColor(issue.priority) }}>{issue.priority}</strong>
        <span style={{ marginLeft: 'auto' }} />
      </div>
      <div className="meter" style={{ marginBottom: '0.85rem' }}>
        <span style={{ width: `${issue.priority}%`, background: priorityColor(issue.priority) }} />
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge status={issue.status} />
        <span className="flex items-center gap-3 tiny muted">
          <span className="flex items-center gap-1">
            <ThumbsUp size={12} /> {issue.verifications}
          </span>
          <span>{timeAgo(issue.createdAt)}</span>
        </span>
      </div>
    </Link>
  );
}
