//---------------------------------------------
// 1. Conectar à carteira ARC
//---------------------------------------------
let signer;
let provider;

document.getElementById("connectWallet").onclick = async () => {
    try {
        provider = new arc.Web3Provider(window.ethereum);

        await provider.send("eth_requestAccounts", []);

        signer = provider.getSigner();
        const address = await signer.getAddress();

        document.getElementById("walletAddress").innerText =
            "Carteira conectada: " + address;

    } catch (err) {
        alert("Erro ao conectar a carteira.");
        console.log(err);
    }
};

//---------------------------------------------
// 2. Variáveis do jogo da cobrinha
//---------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let box = 20;
let snake = [];
snake[0] = { x: 200, y: 200 };

let direction = "RIGHT";

let food = {
    x: Math.floor(Math.random() * 20) * box,
    y: Math.floor(Math.random() * 20) * box
};

let score = 0;

//---------------------------------------------
// 3. Controle do teclado
//---------------------------------------------
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
    if (e.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
    if (e.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
    if (e.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
});

//---------------------------------------------
// 4. Loop do jogo
//---------------------------------------------
function drawGame() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 400, 400);

    // desenhar comida
    ctx.fillStyle = "red";
    ctx.fillRect(food.x, food.y, box, box);

    // desenhar cobra
    ctx.fillStyle = "lime";
    for (let i = 0; i < snake.length; i++) {
        ctx.fillRect(snake[i].x, snake[i].y, box, box);
    }

    // posição da cabeça
    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if (direction === "UP") snakeY -= box;
    if (direction === "DOWN") snakeY += box;
    if (direction === "LEFT") snakeX -= box;
    if (direction === "RIGHT") snakeX += box;

    // comer comida
    if (snakeX === food.x && snakeY === food.y) {
        score++;
        document.getElementById("score").innerText = "Pontuação: " + score;

        food = {
            x: Math.floor(Math.random() * 20) * box,
            y: Math.floor(Math.random() * 20) * box
        };
    } else {
        snake.pop();
    }

    const newHead = { x: snakeX, y: snakeY };

    // colisão -> game over
    if (
        snakeX < 0 ||
        snakeX >= 400 ||
        snakeY < 0 ||
        snakeY >= 400 ||
        collision(newHead, snake)
    ) {
        clearInterval(game);
        gameOver();
        return;
    }

    snake.unshift(newHead);
}

function collision(head, array) {
    return array.some(s => s.x === head.x && s.y === head.y);
}

let game = setInterval(drawGame, 150);

//---------------------------------------------
// 5. Registrar pontuação via transação ARC
//---------------------------------------------
async function gameOver() {
    alert("Game Over! Pontuação final: " + score);

    if (!signer) {
        alert("Conecte a carteira para registrar a pontuação.");
        return;
    }

    // TX simbólica usando USDC como gas
    const USDC_ARC = "COLE_AQUI_O_ENDERECO_DO_USDC_TESTNET";

    try {
        const tx = await signer.sendTransaction({
            to: USDC_ARC,
            value: 0, 
            data: "0x" + Buffer.from("SCORE:" + score).toString("hex"),
        });

        alert("Pontuação assinada na blockchain!\nTX Hash: " + tx.hash);

    } catch (err) {
        alert("Erro ao assinar pontuação.");
        console.log(err);
    }
}
