import { useEffect, useMemo, useRef, useState } from "react";

function getDefaultWsUrl() {
  if (typeof window === "undefined") {
    return "ws://localhost:8080";
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname || "localhost";
  return `${protocol}://${host}:8080`;
}

const DEFAULT_WS_URL = getDefaultWsUrl();

function parseServerMessage(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return { system: String(raw) };
  } catch {
    return { system: String(raw) };
  }
}

function extractTokenFromText(text) {
  const match = text.match(/Token da sala:\s*([a-zA-Z0-9]+)/);
  return match ? match[1] : "";
}

function gerarId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [userName, setUserName] = useState("");
  const [roomTokenInput, setRoomTokenInput] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [roomUserCount, setRoomUserCount] = useState(0);
  const [status, setStatus] = useState("Desconectado");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);
  const chatViewportRef = useRef(null);
  const isLeavingRoomRef = useRef(false);

  const canCreateOrJoin = useMemo(() => {
    return Boolean(userName.trim()) && isConnected;
  }, [userName, isConnected]);

  useEffect(() => {
    if (chatViewportRef.current) {
      chatViewportRef.current.scrollTop = chatViewportRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const connectTimerId = setTimeout(() => {
      connect();
    }, 2000);

    return () => {
      clearTimeout(connectTimerId);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  function pushSystemMessage(text) {
    setMessages((prev) => [...prev, { id: gerarId(), type: "system", text }]);
  }

  function pushPeerMessage(nome, text) {
    setMessages((prev) => [
      ...prev,
      { id: gerarId(), type: "peer", nome, text },
    ]);
  }

  function pushMineMessage(text) {
    setMessages((prev) => [
      ...prev,
      { id: gerarId(), type: "mine", nome: userName.trim(), text },
    ]);
  }

  function connect() {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      pushSystemMessage("Você já está conectado ao servidor.");
      return;
    }

    const ws = new WebSocket(DEFAULT_WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setStatus("Conectado");
      pushSystemMessage("Conectado ao servidor de chat.");
    };

    ws.onmessage = (event) => {
      const parsed = parseServerMessage(event.data);

      if (parsed.type === "roomStats" && typeof parsed.userCount === "number") {
        setRoomUserCount(parsed.userCount);
        return;
      }

      if (parsed.type === "userJoined" && parsed.user?.nome) {
        const joinedName = parsed.user.nome;
        const currentName = userName.trim();

        if (typeof parsed.userCount === "number") {
          setRoomUserCount(parsed.userCount);
        }

        if (joinedName === currentName) {
          pushSystemMessage("Você entrou na sala.");
        } else {
          pushSystemMessage(`${joinedName} entrou na sala.`);
        }

        return;
      }

      if (parsed.system) {
        pushSystemMessage(parsed.system);
        const token = extractTokenFromText(parsed.system);
        if (token) {
          setRoomToken(token);
          setRoomTokenInput(token);
        }
        return;
      }

      if (parsed.user?.nome && typeof parsed.message === "string") {
        pushPeerMessage(parsed.user.nome, parsed.message);
        return;
      }

      pushSystemMessage("Mensagem recebida em formato não reconhecido.");
    };

    ws.onerror = () => {
      setStatus("Erro de conexão");
      pushSystemMessage("Não foi possível conectar ao WebSocket.");
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatus("Desconectado");
      socketRef.current = null;

      if (isLeavingRoomRef.current) {
        isLeavingRoomRef.current = false;
        pushSystemMessage("Você saiu da sala.");
        setTimeout(() => {
          connect();
        }, 500);
        return;
      }

      pushSystemMessage("Conexão encerrada.");
    };
  }

  function disconnect() {
    if (!socketRef.current) {
      return;
    }
    socketRef.current.close();
  }

  function handleLeaveRoom() {
    if (!roomToken) {
      pushSystemMessage("Você não está em uma sala.");
      return;
    }

    isLeavingRoomRef.current = true;
    setRoomToken("");
    setRoomTokenInput("");
    setRoomUserCount(0);
    setMessages([]);
    setChatInput("");
    disconnect();
  }

  function sendPayload(payload) {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      pushSystemMessage("Conecte-se ao servidor antes de enviar ações.");
      return false;
    }

    socketRef.current.send(JSON.stringify(payload));
    return true;
  }

  function handleCreateRoom() {
    const nome = userName.trim();
    if (!nome) {
      pushSystemMessage("Informe seu nome antes de criar sala.");
      return;
    }

    sendPayload({
      type: "criarSala",
      user: nome,
    });

    setMessages([]);
    setChatInput("");
  }

  function handleJoinRoom() {
    const nome = userName.trim();
    const token = roomTokenInput.trim();

    if (!nome) {
      pushSystemMessage("Informe seu nome antes de entrar na sala.");
      return;
    }

    if (!token) {
      pushSystemMessage("Informe o token da sala para entrar.");
      return;
    }

    const ok = sendPayload({
      type: "entrarSala",
      token,
      user: nome,
    });

    if (ok) {
      setRoomToken(token);
      setMessages([]);
      setChatInput("");
      setRoomUserCount(0);
    }
  }

  function handleSendMessage() {
    const token = roomToken.trim();
    const nome = userName.trim();
    const text = chatInput.trim();

    if (!token) {
      pushSystemMessage("Crie ou entre em uma sala antes de enviar mensagens.");
      return;
    }

    if (!text) {
      return;
    }

    const ok = sendPayload({
      type: "enviarMensagem",
      token,
      user: nome,
      message: text,
    });

    if (ok) {
      pushMineMessage(text);
      setChatInput("");
    }
  }

  return (
    <main className="app-shell">
      <section className="panel control-panel">
        <h1>Simple Chat</h1>
        <p className="subtitle">
          Interface React para criar ou entrar em uma sala.
        </p>

        <p className="status">Status: {status}</p>

        <label>
          Seu nome
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Ex.: Jose"
          />
        </label>

        <div className="room-actions">
          <button onClick={handleCreateRoom} disabled={!canCreateOrJoin}>
            Criar sala
          </button>
        </div>

        <label>
          Token da sala
          <input
            value={roomTokenInput}
            onChange={(e) => setRoomTokenInput(e.target.value)}
            placeholder="Digite o token"
          />
        </label>

        <button onClick={handleJoinRoom} disabled={!canCreateOrJoin}>
          Entrar na sala
        </button>

        <button
          onClick={handleLeaveRoom}
          disabled={!isConnected || !roomToken}
          className="ghost"
        >
          Sair da sala
        </button>

        <p className="room-token">Sala atual: {roomToken || "nenhuma"}</p>
        <p className="room-token">Usuários na sala: {roomUserCount}</p>
      </section>

      <section className="panel chat-panel">
        <div className="chat-header">
          <h2>Mensagens</h2>
          <p>{roomToken ? `Sala ${roomToken}` : "Sem sala ativa"}</p>
        </div>

        <div className="chat-viewport" ref={chatViewportRef}>
          {messages.length === 0 && (
            <p className="empty-state">Nenhuma mensagem ainda.</p>
          )}

          {messages.map((msg) => {
            if (msg.type === "system") {
              return (
                <div key={msg.id} className="bubble system">
                  {msg.text}
                </div>
              );
            }

            if (msg.type === "mine") {
              return (
                <div key={msg.id} className="bubble mine">
                  <strong>Você</strong>
                  <span>{msg.text}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="bubble peer">
                <strong>{msg.nome}</strong>
                <span>{msg.text}</span>
              </div>
            );
          })}
        </div>

        <div className="composer">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Digite sua mensagem"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !roomToken}
          >
            Enviar
          </button>
        </div>
      </section>
    </main>
  );
}
