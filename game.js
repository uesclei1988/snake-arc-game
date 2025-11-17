// ----------------------------
// CONFIGURAÇÃO ARC TESTNET
// ----------------------------
const ARC_RPC = "https://rpc.testnet.arc.network";
const ARC_CHAIN_ID_DEC = 5042002;
const ARC_CHAIN_ID_HEX = "0x4cef52"; // 5042002 em hex
const USDC_ARC = "0x3600000000000000000000000000000000000000"; // contrato USDC testnet (documentação ARC)

// ----------------------------
// HELPERS
// ----------------------------
function utf8ToHex(str) {
  const bytes = new TextEncoder().encode(str);
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function short(addr) {
  if (!addr) return "";
  return addr.slice(0,6) + "..." + addr.slice(-4);
}

// ----------------------------
// UI ELEMENTS
// ----------------------------
const connectBtn = document.getElementById("connectWallet");
const addrEl = document.getElementById("walletAddress");
const statusEl = document.getElementById("status");
const scoreEl = document.getElementById("score");
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ----------------------------
// PROVIDER / SIGNER (global)
// ----------------------------
let provider = null;
let signer = null;
let userAddress = null;

// ----------------------------
// FUNÇÃO: TENTA MUDAR / ADICIONAR A REDE NO METAMASK
// ----------------------------
async function ensureArcNetwork() {
  if (!window.ethereum) throw new Error("MetaMask não detectada");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_CHAIN_ID_HEX }]
    });
    console.log("Mudou para ARC Testnet");
  } catch (switchError) {
    // 4902 - chain não encontrada
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: ARC_CHAIN_ID_HEX,
          chainName: "ARC Testnet",
          rpcUrls: [ARC_RPC],
          nativeCurrency: { name: "tARC", symbol: "USDC", decimals: 18 },
          blockExplorerUrls: []
        }]
      });
      console.log("Rede ARC Testnet adicionada no MetaMask");
    } catch (addErr) {
      console.error("Falha ao adicionar rede", addErr);
      throw addErr;
    }
  }
}

// ----------------------------
// CONEXÃO: botão conectar
// ----------------------------
connectBtn.addEventListener("click", async () => {
  try {
    statusEl.innerText = "Status: conectando...";
    if (!window.ethereum) {
      alert("Instale MetaMask ou outra carteira compatível e recarregue a página.");
      statusEl.innerText = "Status: carteira não encontrada";
      return;
    }

    // garante que MetaMask tenha a ARC Testnet configurada
    await ensureArcNetwork();

    // arc SDK provider (já carregado no index)
    provider = new arc.Web3Provider(window.ethereum);

    // solicita contas
    await provider.send("eth_requestAccounts", []);

    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    addrEl.innerText = "Conectado: " + short(userAddress);
    statusEl.innerText = "Status: conectado à ARC Testnet";

  } catch (err) {
    console.error("Erro ao conectar:", err);
    alert("Erro ao conectar: " + (err.message || err));
    statusEl.innerText = "Status: erro na conexão";
  }
});

// ----------------------------
// JOGO DA COBRINHA
// ----------------------------
const GRID = 20;
const TILE = canvas.width / GRID; // 400/20 = 20 px
let snake = [ { x: 10, y: 10 } ];
let dir = { x: 0, y: 0 };
let food = spawnFood();
let score = 0;
let running = true;
let interval = 120; // ms

function spawnFood() {
  return {
    x: Math.floor(Math.random() * GRID),
    y: Math.floor(Math.random() * GRID)
  };
}

function resetGame() {
  snake = [ { x: 10, y: 10 } ];
  dir = { x: 0, y: 0 };
  food = spawnFood();
  score = 0;
  scoreEl.innerText = score;
  running = true;
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" && dir.y !== 1) dir = { x: 0, y: -1 };
  if (e.key === "ArrowDown" && dir.y !== -1) dir = { x: 0, y: 1 };
  if (e.key === "ArrowLeft" && dir.x !== 1) dir = { x: -1, y: 0 };
  if (e.key === "ArrowRight" && dir.x !== -1) dir = { x: 1, y: 0 };
});

// lógica de colisão com próprio corpo
function collides(head, arr) {
  return arr.some(part => part.x === head.x && part.y === head.y);
}

function gameTick() {
  if (!running) return;
  // calcula nova cabeça
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // colisão com paredes
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || collides(head, snake)) {
    running = false;
    onGameOver();
    return;
  }

  snake.unshift(head);

  // comer comida
  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.innerText = score;
    food = spawnFood();
  } else {
    snake.pop();
  }

  // desenhar
  draw();
}

function draw() {
  // fundo
  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // comida
  ctx.fillStyle = "#ff4d4d";
  ctx.fillRect(food.x * TILE, food.y * TILE, TILE, TILE);

  // cobra
  ctx.fillStyle = "#86ff7a";
  snake.forEach((p, i) => {
    ctx.fillRect(p.x * TILE + 1, p.y * TILE + 1, TILE - 2, TILE - 2);
  });
}

// inicia loop
let loopHandle = setInterval(gameTick, interval);

// ----------------------------
// FUNÇÃO DE REGISTRO (assinatura + opcional TX)
// ----------------------------
async function onGameOver() {
  statusEl.innerText = "Status: game over — preparando registro...";

  // mostra alerta local
  alert("Game Over! Sua pontuação: " + score);

  if (!signer) {
    alert("Conecte sua carteira para registrar a pontuação (apenas assinatura).");
    statusEl.innerText = "Status: desconectado — não registrou";
    return;
  }

  try {
    // 1) assinatura de mensagem (NÃO gasta gas) — recomendável para prova off-chain
    const timestamp = Date.now();
    const message = `SNAKE_SCORE|addr:${userAddress}|score:${score}|ts:${timestamp}`;
    const signature = await signer.signMessage(message);

    // exibe resultado
    statusEl.innerText = "Status: pontuação assinada (mensagem)";
    console.log("Assinatura:", signature);

    // 2) opcional: enviar TX on-chain para o contrato USDC testnet com data (value 0)
    // OBS: isso vai abrir o MetaMask para confirmar e poderá gastar gas (testnet USDC/gas).
    // Se não quiser enviar TX, comente as próximas linhas.
    const dataHex = utf8ToHex(`SCORE:${score}|ADDR:${userAddress}|TS:${timestamp}|SIG:${signature}`);
    statusEl.innerText = "Status: enviando TX de registro (opcional)...";

    // sendTransaction via signer
    const tx = await signer.sendTransaction({
      to: USDC_ARC,
      value: "0x0",
      data: dataHex
    });

    statusEl.innerText = "Status: TX enviada — esperando confirmação...";
    await tx.wait();

    statusEl.innerText = "Status: pontuação registrada on-chain (testnet). TX: " + tx.hash;
    alert("Pontuação registrada on-chain! TX: " + tx.hash);

  } catch (err) {
    console.error("Erro ao registrar pontuação:", err);
    alert("Erro ao registrar pontuação: " + (err.message || err));
    statusEl.innerText = "Status: falha ao registrar";
  } finally {
    // reinicia jogo para jogar de novo
    resetGame();
    // restart loop if necessary
    if (!loopHandle) loopHandle = setInterval(gameTick, interval);
  }
}
