export function ImagePlaceholder() {
  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-gray-700"
      style={{ aspectRatio: "16 / 9" }}
    >
      <div className="h-full w-full scale-108 bg-linear-to-br from-blue-700 to-blue-300 blur-sm"></div>
    </div>
  );
}
