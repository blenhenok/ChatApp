import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import socket from "../lib/socket";

export function ChatRoom() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const socketInitialized = useRef(false);

  const initializeSocket = useCallback(() => {
    if (!import.meta.env.VITE_BACKEND_URL) {
      setConnectionError("Backend URL not configured");
      return;
    }

    try {
      socket.on("connect", () => {
        setIsConnected(true);
        setConnectionError("");
        if (user) socket.emit("user_joined", user.id);
      });

      socket.on("disconnect", (reason) => {
        setIsConnected(false);
        if (reason === "io server disconnect") socket.connect();
      });

      socket.on("connect_error", (error) => {
        setConnectionError(`Connection failed: ${error.message}`);
        setIsConnected(false);
      });

      socket.on("receive_message", (data) => {
        setMessages((prev) => [...prev, data]);
      });

      if (!socket.connected) socket.connect();
    } catch (error) {
      setConnectionError(
        `Failed to initialize chat connection: ${error.message}`
      );
    }
  }, [user]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!socketInitialized.current && user) {
        initializeSocket();
        socketInitialized.current = true;
      }
    };

    getCurrentUser();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [initializeSocket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && user && isConnected) {
      socket.emit("send_message", {
        content: message,
        username: user.user_metadata?.username || user.email,
        userId: user.id,
      });
      setMessage("");
    }
  };

  const handleReconnect = () => {
    socket.connect();
  };

  const handleLogout = async () => {
    if (socket) socket.disconnect();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2>General Chat Room</h2>
          <p>Status: <span style={{ color: isConnected ? "green" : "red", fontWeight: "bold" }}>
            {isConnected ? "Connected" : "Disconnected"}
          </span></p>
          <p>Logged in as: {user?.user_metadata?.username || user?.email}</p>
        </div>
        <button onClick={handleLogout} style={{ padding: "10px 15px", background: "#ff4444", color: "white", border: "none", borderRadius: "4px" }}>
          Logout
        </button>
      </div>

      {connectionError && (
        <div style={{ padding: "10px", background: "#ffeeee", border: "1px solid #ffcccc", borderRadius: "4px", marginBottom: "10px" }}>
          <p style={{ color: "red", margin: 0 }}>{connectionError}</p>
          <button onClick={handleReconnect} style={{ marginTop: "5px", padding: "5px 10px" }}>Try to Reconnect</button>
        </div>
      )}

      <div style={{ height: "400px", overflowY: "scroll", border: "1px solid #ccc", padding: "10px", marginBottom: "10px", background: "#f9f9f9" }}>
        {messages.length === 0 ? (
          <p>No messages yet. {isConnected ? "Start the conversation!" : "Connect to the server to send messages."}</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} style={{ marginBottom: "10px", padding: "8px", background: "#fff", borderRadius: "4px" }}>
              <strong>{msg.username}:</strong> {msg.content}
              <div style={{ fontSize: "0.8em", color: "#666" }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isConnected ? "Type your message..." : "Connect to the server to send messages"}
          style={{ flex: 1, padding: "10px", marginRight: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
          disabled={!isConnected}
        />
        <button
          type="submit"
          style={{ padding: "10px 20px", background: isConnected ? "#007bff" : "#ccc", color: "white", border: "none", borderRadius: "4px" }}
          disabled={!message.trim() || !isConnected}
        >
          Send
        </button>
      </form>
    </div>
  );
}