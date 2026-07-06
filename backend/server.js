const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

console.log("Servidor WebSocket rodando na porta 8080");

function gerarToken() {
  return Math.random().toString(36).substring(2, 7);
}

function obterNomeUser(user) {
  if (typeof user !== "string") {
    return null;
  }

  const nome = user;
  return nome;
}

const socketSala = new Map();
// {socket, tokenSala}
const salas = new Map();
// {tokenSala, {salaId, users: [{nome, socket}], messages}}

function contarUsuariosSala(tokenSala) {
  const sala = salas.get(tokenSala);
  return sala ? sala.users.length : 0;
}

function mostrarQuantidadeUsuariosSala(tokenSala) {
  const quantidade = contarUsuariosSala(tokenSala);
  console.log(`Sala ${tokenSala} - quantidade de usuarios: ${quantidade}`);
  return quantidade;
}

function enviarParaSala(sala, payload, socketIgnorado) {
  sala.users.forEach((user) => {
    if (socketIgnorado && user.socket === socketIgnorado) {
      return;
    }

    user.socket.send(JSON.stringify(payload));
  });
}

wss.on("connection", (socket) => {
  console.log("Alguém conectou!");

  socket.on("message", (data) => {
    data = JSON.parse(data);

    switch (data.type) {
      case "criarSala":
        try {
          const tokenSala = gerarToken();

          socketSala.set(socket, tokenSala);

          salas.set(tokenSala, { salaId: tokenSala, users: [], messages: [] });

          const sala = salas.get(tokenSala);

          const nomeUser = obterNomeUser(data.user);

          if (!nomeUser) {
            socket.send("Campo user inválido");
            console.log(nomeUser);
            return;
          }

          sala.users.push({ nome: nomeUser, socket });

          const quantidade = mostrarQuantidadeUsuariosSala(tokenSala);

          socket.send(
            JSON.stringify({
              type: "roomStats",
              userCount: quantidade,
            }),
          );

          socket.send(`Sala criada com sucesso! Token da sala: ${tokenSala}`);
        } catch (error) {
          console.error("Erro ao criar sala:", error);

          socket.send("Erro ao criar sala. Tente novamente.");

          return;
        }
        break;
      case "entrarSala":
        try {
          const tokenSala = data.token;
          const nomeUser = obterNomeUser(data.user);

          if (!tokenSala) {
            socket.send("Token da sala não fornecido.");
            return;
          }

          if (!nomeUser) {
            socket.send(
              "Usuário inválido. Use o formato: { user: { nome: string } }.",
            );
            return;
          }

          if (!salas.has(tokenSala)) {
            socket.send("Token da sala não encontrado.");
            return;
          }

          if (socketSala.get(socket) === tokenSala) {
            socket.send("Você já está nesta sala.");
            return;
          }
          socketSala.set(socket, tokenSala);

          const sala = salas.get(tokenSala);

          sala.users.push({ nome: nomeUser, socket });

          const quantidade = mostrarQuantidadeUsuariosSala(tokenSala);

          enviarParaSala(sala, {
            type: "roomStats",
            userCount: quantidade,
          });

          enviarParaSala(
            sala,
            {
              type: "userJoined",
              user: { nome: nomeUser },
              userCount: quantidade,
            },
          );
        } catch (error) {
          console.error("Erro ao entrar na sala:", error);
          socket.send("Erro ao entrar na sala. Tente novamente.");
          return;
        }
        break;
      case "enviarMensagem":
        try {
          const tokenSala = data.token;
          const nomeUser = obterNomeUser(data.user);

          if (!tokenSala) {
            socket.send("Token da sala não fornecido.");
            return;
          }

          if (!nomeUser) {
            socket.send(
              "Usuário inválido. Use o formato: { user: { nome: string } }.",
            );
            return;
          }

          if (tokenSala !== socketSala.get(socket)) {
            socket.send("Token da sala não encontrado.");
            return;
          }

          const sala = salas.get(tokenSala);

          if (!sala.users.find((user) => user.nome === nomeUser)) {
            socket.send("Usuário não encontrado na sala.");
            return;
          }

          sala.messages.push({
            user: { nome: nomeUser },
            message: data.message,
          });

          console.log(
            "Usuários na sala:",
            sala.users.map((u) => u.nome),
          );
          console.log("Quantidade:", sala.users.length);
          sala.users.forEach((user) => {
            if (user.socket !== socket) {
              user.socket.send(
                JSON.stringify({
                  user: { nome: nomeUser },
                  message: data.message,
                }),
              );
            }
          });
        } catch (error) {
          console.error("Erro ao enviar mensagem:", error);
          socket.send("Erro ao enviar mensagem. Tente novamente.");
          return;
        }
        break;
      default:
        console.log("Tipo de mensagem desconhecido");
    }
  });

  socket.on("close", () => {
    const tokenSala = socketSala.get(socket);
    if (tokenSala) {
      const sala = salas.get(tokenSala);
      if (sala) {
        const user = sala.users.find((item) => item.socket === socket);
        if (user) {
          sala.users = sala.users.filter((item) => item.socket !== socket);
          console.log(`Usuário ${user.nome} saiu da sala:`, tokenSala);
          console.log(
            "Usuários restantes na sala:",
            sala.users.map((u) => u.nome),
          );

          const quantidade = mostrarQuantidadeUsuariosSala(tokenSala);
          enviarParaSala(sala, {
            type: "roomStats",
            userCount: quantidade,
          });
        }

        if (sala.users.length === 0) {
          salas.delete(tokenSala);
          console.log(
            `Sala ${tokenSala} foi removida, pois não há mais usuários.`,
          );
        }
      }

      socketSala.delete(socket);
    }
  });
});
