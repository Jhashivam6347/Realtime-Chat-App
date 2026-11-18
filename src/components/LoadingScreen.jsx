export default function LoadingScreen({ message = "Restoring your session..." }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="fixed inset-x-0 top-0 h-1 overflow-hidden bg-white/10" role="progressbar" aria-label="Loading">
        <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-indigo-500 via-teal-400 to-amber-300" />
      </div>
      <div className="text-center">
        <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-white/20 border-t-indigo-400" />
        <p className="text-sm text-slate-300">{message}</p>
      </div>
    </main>
  );
}
