import AuthForm from '../components/AuthForm'
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { useAuth } from "../auth/useAuth";

export default function Signup() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  async function handleSignup(payload) {
    const data = await apiRequest("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    signIn(data);
    navigate("/chat", { replace: true });
  }

  return <AuthForm mode="signup" onSubmit={handleSignup} />
}
