interface StationSelectorProps {
  value?: number;
  onChange: (stationId: number) => void;
  filterByType?: string;
}

export default function StationSelector({ value, onChange, filterByType }: StationSelectorProps) {
  // Load stations hierarchy
  // Display as tree or dropdown
  // Filter by type if provided
  return null;
}
