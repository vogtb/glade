type SubSectionWithArrowProps = {
  children: React.ReactNode;
};

export function SubSectionWithArrow({ children }: SubSectionWithArrowProps) {
  return (
    <div className="flex flex-row gap-0">
      <div className="relative w-10 sm:w-33.5 shrink-0">
        <span className="absolute left-0 top-0 text-orange-500 text-[24px] sm:hidden">↳</span>

        <svg
          className="absolute left-0 top-0 hidden sm:block"
          width="124"
          height="60"
          viewBox="0 0 124 60"
        >
          <path d="M 20 0 L 20 40 L 104 40" stroke="#f97316" strokeWidth="2" fill="none" />
          <path d="M 99 35 L 104 40 L 99 45" stroke="#f97316" strokeWidth="2" fill="none" />
        </svg>
      </div>

      <div className="flex-1 pt-0 sm:pt-6">{children}</div>
    </div>
  );
}
