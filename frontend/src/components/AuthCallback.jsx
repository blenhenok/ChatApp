import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Completing sign in...");
  const [errorDetails, setErrorDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setIsLoading(true);

        // Check if this is an email verification redirect
        const type = searchParams.get("type");
        const isEmailVerification = type === "signup";

        if (isEmailVerification) {
          setMessage("Verifying your email...");
        }

        // Clear any existing tokens to prevent conflicts
        localStorage.removeItem("sb-auth-token");
        localStorage.removeItem("sb-refresh-token");

        // Handle the authentication callback
        const { error } = await supabase.auth.getSessionFromUrl({
          storeSession: true,
        });

        if (error) {
          console.error("Error handling auth callback:", error);
          setErrorDetails(error.message);

          // Special handling for token errors
          if (error.message.includes("token")) {
            await supabase.auth.signOut();
            localStorage.removeItem("sb-auth-token");
            localStorage.removeItem("sb-refresh-token");
            setMessage("Session expired. Redirecting to login...");
          } else {
            setMessage(`Error: ${error.message}. Redirecting to login...`);
          }

          setTimeout(() => {
            navigate("/login", {
              state: {
                error: error.message,
                from: "callback",
              },
            });
          }, 3000);
        } else {
          // Successfully authenticated
          if (isEmailVerification) {
            setMessage("Email verified successfully! Redirecting to chat...");
          } else {
            setMessage("Success! Redirecting to chat...");
          }

          setTimeout(() => navigate("/chat"), 2000);
        }
      } catch (err) {
        console.error("Unexpected error in auth callback:", err);
        setErrorDetails(err.message);
        setMessage("An unexpected error occurred. Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div
      style={{
        padding: "40px",
        textAlign: "center",
        maxWidth: "500px",
        margin: "50px auto",
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
      }}
    >
      <h2 style={{ marginBottom: "20px", color: "#333" }}>
        Authentication Status
      </h2>

      {isLoading ? (
        <div style={{ margin: "20px 0" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #007bff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          ></div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      ) : null}

      <p
        style={{
          fontSize: "18px",
          marginBottom: "10px",
          color: errorDetails ? "#d32f2f" : "#333",
        }}
      >
        {message}
      </p>

      {errorDetails && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#ffebee",
            border: "1px solid #ffcdd2",
            borderRadius: "4px",
            textAlign: "left",
          }}
        >
          <p
            style={{
              margin: "0",
              fontSize: "14px",
              color: "#d32f2f",
            }}
          >
            Error details: {errorDetails}
          </p>
        </div>
      )}

      {!isLoading && errorDetails && (
        <button
          onClick={() => navigate("/login")}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Return to Login
        </button>
      )}
    </div>
  );
}

export default AuthCallback;
