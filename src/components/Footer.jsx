export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-slate-950/75 px-4 py-4 text-center text-sm text-slate-400">
      © {new Date().getFullYear()} All Rights Reserved.
    </footer>
  );
}
