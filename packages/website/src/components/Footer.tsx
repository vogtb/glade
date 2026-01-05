export function Footer() {
  return (
    <div className="flex justify-center bg-white px-4 py-12">
      <div className="grid grid-cols-2 w-full max-w-5xl items-center">
        <div className="flex justify-start gap-8">
          <a href="/" className="flex items-center gap-2">
            <span className="text-[32px] leading-6.5">⚘</span>
            <span className="font-medium">Glade</span>
          </a>
        </div>

        <div className="flex gap-12 items-center justify-end">
          <a
            href="https://github.com/vogtb/glade"
            target="_blank"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Github ↗
          </a>

          <a
            href="https://vogt.world/"
            target="_blank"
            className="text-sm text-gray-600 hover:text-gray-900 font-normal"
          >
            <span className="font-medium">Ben Vogt ↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}
