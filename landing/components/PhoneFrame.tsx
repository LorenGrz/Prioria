export default function PhoneFrame({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-[560px] w-[280px] overflow-hidden rounded-[2.5rem] border-[10px] border-[#131b2e] bg-black shadow-2xl">
        <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-[#131b2e]" />
        <div className="h-full w-full overflow-hidden">{children}</div>
      </div>
      <span className="text-sm font-semibold text-on-surface-variant">{label}</span>
    </div>
  );
}
