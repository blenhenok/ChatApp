import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { supabase } from "../lib/supabaseClient";

const socket = io(import.meta.env.VITE_BACKEND_URL);

export function ChatRoom() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get the current user
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getCurrentUser();

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.off("receive_message");
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && user) {
      // Emit the message to the server with the actual username
      socket.emit("send_message", {
        content: message,
        username: user.user_metadata?.username || user.email,
      });
      setMessage("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>General Room</h2>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <div
        style={{
          height: "400px",
          overflowY: "scroll",
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        {messages.map((msg, index) => (
          <p key={index}>
            <strong>{msg.username}:</strong> {msg.content}
          </p>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: "10px", marginRight: "10px" }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
