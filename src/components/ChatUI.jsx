import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import Peer from "simple-peer";
import { API_URL, apiRequest, authHeaders, endSession } from "../lib/api";
import { useAuth } from "../auth/useAuth";

const socket = io(import.meta.env.VITE_SOCKET_URL || API_URL, {
  autoConnect: false,
});

export default function ChatUI() {
  const { user, accessToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [activeUser, setActiveUser] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 991);
  const [showChatOnMobile, setShowChatOnMobile] = useState(window.innerWidth >= 991);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");

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

  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const userAudio = useRef(null);
  const connectionRef = useRef(null);
  const ringtone = useRef(new Audio("/ringtone.mp3"));
  const timerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const messageContextRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const leaveCallRef = useRef(null);
  const activeUserRef = useRef(activeUser);
  activeUserRef.current = activeUser;

  const currentUserId = user?.id || null;
  const currentUserName = user?.name || "Unknown";

  useEffect(() => {
    if (!accessToken || !currentUserId) return undefined;

    socket.auth = { token: accessToken };
    socket.connect();
    return () => socket.disconnect();
  }, [accessToken, currentUserId]);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 991;
      setIsMobile(mobile);
      if (!mobile) {
        setShowChatOnMobile(true);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && activeUser) {
      setShowChatOnMobile(true);
    }
  }, [activeUser, isMobile]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingUsers(true);
    apiRequest("/userlist", { headers: authHeaders() })
      .then((data) => {
        if (cancelled) return;
        setUsers(data);
        setActiveUser((current) => current || data[0] || null);
      })
      .catch((error) => { if (!cancelled) setChatError(error.message); })
      .finally(() => { if (!cancelled) setIsLoadingUsers(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!activeUser) { setMessages([]); return undefined; }
    let cancelled = false;
    setMessages([]);
    setChatError("");
    setIsLoadingMessages(true);
    apiRequest("/messages/" + activeUser._id, { headers: authHeaders() })
      .then((data) => {
        if (cancelled) return;
        setMessages((previous) => {
          const merged = new Map(data.map((message) => [String(message._id), message]));
          previous.forEach((message) => merged.set(String(message._id), message));
          return [...merged.values()].sort(
            (left, right) => new Date(left.createdAt) - new Date(right.createdAt),
          );
        });
      })
      .catch((error) => { if (!cancelled) setChatError(error.message); })
      .finally(() => { if (!cancelled) setIsLoadingMessages(false); });
    apiRequest("/mark-seen/" + activeUser._id, {
      method: "PUT", headers: authHeaders(),
    }).catch((error) => { if (!cancelled) setChatError(error.message); });
    setUsers((previous) => previous.map((user) =>
      user._id === activeUser._id ? { ...user, unreadCount: 0 } : user
    ));
    return () => { cancelled = true; };
  }, [activeUser]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
  }, [messages]);

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

  useEffect(() => {
    const handleIncomingCall = ({ from, name, signal, type }) => {
      setReceivingCall(true);
      setCaller(from);
      setCallerName(name || "Unknown Caller");
      setCallerSignal(signal);
      setCallType(type || "video");
      setRemoteUserId(from);
      ringtone.current.loop = true;
      ringtone.current.play().catch((error) => console.warn("Ringtone playback unavailable:", error));
    };
    const handleCallAccepted = (signal) => {
      setCallAccepted(true);
      setIsCalling(false);
      ringtone.current.pause();
      if (connectionRef.current) connectionRef.current.signal(signal);
      startTimer();
    };
    const handleReceiveMessage = (message) => {
      if (activeUser?._id === message.senderId) {
        setMessages((previous) => previous.some((item) => item._id === message._id)
          ? previous : [...previous, message]
        );
        apiRequest("/mark-seen/" + message.senderId, {
          method: "PUT", headers: authHeaders(),
        }).catch((error) => setChatError(error.message));
      } else {
        setUsers((previous) => previous.map((user) => user._id === message.senderId
          ? { ...user, unreadCount: (user.unreadCount || 0) + 1 }
          : user
        ));
      }
    };
    const handlePresence = (userIds) => setOnlineUsers(userIds);
    const handleUserStatus = ({ userId, online }) => {
      setOnlineUsers((previous) => online
        ? [...new Set([...previous, userId])]
        : previous.filter((id) => id !== userId)
      );
    };
    const handleConnectError = (error) => setChatError(error.message || "Chat connection failed");
    const handleCallEnded = () => leaveCallRef.current?.();
    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callEnded", handleCallEnded);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("presence", handlePresence);
    socket.on("userStatus", handleUserStatus);
    socket.on("connect_error", handleConnectError);
    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callEnded", handleCallEnded);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("presence", handlePresence);
      socket.off("userStatus", handleUserStatus);
      socket.off("connect_error", handleConnectError);
    };
  }, [activeUser]);

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

  function sendMessage() {
    const messageText = text.trim();
    if (!messageText || !activeUser || isSending) return;
    if (!socket.connected) {
      setChatError("Chat is reconnecting. Please try again in a moment.");
      return;
    }
    setIsSending(true);
    setChatError("");
    const clientMessageId = globalThis.crypto?.randomUUID?.() ||
      "message-" + Date.now() + "-" + Math.random();
    const message = {
      senderId: currentUserId,
      receiverId: activeUser._id,
      text: messageText,
      replyTo: replyingTo?._id || null,
      clientMessageId,
    };
    setText("");
    setReplyingTo(null);
    socket.timeout(10000).emit("sendMessage", message, (timeoutError, response, legacyResponse) => {
      setIsSending(false);
      const result = response?.success !== undefined ? response : legacyResponse;
      if (timeoutError || !result?.success) {
        setChatError(result?.msg || "Message could not be sent. Please try again.");
        if (activeUserRef.current?._id === message.receiverId) {
          setText((current) => current || messageText);
        }
        return;
      }
      if (activeUserRef.current?._id !== message.receiverId) return;
      setMessages((previous) => previous.some((item) => item._id === result.message._id)
        ? previous : [...previous, result.message]
      );
    });
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !activeUser || isSending) return;
    setIsSending(true);
    setChatError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await apiRequest("/upload", {
        method: "POST", headers: authHeaders(), body: formData,
      });
      const clientMessageId = globalThis.crypto?.randomUUID?.() ||
        "message-" + Date.now() + "-" + Math.random();
      const message = {
        senderId: currentUserId,
        receiverId: activeUser._id,
        text: "File: " + file.name,
        mediaUrl: uploaded.url,
        mediaType: uploaded.type,
        replyTo: replyingTo?._id || null,
        clientMessageId,
      };
      const response = await new Promise((resolve, reject) => {
        socket.timeout(10000).emit("sendMessage", message, (timeoutError, result, legacyResult) => {
          if (timeoutError) reject(new Error("Chat connection timed out. Please try again."));
          else {
            const response = result?.success !== undefined ? result : legacyResult;
            if (!response?.success) reject(new Error(response?.msg || "File message could not be sent"));
            else resolve(response);
          }
        });
      });
      if (activeUserRef.current?._id === message.receiverId) {
        setMessages((previous) => [...previous, response.message]);
      }
      setReplyingTo(null);
    } catch (error) {
      setChatError(error.message || "File upload failed");
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  leaveCallRef.current = leaveCall;

  async function deleteMessage(messageId) {
    try {
      await apiRequest("/message/" + messageId, {
        method: "DELETE", headers: authHeaders(),
      });
      setMessages((previous) => previous.filter((message) =>
        String(message._id) !== String(messageId) &&
        String(message.clientMessageId) !== String(messageId)
      ));
      setSelectedMessage(null);
    } catch (error) {
      setChatError(error.message || "Message could not be deleted");
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
    <div className="relative isolate flex h-screen h-[100dvh] w-full gap-3 overflow-hidden bg-[radial-gradient(ellipse_at_18%_18%,rgba(111,245,171,0.44),transparent_35%),radial-gradient(ellipse_at_82%_25%,rgba(247,181,125,0.38),transparent_35%),radial-gradient(ellipse_at_48%_80%,rgba(195,153,220,0.4),transparent_40%),linear-gradient(180deg,#24433b_0%,#111827_100%)] p-3 text-slate-100 max-[991px]:gap-2 max-[991px]:p-2">
      {(!isMobile || !showChatOnMobile) && (
        <div className="flex w-[min(350px,30%)] shrink-0 flex-col overflow-y-auto rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur-xl max-[991px]:w-full">
          <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-500 font-bold text-white">{currentUserInitial}</div>
            <div className="min-w-0">
              <strong className="block truncate text-base">{currentUserName}</strong>
              <span className="text-sm text-slate-300">My Profile</span>
            </div>
            <button type="button" onClick={() => endSession()} className="ml-auto rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white" title="Sign out">Sign out</button>
          </div>

          <h3 className="mb-3 text-lg font-semibold tracking-wide">Chats</h3>
          <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20" />
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {isLoadingUsers ? (
              <p className="m-auto text-center text-sm text-slate-300">Loading contacts...</p>
            ) : users.length === 0 ? (
              <p className="m-auto text-center text-sm text-slate-300">No other users yet. Invite someone to join.</p>
            ) : users
            .filter(u =>
              u.name.toLowerCase().includes(search.toLowerCase())
            )
          .map(u => (
            <button
              type="button"
              key={u._id}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition ${activeUser?._id === u._id ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg" : "text-slate-100 hover:bg-white/10"}`}
              onClick={() => {
                setActiveUser(u);
                if (isMobile) setShowChatOnMobile(true);
              }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-500 font-bold text-white">{u.name?.charAt(0).toUpperCase()}</span>
                <span className="truncate">{u.name}</span>
              </span>
              {u.unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                  {u.unreadCount > 99 ? "99+" : u.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        </div>
      )}

      {(!isMobile || showChatOnMobile) && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/20 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              {isMobile && showChatOnMobile && (
                <button className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20" onClick={() => setShowChatOnMobile(false)}>← Back</button>
              )}

              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-500 font-bold text-white">{chatHeaderInitial || "?"}</div>
                <div className="min-w-0">
                  <div className="truncate font-bold">
                    {activeUser ? activeUser.name : "Select a chat"}
                  </div>
                  <div className="text-sm text-slate-300">
                    {activeUser
                      ? onlineUsers.includes(activeUser._id) ? "Online" : "Offline"
                      : "Tap a contact to start"}
                  </div>
                </div>
              </div>
            </div>

            {activeUser && (
              <div className="flex shrink-0 gap-2">
                <button aria-label="Start audio call" className="rounded-xl bg-white px-4 py-3 text-slate-800 shadow transition hover:-translate-y-0.5" onClick={() => callUser(false)}>📞</button>
                <button aria-label="Start video call" className="rounded-xl bg-white px-4 py-3 text-slate-800 shadow transition hover:-translate-y-0.5" onClick={() => callUser(true)}>🎥</button>
              </div>
            )}
          </div>

        {chatError && (
          <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-100 px-4 py-3 text-sm text-red-800" role="alert">
            {chatError}
            <button className="text-lg leading-none" type="button" onClick={() => setChatError("")} aria-label="Dismiss error">×</button>
          </div>
        )}

        <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6" ref={messagesContainerRef}>
          {isLoadingMessages ? (
            <p className="m-auto text-center text-slate-300">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="m-auto text-center text-slate-300">
              {activeUser ? "No messages yet. Say hello!" : "Select someone to start chatting."}
            </p>
          ) : messages.map(m => {
            const isOwn = m.senderId === currentUserId;
            const isSelected = selectedMessage?._id === m._id;
            const repliedMessage = m.replyTo ? messages.find(msg => msg._id === m.replyTo) : null;
            
            return (
              <div
                key={m._id}
                className={`relative z-0 max-w-[85%] cursor-pointer break-words rounded-2xl px-4 py-3 text-sm leading-6 shadow transition hover:z-10 hover:-translate-y-0.5 sm:max-w-[70%] ${
                  isOwn
                    ? "self-end bg-gradient-to-br from-indigo-500 via-teal-300 to-amber-200 text-slate-950"
                    : "self-start bg-white text-slate-900"
                } ${isSelected ? "outline outline-2 outline-indigo-400 outline-offset-2" : ""}`}
                onClick={() => setSelectedMessage(isSelected ? null : m)}
                id={`msg-${m._id}`}
              >
                {repliedMessage && (
                  <div 
                    className={`mb-2 w-fit max-w-full cursor-pointer rounded-lg border-l-[3px] px-3 py-2 text-xs transition hover:translate-x-0.5 ${
                      isOwn ? "border-white/80 bg-white/20" : "border-indigo-500 bg-indigo-100/80"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const element = document.getElementById(`msg-${repliedMessage._id}`);
                      element?.scrollIntoView({ behavior: "smooth", block: "center" });
                      setSelectedMessage(repliedMessage);
                    }}
                  >
                    <strong className="mb-1 block text-[11px] font-semibold uppercase tracking-wide opacity-80">
                      {repliedMessage.senderId === currentUserId
                        ? "You"
                        : users.find((user) => user._id === repliedMessage.senderId)?.name || "User"}
                    </strong>
                    <p className="truncate opacity-75">{repliedMessage.text}</p>
                  </div>
                )}
                
                {m.mediaUrl && (m.mediaType === "image" || m.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                  <img 
                    src={m.mediaUrl} 
                    alt="sent file"
                    className="max-h-72 max-w-full cursor-pointer rounded-lg object-contain"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageModal({url: m.mediaUrl, fileName: m.text});
                    }}
                  />
                ) : m.mediaUrl && (m.mediaType === "video" || m.mediaUrl.match(/\.(mp4|webm|mov)$/i)) ? (
                  <video 
                    src={m.mediaUrl} 
                    controls
                    className="max-h-72 max-w-full rounded-lg bg-black"
                  />
                ) : m.mediaUrl ? (
                  <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">
                    {m.text}
                  </a>
                ) : (
                  <span>{m.text}</span>
                )}
                
                {isSelected && (
                  <div ref={messageContextRef} className="absolute right-0 top-full z-50 mt-2 min-w-36 rounded-xl bg-white py-1 text-slate-900 shadow-xl">
                    {isOwn && (
                      <button onClick={() => deleteMessage(m._id)} className="block w-full px-4 py-2 text-left text-sm hover:bg-red-50 hover:text-red-600">
                        🗑️ Delete
                      </button>
                    )}
                    <button onClick={() => replyToMessage(m)} className="block w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 hover:text-indigo-600">
                      ↩️ Reply
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {replyingTo && (
          <div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-xl border border-teal-300/20 bg-slate-950/80 px-4 py-3 shadow-lg">
            <div className="min-w-0 flex-1">
              <strong className="mb-1 block text-[11px] uppercase tracking-wide text-teal-300">Replying to:</strong>
              <p className="truncate text-sm text-slate-100">{replyingTo.text}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Cancel reply">✕</button>
          </div>
        )}

        <div className="relative flex shrink-0 items-center gap-2 border-t border-white/10 bg-slate-900/30 p-3 sm:gap-3 sm:p-4">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onFocus={() => {
              if (isMobile) setShowChatOnMobile(true);
            }}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            disabled={!activeUser || isSending}
            className="min-w-0 flex-1 rounded-xl border border-transparent bg-white/95 px-4 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-70 sm:px-5"
          />

          <button onClick={() => setShowEmoji(!showEmoji)} className="shrink-0 rounded-xl bg-white/90 px-3 py-3 text-slate-800 shadow transition hover:scale-105 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!activeUser || isSending} aria-label="Choose emoji">😊</button>

          <div ref={emojiPickerRef} className="absolute bottom-full right-3 z-50 mb-3">
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
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <button onClick={() => fileInputRef.current?.click()} className="shrink-0 rounded-xl bg-white/90 px-3 py-3 text-slate-800 shadow transition hover:scale-105 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50" title="Upload file" disabled={!activeUser || isSending} aria-label="Upload file">📎</button>

          <button onClick={sendMessage} className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 via-teal-400 to-amber-300 px-4 py-3 font-semibold text-slate-950 shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:px-6" disabled={!activeUser || isSending || !text.trim()}>
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
      )}

      {(receivingCall || isCalling || callAccepted) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-950 p-5 text-center text-white shadow-2xl sm:p-6">
            <h3 className="mb-4 text-lg font-semibold">
              {callAccepted
                ? `${callerName} • ${formatTime(callTime)}`
                : isCalling
                ? `Calling ${callerName}...`
                : `${callerName} is calling...`}
            </h3>


            {isCalling && callType === "video" && (
              <div className="my-4 flex min-h-36 gap-3">
                <video ref={myVideo} autoPlay muted playsInline className="h-52 w-full rounded-xl bg-black object-cover" />
              </div>
            )}

            {callAccepted && callType === "video" && (
              <div className="my-4 grid grid-cols-2 gap-3">
                <div>
                  <video key="myVideo" ref={myVideo} autoPlay muted playsInline className="h-36 w-full rounded-xl bg-black object-cover" />
                  <small className="mt-1 block text-center text-white/70">You</small>
                </div>
                <div>
                  <video key="userVideo" ref={userVideo} autoPlay playsInline className="h-36 w-full rounded-xl bg-black object-cover" />
                  <small className="mt-1 block text-center text-white/70">{callerName}</small>
                </div>
              </div>
            )}

            {callType === "audio" && (
              <>
                <div className="my-6 flex items-center justify-center">
                  <div className="text-5xl opacity-80">🎤</div>
                </div>
                <audio ref={userAudio} autoPlay />
              </>
            )}

            <div className="mt-4 flex justify-center gap-3">
              {!callAccepted ? (
                receivingCall ? (
                  <>
                    <button className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold hover:bg-emerald-400" onClick={acceptCall}>Accept</button>
                    <button className="rounded-xl bg-red-500 px-5 py-3 font-semibold hover:bg-red-400" onClick={rejectCall}>Reject</button>
                  </>
                ) : (
                  <button className="rounded-xl bg-red-500 px-5 py-3 font-semibold hover:bg-red-400" onClick={endCall}>Cancel</button>
                )
              ) : (
                <button className="rounded-xl bg-red-500 px-5 py-3 font-semibold hover:bg-red-400" onClick={endCall}>End Call</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMAGE/FILE MODAL */}
      {imageModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4" onClick={() => setImageModal(null)}>
          <div className="relative max-h-[90dvh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button className="fixed right-5 top-5 rounded-lg bg-white/10 px-3 py-2 text-white hover:bg-white/20" onClick={() => setImageModal(null)} aria-label="Close preview">✕</button>
            <a 
              href={imageModal.url} 
              download 
              className="fixed right-20 top-5 rounded-lg bg-indigo-500 px-4 py-2 text-white transition hover:bg-indigo-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              ⬇️ Download
            </a>
            <img src={imageModal.url} alt={imageModal.fileName || "File preview"} className="max-h-[80dvh] max-w-full rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}