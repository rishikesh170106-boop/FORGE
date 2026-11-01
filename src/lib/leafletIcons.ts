import L from 'leaflet';

/**
 * Custom vector HTML markers for Leaflet.
 * Completely eliminates broken asset issues (marker-icon.png 404s) and allows
 * dynamic coloring matching Vibe2Ship's civic severity palette.
 */

export function createIssuePin(color: string): L.DivIcon {
  const svg = `
    <div style="position: relative; width: 30px; height: 38px; transform: translate(-50%, -100%);">
      <svg viewBox="0 0 30 38" width="30" height="38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
        <path d="M15 0C6.71573 0 0 6.71573 0 15C0 24 15 38 15 38C15 38 30 24 30 15C30 6.71573 23.2843 0 15 0Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="15" cy="14" r="6" fill="#ffffff"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'leaflet-issue-marker',
    html: svg,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -38],
  });
}

export function createPickerPin(): L.DivIcon {
  const svg = `
    <div style="position: relative; width: 34px; height: 42px; transform: translate(-50%, -100%);">
      <svg viewBox="0 0 34 42" width="34" height="42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 10px rgba(37,99,235,0.45));">
        <path d="M17 0C7.61116 0 0 7.61116 0 17C0 27.2 17 42 17 42C17 42 34 27.2 34 17C34 7.61116 26.3888 0 17 0Z" fill="#2563eb" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="17" cy="16" r="7" fill="#ffffff"/>
        <circle cx="17" cy="16" r="3.5" fill="#2563eb"/>
      </svg>
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 3px; background: rgba(0,0,0,0.25); border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({
    className: 'leaflet-picker-marker',
    html: svg,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -42],
  });
}

