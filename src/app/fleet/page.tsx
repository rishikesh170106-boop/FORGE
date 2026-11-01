import type { Metadata } from 'next';
import { Video } from 'lucide-react';
import FleetScanner from '@/components/FleetScanner';

export const metadata: Metadata = {
  title: 'Fleet Watch — Community Hero',
  description:
    'Passive crowdsourcing: partner fleet dashcams scan the streets with Gemini Vision and auto-file civic issues — zero citizen effort.',
};

// Fleet Watch — moonshot: the city inspects itself. Partner fleets (delivery
// riders, garbage trucks) run dashcams; an edge AI inspector samples the drive
// and auto-files confident detections as geo-tagged work orders.
export default function FleetPage() {
  return (
    <div className="container animate-fade-in">
      <div className="flex items-center gap-3" style={{ marginBottom: '0.5rem' }}>
        <span className="logo-badge" style={{ width: 42, height: 42, borderRadius: 12 }}>
          <Video size={22} />
        </span>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Fleet Watch</h1>
          <p className="muted small">
            Passive crowdsourcing — partner dashcams scan the streets so citizens don&apos;t have to.
          </p>
        </div>
      </div>
      <p className="muted small" style={{ maxWidth: 720, marginBottom: '1.5rem' }}>
        Every delivery bike and garbage truck is a roving sensor. Upload a dashcam clip from a fleet
        vehicle&apos;s route: Gemini Vision inspects sampled frames for potholes, dumping, leaks and
        hazards, deduplicates against open reports, and files confident detections as geo-tagged work
        orders — automatically.
      </p>
      <FleetScanner />
    </div>
  );
}
