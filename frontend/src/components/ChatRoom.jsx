import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { supabase } from "../lib/supabaseClient";

// Create socket connection
const socket = io(import.meta.env.VITE_BACKEND_URL, {
  withCredentials: true,
  autoConnect: true,
});

export function ChatRoom() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Get the current user
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      // Notify the server that this user joined
      if (user && socket.connected) {
        socket.emit("user_joined", user.id);
      }
    };

    getCurrentUser();

    // Socket event handlers
    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);

      // Notify server about user after connection is established
      if (user) {
        socket.emit("user_joined", user.id);
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    // Cleanup on unmount
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("receive_message");
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
          <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
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
            background: "#007bff",
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
