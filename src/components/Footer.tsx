import { ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site">
      <div className="container flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} color="#702D3B" />
          <span style={{ fontWeight: 600, color: 'var(--charcoal)' }}>
            CIVIC SENSE — <span style={{ fontWeight: 400, color: 'var(--secondary-gray)' }}>Smarter communities. Better cities.</span>
          </span>
        </div>
        <div className="muted tiny">
          CIVIC SENSE · Powered by Local Engine & Gemini Vision · Municipal Operations Platform
        </div>
      </div>
    </footer>
  );
}
