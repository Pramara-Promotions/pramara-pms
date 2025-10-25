interface BufferIndicatorProps {
  bufferDays: number;
}

export default function BufferIndicator({ bufferDays }: BufferIndicatorProps) {
  // Color: red (<2), yellow (2-5), green (>5)
  // Icon: ⚠️ (critical), ⏰ (warning), ✅ (safe)
  // Display: "2 days remaining"
  return null;
}
