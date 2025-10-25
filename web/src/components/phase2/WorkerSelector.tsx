interface WorkerSelectorProps {
  stationId?: number;
  shiftId?: string;
  date?: Date;
  showSuggestions?: boolean;
  onChange: (workerId: string) => void;
}

export default function WorkerSelector({ stationId, shiftId, date, showSuggestions, onChange }: WorkerSelectorProps) {
  // If showSuggestions: fetch from /api/workers/suggest
  // Display with reasoning: "High performer (85/100), worked 12 shifts at this station"
  // Allow manual selection too
  return null;
}
