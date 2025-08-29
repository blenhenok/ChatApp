import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { error } = await supabase.auth.getSessionFromUrl({
          storeSession: true,
        });

        if (error) {
          console.error("Error handling auth callback:", error);
          setMessage(`Error: ${error.message}. Redirecting to login...`);
          setTimeout(
            () => navigate("/login", { state: { error: error.message } }),
            3000
          );
        } else {
          setMessage("Success! Redirecting to chat...");
          setTimeout(() => navigate("/chat"), 2000);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setMessage("An unexpected error occurred. Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>Authentication Status</h2>
      <p>{message}</p>
    </div>
  );
}

export default AuthCallback;
