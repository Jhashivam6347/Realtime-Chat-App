import AuthForm from '../components/AuthForm'
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  async function handleSignup(payload) {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.msg || "Signup failed");
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        if (data.user?.name) {
          localStorage.setItem("userName", data.user.name);
        }
      }

      alert("Signup successful 🎉");
      navigate('/chat');
    } catch (err) {
      console.error(err);
      alert("Server not reachable");
    }
  }

  return <AuthForm mode="signup" onSubmit={handleSignup} />
}
