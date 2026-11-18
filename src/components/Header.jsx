import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { endSession } from "../lib/api";

export default function Header() {
  const { status } = useAuth();

  return (
    <header className="border-b border-white/10 bg-slate-950/75 px-4 py-3 text-white shadow-lg backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <NavLink to={status === "authenticated" ? "/chat" : "/"} className="font-bold tracking-tight">
          Realtime Chat
        </NavLink>
        <div className="flex items-center gap-2">
        {status === "authenticated" ? (
          <button
            type="button"
            onClick={() => endSession()}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Sign out
          </button>
        ) : (
          <>
        <NavLink
          to="/login"
          className={({ isActive }) => `rounded-lg px-4 py-2 text-sm transition ${isActive ? "bg-white text-slate-900" : "text-slate-200 hover:bg-white/10"}`
          }
        >
          Log in
        </NavLink>

        <NavLink
          to="/signup"
          className={({ isActive }) => `rounded-lg px-4 py-2 text-sm transition ${isActive ? "bg-white text-slate-900" : "text-slate-200 hover:bg-white/10"}`
          }
        >
          Sign up
        </NavLink>
          </>
        )}
        </div>
      </nav>
    </header>
  );
}
