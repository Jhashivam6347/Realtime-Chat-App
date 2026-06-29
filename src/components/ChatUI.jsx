import { useState, useEffect, useRef } from "react";
import "../style/chat.css";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import Peer from "simple-peer";

const socket = io(import.meta.env.VITE_SOCKET_URL);

export default function ChatUI() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [activeUser, setActiveUser] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 991);
  const [showChatOnMobile, setShowChatOnMobile] = useState(window.innerWidth >= 991);

  // CALL STATES
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callType, setCallType] = useState("video");
  const [callTime, setCallTime] = useState(0);
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [imageModal, setImageModal] = useState(null);
  const [sentMessageCount, setSentMessageCount] = useState(0);
  const [messageLimitReached, setMessageLimitReached] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const userAudio = useRef(null);
  const connectionRef = useRef(null);
  const ringtone = useRef(new Audio("/ringtone.mp3"));
  const timerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const messageContextRef = useRef(null);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const parsedToken = token ? JSON.parse(atob(token.split(".")[1])) : {};
  const currentUserId = parsedToken?.id || null;
  const currentUserName = parsedToken?.name || localStorage.getItem("userName") || "Unknown";
  const messageLimitKey = currentUserId ? `messageLimit:${currentUserId}` : "messageLimit:guest";

  useEffect(() => {
    if (!currentUserId) {
      setSentMessageCount(0);
      setMessageLimitReached(false);
      return;
    }

    const savedCount = Number(localStorage.getItem(messageLimitKey) || 0);
    setSentMessageCount(savedCount);
    setMessageLimitReached(savedCount >= 3);
  }, [currentUserId, messageLimitKey]);

  /* JOIN */
  useEffect(() => {
    if (currentUserId) socket.emit("join", currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 991;
      setIsMobile(mobile);
      setShowChatOnMobile(!mobile);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* USERS */
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/userlist`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        if (data.length > 0) setActiveUser(data[0]);
      });
  }, []);

  /* MESSAGES */
  useEffect(() => {
    if (!activeUser) return;

    fetch(`${import.meta.env.VITE_API_URL}/messages/${activeUser._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(setMessages);

    fetch(`${import.meta.env.VITE_API_URL}/mark-seen/${activeUser._id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    setUsers(prev => prev.map(user =>
      user._id === activeUser._id ? { ...user, unreadCount: 0 } : user
    ));
  }, [activeUser]);

  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (messageContextRef.current && !messageContextRef.current.contains(event.target)) {
        setSelectedMessage(null);
      }
    }

    if (selectedMessage) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [selectedMessage]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        const emojiButton = event.target.closest("button");
        if (!emojiButton || !emojiButton.textContent.includes("😊")) {
          setShowEmoji(false);
        }
      }
    }

    if (showEmoji) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEmoji]);

  // Attach local stream to video element whenever the local video ref or call state changes
  useEffect(() => {
    if (stream && myVideo.current) {
      myVideo.current.srcObject = stream;
      console.log("Local stream attached to myVideo");
    }
  }, [stream, callAccepted, isCalling]);

  /* SOCKET */
  useEffect(() => {
    socket.on("incomingCall", ({ from, name, signal, type }) => {
      console.log("🔔 incomingCall received:", { from, name, callType: type, hasSignal: !!signal });
      setReceivingCall(true);
      setCaller(from);
      setCallerName(name || "Unknown Caller");
      setCallerSignal(signal);
      setCallType(type || "video");
      setRemoteUserId(from);
      ringtone.current.loop = true;
      ringtone.current.play().catch(err => console.log("Ringtone play failed:", err));
    });

    socket.on("callAccepted", signal => {
      setCallAccepted(true);
      setIsCalling(false);
      ringtone.current.pause();
      if (connectionRef.current) {
        connectionRef.current.signal(signal);
      }
      startTimer();
    });

    socket.on("callEnded", leaveCall);

    socket.on("receiveMessage", (message) => {
      if (activeUser && activeUser._id === message.senderId) {
        setMessages(prev => [...prev, message]);
        fetch(`${import.meta.env.VITE_API_URL}/mark-seen/${message.senderId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        setUsers(prev => prev.map(user => {
          if (user._id === message.senderId) {
            const count = (user.unreadCount || 0) + 1;
            return { ...user, unreadCount: count };
          }
          return user;
        }));
      }
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callAccepted");
      socket.off("callEnded");
      socket.off("receiveMessage");
    };
  }, [activeUser, token]);

  /* TIMER */
  function startTimer() {
    let sec = 0;
    setCallTime(0);
    timerRef.current = setInterval(() => {
      sec++;
      setCallTime(sec);
    }, 1000);
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /* SEND MESSAGE */
  function sendMessage() {
    if (messageLimitReached) {
      setShowLimitModal(true);
      return;
    }

    if ((!text.trim() && !document.querySelector('input[type="file"]')?.files?.[0]) || !activeUser) return;

    const tempId = `local-${Date.now()}`;
    const msg = {
      _id: tempId,
      clientMessageId: tempId,
      senderId: currentUserId,
      receiverId: activeUser._id,
      text,
      replyTo: replyingTo?._id || null,
    };

    socket.emit("sendMessage", msg, (savedMessage) => {
      setMessages(prev => prev.map(item => item._id === tempId ? savedMessage : item));
    });
    setMessages(prev => [...prev, msg]);
    setText("");
    setReplyingTo(null);

    const nextCount = sentMessageCount + 1;
    setSentMessageCount(nextCount);
    localStorage.setItem(messageLimitKey, String(nextCount));

    if (nextCount >= 3) {
      setMessageLimitReached(true);
      setShowLimitModal(true);
    }
  }

  /* FILE UPLOAD */
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (messageLimitReached) {
      setShowLimitModal(true);
      return;
    }

    if (!file || !activeUser) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      
      if (data.url) {
        const tempId = `local-${Date.now()}`;
        const msg = {
          _id: tempId,
          clientMessageId: tempId,
          senderId: currentUserId,
          receiverId: activeUser._id,
          text: `📎 ${file.name}`,
          mediaUrl: data.url,
          mediaType: data.type,
          replyTo: replyingTo?._id || null,
        };

        socket.emit("sendMessage", msg, (savedMessage) => {
          setMessages(prev => prev.map(item => item._id === tempId ? savedMessage : item));
        });
        setMessages(prev => [...prev, msg]);
        setReplyingTo(null);
        fileInputRef.current.value = "";

        const nextCount = sentMessageCount + 1;
        setSentMessageCount(nextCount);
        localStorage.setItem(messageLimitKey, String(nextCount));

        if (nextCount >= 3) {
          setMessageLimitReached(true);
          setShowLimitModal(true);
        }
      }
    } catch (err) {
      console.error("File upload failed:", err);
      alert("File upload failed");
    }
  }

  /* CALL USER */

  async function callUser(video = true) {
    if (!activeUser) return;

    try {
      setIsCalling(true);
      setCallerName(activeUser.name);
      setCallType(video ? "video" : "audio");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: true,
      });

      setStream(mediaStream);

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on("signal", (data) => {
        console.log("Peer signal event (caller)", data);
        socket.emit("callUser", {
          to: activeUser._id,
          from: currentUserId,
          signal: data,
          name: currentUserName,
          type: video ? "video" : "audio",
        });
      });

      peer.on("stream", (remoteStream) => {
        console.log("Received remote stream (caller)", remoteStream);
        if (video && userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        } else if (!video && userAudio.current) {
          userAudio.current.srcObject = remoteStream;
        }
      });

      peer.on("error", (err) => console.error("Peer error (caller):", err));
      peer.on("close", () => console.log("Peer connection closed (caller)"));

      setRemoteUserId(activeUser._id);
      connectionRef.current = peer;

    } catch (err) {
      console.error("Call error:", err);
      alert("Error starting call: " + err.message);
      setIsCalling(false);
    }
  }

  /* ACCEPT CALL */
  async function acceptCall() {
    setCallAccepted(true);
    setReceivingCall(false);
    ringtone.current.pause();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });

      setStream(mediaStream);
      console.log("Local media stream obtained (receiver)");

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on("signal", data => {
        console.log("Peer signal event (receiver)", data);
        socket.emit("acceptCall", {
          to: caller,
          signal: data,
        });
      });

      peer.on("stream", remoteStream => {
        console.log("Received remote stream (receiver)", remoteStream);
        if (callType === "video" && userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        } else if (callType === "audio" && userAudio.current) {
          userAudio.current.srcObject = remoteStream;
        }
      });

      peer.on("error", (err) => console.error("Peer error (receiver):", err));
      peer.on("close", () => console.log("Peer connection closed (receiver)"));

      if (callerSignal) {
        peer.signal(callerSignal);
        console.log("Signaled with caller signal");
      }

      connectionRef.current = peer;
      startTimer();
    } catch (err) {
      console.error("Error accepting call:", err);
      setCallAccepted(false);
      setReceivingCall(true);
    }
  }

  /* END CALL */
  function leaveCall() {
    setReceivingCall(false);
    setIsCalling(false);
    setCallAccepted(false);
    setCallerName("");
    setCallTime(0);
    setRemoteUserId(null);
    setCallType("video"); // Reset to default

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    ringtone.current.pause();
    ringtone.current.currentTime = 0;
  }

  // Delete message
  async function deleteMessage(messageId) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/message/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const sameMessage = (message) => {
          const currentId = String(message?._id ?? "");
          const clientId = String(message?.clientMessageId ?? "");
          return currentId === String(messageId) || clientId === String(messageId);
        };

        setMessages(prev => prev.filter(message => !sameMessage(message)));
        setSelectedMessage(null);
      } else {
        alert("Failed to delete message");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting message");
    }
  }

  // Set reply message
  function replyToMessage(message) {
    setReplyingTo(message);
    setSelectedMessage(null);
  }

  function endCall() {
    const to = remoteUserId || activeUser?._id || caller;
    if (to) {
      socket.emit("endCall", { to });
    }
    leaveCall();
  }

  function rejectCall() {
    socket.emit("endCall", { to: caller });
    leaveCall();
  }

  const chatHeaderInitial = activeUser?.name?.charAt(0).toUpperCase();
  const currentUserInitial = currentUserName?.charAt(0).toUpperCase();

  return (
    <div className="chat-container">
      {(!isMobile || !showChatOnMobile) && (
        <div className="sidebar">
          <div className="sidebar-profile">
            <div className="sidebar-avatar">{currentUserInitial}</div>
            <div className="sidebar-profile-info">
              <strong>{currentUserName}</strong>
              <span>My Profile</span>
            </div>
          </div>

          <h3>Chats</h3>
          <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="chat-list">
          {users
          .filter(u =>
            u.name.toLowerCase().includes(search.toLowerCase())
          )
          .map(u => (
            <div
              key={u._id}
              className={activeUser?._id === u._id ? "active user" : "user"}
              onClick={() => {
                setActiveUser(u);
                if (isMobile) setShowChatOnMobile(true);
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="user-avatar">{u.name?.charAt(0).toUpperCase()}</div>
                <span>{u.name}</span>
              </div>
              {u.unreadCount > 0 && (
                <span className="badge">
                  {u.unreadCount > 99 ? "99+" : u.unreadCount}
                </span>
              )}
            </div>
          ))}
        </div>
        </div>
      )}

      {(!isMobile || showChatOnMobile) && (
        <div className="chat-box">
          <div className="chat-header" style={{display:"flex",justifyContent:"space-between", alignItems: "center"}}>
            <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
              {isMobile && showChatOnMobile && (
                <button className="back-btn" onClick={() => setShowChatOnMobile(false)}>← Back</button>
              )}

              <div className="chat-header-content">
                <div className="chat-header-avatar">{chatHeaderInitial || "?"}</div>
                <div>
                  <div className="chat-header-name">
                    {activeUser ? activeUser.name : "Select a chat"}
                  </div>
                  <div className="chat-header-subtitle">
                    {activeUser ? "Online" : "Tap a contact to start"}
                  </div>
                </div>
              </div>
            </div>

            {activeUser && (
              <div style={{display:"flex",gap:"10px"}}>
                <button onClick={() => callUser(false)}>📞</button>
                <button onClick={() => callUser(true)}>🎥</button>
              </div>
            )}
          </div>

        <div className="messages">
          {messages.map(m => {
            const isOwn = m.senderId === currentUserId;
            const isSelected = selectedMessage?._id === m._id;
            const repliedMessage = m.replyTo ? messages.find(msg => msg._id === m.replyTo) : null;
            
            return (
              <div
                key={m._id}
                className={`message ${isOwn ? "right" : "left"} ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedMessage(isSelected ? null : m)}
                style={{ position: "relative", cursor: "pointer" }}
                id={`msg-${m._id}`}
              >
                {repliedMessage && (
                  <div 
                    className="message-reply-content"
                    onClick={(e) => {
                      e.stopPropagation();
                      const element = document.getElementById(`msg-${repliedMessage._id}`);
                      element?.scrollIntoView({ behavior: "smooth", block: "center" });
                      setSelectedMessage(repliedMessage);
                    }}
                  >
                    <strong>{repliedMessage.senderId === currentUserId ? "You" : callerName || "User"}</strong>
                    <p>{repliedMessage.text}</p>
                  </div>
                )}
                
                {m.mediaUrl && (m.mediaType === "image" || m.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                  <img 
                    src={m.mediaUrl} 
                    alt="sent file"
                    style={{maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", cursor: "pointer"}}
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageModal({url: m.mediaUrl, fileName: m.text});
                    }}
                  />
                ) : m.mediaUrl && (m.mediaType === "video" || m.mediaUrl.match(/\.(mp4|webm|mov)$/i)) ? (
                  <video 
                    src={m.mediaUrl} 
                    controls
                    style={{maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", backgroundColor: "#000"}}
                  />
                ) : m.mediaUrl ? (
                  <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" style={{color: "#3ae7c7", textDecoration: "underline"}}>
                    {m.text}
                  </a>
                ) : (
                  <span>{m.text}</span>
                )}
                
                {isSelected && (
                  <div ref={messageContextRef} className="message-context-menu">
                    {isOwn && (
                      <button onClick={() => deleteMessage(m._id)} className="delete-btn">
                        🗑️ Delete
                      </button>
                    )}
                    <button onClick={() => replyToMessage(m)} className="reply-btn">
                      ↩️ Reply
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {replyingTo && (
          <div className="reply-preview">
            <div className="reply-preview-content">
              <strong>Replying to:</strong>
              <p>{replyingTo.text}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="reply-close">✕</button>
          </div>
        )}

        <div className="chat-input">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder={messageLimitReached ? "Message access limit reached" : "Type a message..."}
            disabled={messageLimitReached}
          />

          <button onClick={() => setShowEmoji(!showEmoji)} className="emoji-btn">😊</button>

          <div ref={emojiPickerRef}>
            {showEmoji && (
              <EmojiPicker
                onEmojiClick={e => setText(p => p + e.emoji)}
              />
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            style={{display: "none"}}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <button onClick={() => fileInputRef.current?.click()} className="emoji-btn" title="Upload file" disabled={messageLimitReached}>📎</button>

          <button onClick={sendMessage} className="send-btn" disabled={messageLimitReached}>
            {messageLimitReached ? "Blocked" : "Send"}
          </button>
        </div>
      </div>
      )}

      {(receivingCall || isCalling || callAccepted) && (
        <div className="call-overlay">
          <div className="call-popup">
            <h3>
              {callAccepted
                ? `${callerName} • ${formatTime(callTime)}`
                : isCalling
                ? `Calling ${callerName}...`
                : `${callerName} is calling...`}
            </h3>


            {isCalling && callType === "video" && (
              <div className="video-box">
                <video ref={myVideo} autoPlay muted playsInline style={{width: "100%", height: "200px", backgroundColor: "#000", borderRadius: "10px"}} />
              </div>
            )}

            {callAccepted && callType === "video" && (
              <div className="video-box" style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "15px 0"}}>
                <div>
                  <video key="myVideo" ref={myVideo} autoPlay muted playsInline style={{width: "100%", height: "150px", backgroundColor: "#000", borderRadius: "10px", objectFit: "cover"}} />
                  <small style={{display: "block", textAlign: "center", marginTop: "5px", opacity: 0.7}}>You</small>
                </div>
                <div>
                  <video key="userVideo" ref={userVideo} autoPlay playsInline style={{width: "100%", height: "150px", backgroundColor: "#000", borderRadius: "10px", objectFit: "cover"}} />
                  <small style={{display: "block", textAlign: "center", marginTop: "5px", opacity: 0.7}}>{callerName}</small>
                </div>
              </div>
            )}

            {callType === "audio" && (
              <>
                <div className="audio-call">
                  <div className="audio-icon">🎤</div>
                </div>
                <audio ref={userAudio} autoPlay />
              </>
            )}

            <div className="call-buttons">
              {!callAccepted ? (
                receivingCall ? (
                  <>
                    <button onClick={acceptCall}>Accept</button>
                    <button onClick={rejectCall}>Reject</button>
                  </>
                ) : (
                  <button onClick={endCall}>Cancel</button>
                )
              ) : (
                <button onClick={endCall}>End Call</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showLimitModal && (
        <div className="access-limit-modal" onClick={() => setShowLimitModal(false)}>
          <div className="access-limit-card" onClick={(e) => e.stopPropagation()}>
            <div className="access-limit-icon">🔒</div>
            <h3>Message access limit reached</h3>
            <p>You do not have access to send more than 3 messages.</p>
            <button onClick={() => setShowLimitModal(false)}>Okay</button>
          </div>
        </div>
      )}

      {/* IMAGE/FILE MODAL */}
      {imageModal && (
        <div className="image-modal" onClick={() => setImageModal(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setImageModal(null)}>✕</button>
            <a 
              href={imageModal.url} 
              download 
              className="download-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              ⬇️ Download
            </a>
            <img src={imageModal.url} alt="preview" style={{maxWidth: "100%", maxHeight: "80vh", borderRadius: "12px"}} />
          </div>
        </div>
      )}
    </div>
  );
}