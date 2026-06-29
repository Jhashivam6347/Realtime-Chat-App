import { NavLink } from "react-router-dom";

export default function Header() {
  return (
    <header className="app-header">
      <nav className="app-nav">
        <NavLink
          to="/login"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Log in
        </NavLink>

        <NavLink
          to="/signup"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Sign up
        </NavLink>

      {/*
        <NavLink
          to="/chat"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Chat
        </NavLink>
         */}
      </nav>
    </header>
  );
}
