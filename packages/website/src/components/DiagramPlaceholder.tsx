export function DiagramPlaceholder() {
  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-gray-300"
      style={{ aspectRatio: "16 / 5" }}
    >
      <div className="h-full w-full scale-108 bg-linear-to-br from-gray-200 to-gray-100 blur-sm"></div>
    </div>
  );
}
