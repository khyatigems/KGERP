export default function DashboardLoading() {
  return (
    <div className="relative w-full">
      <div className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden rounded-full bg-primary/10">
        <div className="h-full w-1/3 rounded-full bg-primary animate-progress-indeterminate" />
      </div>
    </div>
  );
}
