type ComponentDemoButtonProps = {
  title: string;
  isActive?: boolean;
  onClick?: () => void;
};

export function ComponentDemoButton({
  title,
  isActive = false,
  onClick,
}: ComponentDemoButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-lg px-2 py-1 text-sm ${
        isActive
          ? "bg-orange-500 text-white hover:bg-orange-600"
          : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
      }`}
    >
      {title}
    </button>
  );
}
