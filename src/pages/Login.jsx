import AuthForm from '../components/AuthForm'
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  async function handleLogin(payload) {
    try {
      console.log('Login submit', payload)

      const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("userName", result.user.name);
        navigate('/chat')
      } else {
        alert(result.msg || 'Login failed ❌')
      }

    } catch (error) {
      console.error(error)
      alert('Server error. Try again later.')
    }
  }

  return <AuthForm mode="login" onSubmit={handleLogin} />
}
