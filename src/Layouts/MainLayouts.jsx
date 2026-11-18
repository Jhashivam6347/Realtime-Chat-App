import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function MainLayout() {
  const { pathname } = useLocation();
  const isChat = pathname === "/chat";

  return (
    <div className={isChat
      ? "min-h-[100dvh]"
      : "flex min-h-[100dvh] flex-col bg-gradient-to-br from-emerald-100 via-orange-100 to-slate-950 text-slate-900"}
    >
      {!isChat && <Header />}
      <main className={isChat ? "min-h-[100dvh]" : "flex w-full flex-1 items-center justify-center"}>
        <Outlet />
      </main>
      {!isChat && <Footer />}
    </div>
  );
}
