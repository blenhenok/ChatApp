import { useState } from "react";
import { supabase } from "./lib/supabaseClient"; 

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleSignUp = async () => {
    try {
      console.log("Attempting signup with:", { email, username });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      console.log("Signup response:", { data, error });

      if (error) {
        console.error("Signup error details:", error);
        alert(`Signup failed: ${error.message}`);
      } else {
        alert(
          "Check your email for verification! You may need to check your spam folder."
        );
      }
    } catch (err) {
      console.error("Unexpected error during signup:", err);
      alert(
        "An unexpected error occurred. Please check the console for details."
      );
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
  };

  return (
    <div>
      <h1>Chat App Login</h1>
      <input
        type="text"
        placeholder="Username (only for signup)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignUp}>Sign Up</button>
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default App;
