// ----------------------------
// CONFIGURAÇÃO ARC TESTNET
// ----------------------------
const ARC_RPC = "https://rpc.testnet.arc.network";
const ARC_CHAIN_ID_DEC = 5042002;
const ARC_CHAIN_ID_HEX = "0x4cef52"; 
const USDC_ARC = "0x3600000000000000000000000000000000000000"; 

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
// PROVIDER / SIGNER
// ----------------------------
let provider = null;
let signer = null;
let userAddress = null;

// ----------------------------
// GARANTE QUE A REDE ARC ESTÁ ADICIONADA
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
// CONECTAR CARTEIRA
// ----------------------------
connectBtn.addEventListener("click", async () => {
  try {
    statusEl.innerText = "Status: conectando...";

    if (!window.ethereum) {
      alert("Nenhuma carteira encontrada.");
      statusEl.innerText = "Status: carteira não encontrada";
      return;
    }

    await ensureArcNetwork();

    // CORRIGIDO: troca arc → ARC
    provider = new ARC.Web3Provider(window.ethereum);

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
// SNAKE GAME
// ----------------------------
const GRID = 20;
const TILE = canvas.width / GRID;
let snake = [ { x: 10, y: 10 } ];
let dir = { x: 0, y: 0 };
let food = spawnFood();
let score = 0;
let running = true;
let interval = 120;

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
  if (e.key === "ArrowLeft" && dir.x !== 1) dir = { x: -1,
