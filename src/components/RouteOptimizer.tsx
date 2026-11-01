'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Route,
  Truck,
  Fuel,
  Clock,
  ExternalLink,
  MapPin,
  Leaf,
} from 'lucide-react';
import { CITY, haversine, humanDistance, projectToMap } from '@/lib/geo';
import { CategoryIcon, SeverityBadge, priorityColor } from '@/components/ui';
import type { Issue } from '@/lib/types';

// ---------------------------------------------------------------------------
// Smart dispatch routing: solves the Traveling Salesperson Problem over the
// department's open issues (nearest-neighbour construction + 2-opt refinement)
// so a single crew visits every stop on the shortest tour. Compares against the
// naive priority-order dispatch to show the km / time / CO₂ saved.
// ---------------------------------------------------------------------------

type Stop = Pick<
  Issue,
  'id' | 'ref' | 'title' | 'category' | 'severity' | 'priority' | 'geo' | 'location' | 'status' | 'department'
>;

const DEPOT = { name: 'City Corporation Depot', geo: CITY.center };
const CITY_SPEED_KMH = 22; // realistic urban crew-truck average
const SERVICE_MIN_PER_STOP = 25;
const CO2_KG_PER_KM = 0.35; // light municipal truck

function tourLength(order: Stop[]): number {
  let d = haversine(DEPOT.geo, order[0].geo);
  for (let i = 0; i < order.length - 1; i++) d += haversine(order[i].geo, order[i + 1].geo);
  return d;
}

