interface MaterialValidatorProps {
  materialsRequired: Record<string, number>; // { materialId: qty }
  onValidated: (results: any) => void;
}

export default function MaterialValidator({ materialsRequired, onValidated }: MaterialValidatorProps) {
  // Call /api/materials/check-availability
  // Display: green checkmark (ok), red alert (shortage)
  // Show shortage amounts
  return null;
}
