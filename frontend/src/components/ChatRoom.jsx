import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { supabase } from "../lib/supabaseClient";

// Create socket connection with better configuration
const socket = io(import.meta.env.VITE_BACKEND_URL, {
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
});

export function ChatRoom() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    // Get the current user
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getCurrentUser();

    // Socket event handlers
    const onConnect = () => {
      console.log("Connected to server");
      setIsConnected(true);
      setConnectionError("");

      // Notify server about user after connection is established
      if (user) {
        socket.emit("user_joined", user.id);
      }
    };

    const onDisconnect = (reason) => {
      console.log("Disconnected from server:", reason);
      setIsConnected(false);

      if (reason === "io server disconnect") {
        // The server has forcefully disconnected the socket
        socket.connect(); // Try to reconnect
      }
    };

    const onConnectError = (error) => {
      console.log("Connection error:", error);
      setConnectionError(`Connection failed: ${error.message}`);
      setIsConnected(false);
    };

    const onReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    // Set up event listeners
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("receive_message", onReceiveMessage);

    // Manually try to connect if not connected
    if (!socket.connected) {
      console.log("Manually connecting...");
      socket.connect();
    }

    // Cleanup on unmount
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("receive_message", onReceiveMessage);
    };
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && user && isConnected) {
      // Emit the message to the server
      socket.emit("send_message", {
        content: message,
        username: user.user_metadata?.username || user.email,
        userId: user.id,
      });
      setMessage("");
    }
  };

  const handleReconnect = () => {
    console.log("Manual reconnect attempt");
    socket.connect();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2>General Chat Room</h2>
          <p>
            Status:
            <span
              style={{
                color: isConnected ? "green" : "red",
                fontWeight: "bold",
              }}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </p>
          <p>Logged in as: {user?.user_metadata?.username || user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: "10px 15px",
            background: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Logout
        </button>
      </div>

      {connectionError && (
        <div
          style={{
            padding: "10px",
            background: "#ffeeee",
            border: "1px solid #ffcccc",
            borderRadius: "4px",
            marginBottom: "10px",
          }}
        >
          <p style={{ color: "red", margin: 0 }}>{connectionError}</p>
          <button
            onClick={handleReconnect}
            style={{ marginTop: "5px", padding: "5px 10px" }}
          >
            Try to Reconnect
          </button>
        </div>
      )}

      <div
        style={{
          height: "400px",
          overflowY: "scroll",
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px",
          background: "#f9f9f9",
        }}
      >
        {messages.length === 0 ? (
          <p>No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                marginBottom: "10px",
                padding: "8px",
                background: "#fff",
                borderRadius: "4px",
              }}
            >
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
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: "10px",
            marginRight: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          disabled={!isConnected}
        />
        <button
          type="submit"
          style={{
            padding: "10px 20px",
            background: isConnected ? "#007bff" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
          disabled={!message.trim() || !isConnected}
        >
          Send
        </button>
      </form>
    </div>
  );
}
