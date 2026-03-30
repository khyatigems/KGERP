export default function Loading() {
  return (
    <div className="flex flex-col flex-1 space-y-8 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Loading Manual Journal Entry...</h1>
      <div className="animate-pulse flex flex-col space-y-4">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );
}
