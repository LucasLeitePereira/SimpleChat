# SimpleChat

Projeto pequeno para estudo de WebSocket e comunicacao em tempo real.

Este projeto foi criado com foco em aprendizado pratico:
- conexao cliente-servidor via WebSocket
- criacao e entrada em salas de chat
- troca de mensagens em tempo real
- notificacao de entrada de usuarios na sala
- orquestracao de servicos com Docker Compose

## Visao geral

O sistema tem dois servicos:
- backend: servidor WebSocket em Node.js usando pacote ws
- frontend: interface React (Vite) para criar/entrar em sala e conversar

Estrutura principal:

```text
.
|- backend/
|  |- Dockerfile
|  |- package.json
|  |- server.js
|- chat-ui/
|  |- Dockerfile
|  |- package.json
|  |- src/
|     |- App.jsx
|- docker-compose.yml
```

## Como funciona

### Backend (WebSocket)

Arquivo principal: backend/server.js

Responsabilidades:
- abrir servidor WebSocket na porta 8080
- gerenciar salas em memoria (Map)
- adicionar/remover usuarios por sala
- distribuir mensagens para usuarios da mesma sala
- informar quantidade de usuarios da sala
- avisar todos quando um novo usuario entra

Eventos recebidos do cliente:
- criarSala
- entrarSala
- enviarMensagem

Mensagens/eventos enviados pelo servidor:
- roomStats: atualiza quantidade de usuarios da sala
- userJoined: informa que um novo usuario entrou na sala
- mensagens de sistema em texto (ex.: token da sala)
- mensagem de chat com user + message

Observacao:
- os dados ficam em memoria. Se o container do backend reiniciar, as salas e mensagens sao perdidas.

### Frontend (React)

Arquivo principal: chat-ui/src/App.jsx

Responsabilidades:
- conectar no servidor WebSocket
- criar sala
- entrar em sala por token
- enviar mensagens
- exibir mensagens recebidas
- exibir status de conexao
- exibir numero de usuarios na sala
- mostrar aviso quando alguem entra na sala

## Requisitos

Para rodar com Docker Compose voce precisa de:
- Docker
- Docker Compose

## Instalar e usar com Docker Compose

Na raiz do projeto:

1. Build e subida dos containers

```bash
docker compose up --build
```

2. Acessar o frontend no navegador

```text
http://localhost:8081
```

3. Fluxo de uso
- abra uma aba/janela e informe seu nome
- clique em Criar sala
- copie o token exibido
- abra outra aba/janela, informe outro nome e entre com o token
- envie mensagens e observe atualizacao em tempo real
- quando um usuario entrar, todos da sala recebem o aviso

4. Parar os containers

```bash
docker compose down
```

## Portas

Mapeamentos definidos no docker-compose.yml:
- frontend: 8081 -> 80 (container)
- backend: 8080 -> 8080 (container)

## Rodando sem Docker (opcional)

Backend:

```bash
cd backend
npm install
node server.js
```

Frontend:

```bash
cd chat-ui
npm install
npm run dev
```

Frontend em desenvolvimento:

```text
http://localhost:8000
```

## Objetivo educacional

Esse projeto nao foi feito para producao. Ele foi feito para aprender:
- fundamentos de WebSocket
- eventos em tempo real
- sincronizacao entre clientes
- organizacao simples de backend + frontend
- uso de Docker Compose para subir a aplicacao completa

## Melhorias futuras

Ideias para evolucao:
- autenticacao real de usuarios
- persistencia de mensagens em banco de dados
- historico de mensagens por sala
- notificacao de usuario saindo da sala
- tratamento mais robusto de erros e reconexao
- testes automatizados
