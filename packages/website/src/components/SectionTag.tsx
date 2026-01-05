type SectionTagProps = {
  children: React.ReactNode;
};

export function SectionTag({ children }: SectionTagProps) {
  return <div className="font-medium uppercase text-orange-600 text-[12px]">{children}</div>;
}
