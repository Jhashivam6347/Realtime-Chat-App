import AuthForm from '../components/AuthForm'
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { useAuth } from "../auth/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  async function handleLogin(payload) {
    const result = await apiRequest("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    signIn(result);
    navigate("/chat", { replace: true });
  }

  return <AuthForm mode="login" onSubmit={handleLogin} />
}
