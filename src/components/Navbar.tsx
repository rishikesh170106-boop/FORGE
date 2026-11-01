'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home,
  Camera,
  LayoutDashboard,
  Map,
  Trophy,
  Video,
  ShieldCheck,
  Building2,
  HardHat,
  Landmark,
  LogIn,
  type LucideIcon,
} from 'lucide-react';
import { useSession } from '@/lib/useSession';
import NotificationBell from './NotificationBell';
import RoleSwitcher from './RoleSwitcher';

const BASE_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/report-issue', label: 'Report', icon: Camera },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/civic-map', label: 'Map', icon: Map },
  { href: '/community-rankings', label: 'Ranks', icon: Trophy },
];

function ActiveBg() {
  return (
    <motion.span
      layoutId="nav-active"
      className="nav-active-bg"
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
    />
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { profile } = useSession();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const links = [...BASE_LINKS];

  // Role-based portal shortcuts
  const userRole = (profile?.role || '').toLowerCase();
  if (userRole === 'authority' || userRole === 'department_officer') {
    links.push({ href: '/authority', label: 'Officer', icon: Building2 });
  } else if (userRole === 'field_worker' || userRole === 'worker') {
    links.push({ href: '/field-operations', label: 'Tasks', icon: HardHat });
  } else if (userRole === 'municipal_admin' || userRole === 'admin') {
    links.push({ href: '/admin', label: 'City Admin', icon: Landmark });
  } else {
    // For easy testing, show quick portal link
    links.push({ href: '/authority', label: 'Officer', icon: Building2 });
  }

  return (
    <nav className="navbar">
      <motion.div
        className="navpill"
        initial={{ y: -22, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
      >
        <Link href="/" className="navpill-logo">
          <motion.span className="logo-badge" whileHover={{ rotate: -8, scale: 1.08 }} whileTap={{ scale: 0.94 }}>
            <ShieldCheck size={18} />
          </motion.span>
          <span className="hide-sm font-bold tracking-tight">
            CIVIC <span className="text-gradient">SENSE</span>
          </span>
        </Link>

        {links.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={`navpill-link ${active ? 'active' : ''}`} aria-label={label}>
              {active && <ActiveBg />}
              <span className="ico"><Icon size={17} /></span>
              <span className="label">{label}</span>
            </Link>
          );
        })}

        <RoleSwitcher />
        <NotificationBell />

        {profile ? (
          <Link href="/citizen-profile" className={`navpill-link ${isActive('/citizen-profile') || isActive('/profile') ? 'active' : ''}`} title={`${profile.name} (${profile.points ?? 0} pts)`} aria-label="Profile">
            {(isActive('/citizen-profile') || isActive('/profile')) && <ActiveBg />}
            <span className="ico" style={{ fontSize: 17, lineHeight: 1 }}>{profile.avatar}</span>
            <span className="label flex items-center gap-1">
              <span>{profile.name.split(' ')[0]}</span>
              {typeof profile.points === 'number' && (
                <span className="badge" style={{ fontSize: '0.68rem', padding: '0.05rem 0.35rem', background: 'rgba(234, 179, 8, 0.18)', color: '#b45309', fontWeight: 700, borderRadius: 'var(--radius-full)' }}>
                  ⭐ {profile.points}
                </span>
              )}
            </span>
          </Link>
        ) : (
          <Link href="/authentication" className={`navpill-link ${isActive('/authentication') || isActive('/login') ? 'active' : ''}`} aria-label="Sign in">
            {(isActive('/authentication') || isActive('/login')) && <ActiveBg />}
            <span className="ico"><LogIn size={17} /></span>
            <span className="label">Sign in</span>
          </Link>
        )}
      </motion.div>
    </nav>
  );
}