/** Nearest-neighbour construction then 2-opt refinement. */
function optimize(stops: Stop[]): Stop[] {
  if (stops.length <= 1) return stops;

  // construction
  const remaining = [...stops];
  const tour: Stop[] = [];
  let cur = DEPOT.geo;
  while (remaining.length) {
    let bi = 0;
    let bd = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(cur, remaining[i].geo);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    const [next] = remaining.splice(bi, 1);
    tour.push(next);
    cur = next.geo;
  }

  // 2-opt refinement
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < tour.length - 1; i++) {
      for (let k = i + 1; k < tour.length; k++) {
        const candidate = [...tour.slice(0, i), ...tour.slice(i, k + 1).reverse(), ...tour.slice(k + 1)];
        if (tourLength(candidate) < tourLength(tour) - 1) {
          tour.splice(0, tour.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return tour;
}

function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${Math.round(min % 60)}m`;
}

export default function RouteOptimizer({ issues }: { issues: Stop[] }) {
  const departments = useMemo(
    () => [...new Set(issues.map((i) => i.department))],
    [issues],
  );
  const [dept, setDept] = useState<string>('all');

  const stops = useMemo(() => {
    const filtered = dept === 'all' ? issues : issues.filter((i) => i.department === dept);
    return filtered.slice(0, 23); // one crew shift's worth
  }, [issues, dept]);

  const { tour, optKm, naiveKm } = useMemo(() => {
    if (!stops.length) return { tour: [] as Stop[], optKm: 0, naiveKm: 0 };
    const naive = [...stops].sort((a, b) => b.priority - a.priority);
    const optimized = optimize(stops);
    return {
      tour: optimized,
      optKm: tourLength(optimized) / 1000,
      naiveKm: tourLength(naive) / 1000,
    };
  }, [stops]);

  const savedKm = Math.max(0, naiveKm - optKm);
  const driveMin = (optKm / CITY_SPEED_KMH) * 60;
  const totalMin = driveMin + tour.length * SERVICE_MIN_PER_STOP;

  const osmRouteUrl = useMemo(() => {
    if (!tour.length) return '#';
    const dest = tour[tour.length - 1];
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${DEPOT.geo.lat}%2C${DEPOT.geo.lng}%3B${dest.geo.lat.toFixed(5)}%2C${dest.geo.lng.toFixed(5)}`;
  }, [tour]);

  if (!issues.length) {
    return (
      <div className="glass-card center-text" style={{ padding: '3rem' }}>
        <p className="muted">🎉 No open issues to dispatch — the city is clear.</p>
      </div>
    );
  }

  const depotXY = projectToMap(DEPOT.geo);

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: '1.25rem' }}>
        <select
          className="input-field"
          style={{ maxWidth: 320 }}
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          aria-label="Filter by department"
        >
          <option value="all">All departments ({issues.length} open)</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d} ({issues.filter((i) => i.department === d).length})
            </option>
          ))}
        </select>
        <a className="btn btn-primary" href={osmRouteUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Start navigation in OpenStreetMap
        </a>
      </div>

      {/* dispatch stats */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Stat icon={<Truck size={16} />} label="Stops on tour" value={String(tour.length)} />
        <Stat icon={<Route size={16} />} label="Optimized distance" value={`${optKm.toFixed(1)} km`} />
        <Stat icon={<Clock size={16} />} label="Est. shift time" value={fmtMinutes(totalMin)} />
        <Stat
          icon={<Fuel size={16} />}
          label="Saved vs priority-order"
          value={`${savedKm.toFixed(1)} km (${naiveKm ? Math.round((savedKm / naiveKm) * 100) : 0}%)`}
        />
        <Stat icon={<Leaf size={16} />} label="CO₂ avoided" value={`${(savedKm * CO2_KG_PER_KM).toFixed(1)} kg`} />
      </div>

      <div className="two-col">
        {/* SVG tour map — works with zero API keys */}
        <div className="glass-card">
          <div className="section-title">
            <Route size={18} color="#7c3aed" />
            <h2 style={{ fontSize: '1.1rem' }}>Optimized tour</h2>
          </div>
          <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)', background: 'var(--card-2, rgba(124,58,237,0.04))', border: '1px solid var(--surface-border)' }}>
            {/* route polyline */}
            <polyline
              fill="none"
              stroke="#7c3aed"
              strokeWidth="0.7"
              strokeDasharray="1.6 1.1"
              strokeLinecap="round"
              points={[depotXY, ...tour.map((s) => projectToMap(s.geo))]
                .map((p) => `${p.x},${p.y}`)
                .join(' ')}
            />
            {/* depot */}
            <g>
              <circle cx={depotXY.x} cy={depotXY.y} r="2.4" fill="#0f172a" />
              <text x={depotXY.x} y={depotXY.y + 0.9} textAnchor="middle" fontSize="2.4" fill="#fff">D</text>
            </g>
            {/* stops */}
            {tour.map((s, i) => {
              const p = projectToMap(s.geo);
              return (
                <g key={s.id}>
                  <circle cx={p.x} cy={p.y} r="2.2" fill={priorityColor(s.priority)} />
                  <text x={p.x} y={p.y + 0.85} textAnchor="middle" fontSize="2.3" fill="#fff" fontWeight="700">
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="tiny muted" style={{ marginTop: '0.6rem' }}>
            <MapPin size={11} style={{ verticalAlign: '-1px' }} /> D = {DEPOT.name}. Tour solved with
            nearest-neighbour + 2-opt over live open issues.
          </p>
        </div>

        {/* ordered manifest */}
        <div className="glass-card">
          <div className="section-title">
            <Truck size={18} color="#7c3aed" />
            <h2 style={{ fontSize: '1.1rem' }}>Crew manifest</h2>
          </div>
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            {tour.map((s, i) => {
              const from = i === 0 ? DEPOT.geo : tour[i - 1].geo;
              const legM = haversine(from, s.geo);
              const etaMin =
                (tourLength(tour.slice(0, i + 1)) / 1000 / CITY_SPEED_KMH) * 60 + i * SERVICE_MIN_PER_STOP;
              return (
                <Link
                  key={s.id}
                  href={`/issues/${s.id}`}
                  className="flex items-center gap-3"
                  style={{ padding: '0.6rem 0.25rem', borderBottom: '1px solid var(--surface-border)', textDecoration: 'none', color: 'inherit' }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      minWidth: 26,
                      borderRadius: '50%',
                      background: priorityColor(s.priority),
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.title}
                    </div>
                    <div className="tiny muted flex items-center gap-1">
                      <CategoryIcon category={s.category} size={11} /> {s.location} · +{humanDistance(legM)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <SeverityBadge severity={s.severity} />
                    <div className="tiny muted" style={{ marginTop: 2 }}>ETA {fmtMinutes(etaMin)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="panel" style={{ padding: '0.85rem 1rem' }}>
      <div className="tiny muted flex items-center gap-1" style={{ marginBottom: '0.25rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{value}</div>
    </div>
  );
}
