// GLOBAL VARIABLES
        let game = null;
        let gameMode = "computer"; // "computer" or "multiplayer"
        let selectedDifficulty = "easy";
        let selectedLetter = "S";
        let computerThinking = false;

        let player1Name = "Player 1";
        let player2Name = "Computer";

        // SCREEN NAVIGATION
        function showScreen(id) {
            document.querySelectorAll(".screen").forEach(screen => {
                screen.classList.remove("active");
            });
            const target = document.getElementById(id);
            if (target) target.classList.add("active");
            window.scrollTo(0, 0);
        }

        function showToast(message) {
            const toast = document.getElementById("toast");
            toast.textContent = message;
            toast.classList.add("show");
            setTimeout(() => toast.classList.remove("show"), 1600);
        }

        // HISTORY
        const HISTORY_KEY = "sosGameWinnerHistory";

        function getHistory() {
            try {
                const data = localStorage.getItem(HISTORY_KEY);
                return data ? JSON.parse(data) : [];
            } catch (error) {
                return [];
            }
        }

        function saveWinner(winnerName, score, mode, difficulty, rows, cols) {
            let history = getHistory();

            history.unshift({
                winnerName: winnerName,
                mode: mode === "computer" ? "Computer" : "Multiplayer",
                difficulty: difficulty,
                board: rows + " × " + cols,
                score: score,
                date: new Date().toLocaleDateString('en-GB')
            });

            history = history.slice(0, 5);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }

        function renderHistory() {
            const list = document.getElementById("historyList");
            const history = getHistory();

            if (history.length === 0) {
                list.innerHTML = `<div class="empty-history">No victories recorded yet.</div>`;
                return;
            }

            list.innerHTML = history.map((item, index) => {
                // Support old history format
                const name = item.winnerName || item.name || "Player";
                const modeStr = item.mode === "Computer" || item.mode === "Multiplayer" ? item.mode : "Computer Mode";
                const diffStr = item.difficulty === "N/A" ? "" : ` • ${item.difficulty}`;

                return `
                <div class="history-item">
                    <div class="history-number">#${index + 1}</div>
                    <div class="history-main">
                        <strong>${name}</strong>
                        <small>${modeStr}${diffStr} • ${item.board}</small>
                        <br>
                        <small>${item.date || ""}</small>
                    </div>
                    <div class="history-score">Score: ${item.score}</div>
                </div>`;
            }).join("");
        }

        // GAME CLASS
        class SOSGame {
            constructor(rows, cols, difficulty) {
                this.rows = rows;
                this.cols = cols;
                this.difficulty = difficulty;
                this.board = Array.from({ length: rows }, () => Array(cols).fill(""));
                this.playerScore = 0; // P1
                this.computerScore = 0; // P2
                this.currentPlayer = "human"; // 'human' (P1) or 'computer' (P2)
                this.gameOver = false;
            }

            isEmpty(row, col) {
                return (row >= 0 && row < this.rows && col >= 0 && col < this.cols && this.board[row][col] === "");
            }

            makeMove(row, col, letter, player) {
                if (!this.isEmpty(row, col)) return null;

                this.board[row][col] = letter;
                const sosCells = this.findSOS(row, col);
                const sosCount = sosCells.length;

                if (player === "human") {
                    this.playerScore += sosCount;
                } else {
                    this.computerScore += sosCount;
                }

                const boardFull = this.isBoardFull();

                return {
                    row, col, letter, player, sosCount, sosCells, boardFull,
                    extraTurn: sosCount > 0
                };
            }

            findSOS(row, col) {
                const found = [];
                const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
                for (const [dr, dc] of directions) {
                    for (let position = 0; position < 3; position++) {
                        const sr = row - position * dr;
                        const sc = col - position * dc;
                        const er = sr + 2 * dr;
                        const ec = sc + 2 * dc;

                        if (sr < 0 || sr >= this.rows || sc < 0 || sc >= this.cols ||
                            er < 0 || er >= this.rows || ec < 0 || ec >= this.cols) {
                            continue;
                        }

                        if (this.board[sr][sc] === "S" &&
                            this.board[sr + dr][sc + dc] === "O" &&
                            this.board[er][ec] === "S") {
                            found.push([[sr, sc], [sr + dr, sc + dc], [er, ec]]);
                        }
                    }
                }
                return found;
            }

            isBoardFull() {
                return this.board.every(row => row.every(cell => cell !== ""));
            }

            getEmptyCells() {
                const cells = [];
                for (let r = 0; r < this.rows; r++) {
                    for (let c = 0; c < this.cols; c++) {
                        if (this.board[r][c] === "") cells.push({ row: r, col: c });
                    }
                }
                return cells;
            }

            clone() {
                const copy = new SOSGame(this.rows, this.cols, this.difficulty);
                copy.board = this.board.map(row => [...row]);
                copy.playerScore = this.playerScore;
                copy.computerScore = this.computerScore;
                return copy;
            }
        }

        // COMPUTER AI
        class SOSAI {
            constructor(game) { this.game = game; }

            getMove() {
                const moves = this.getAllMoves();
                if (moves.length === 0) return null;

                if (this.game.difficulty === "easy") {
                    const scoringMoves = moves.filter(move => this.evaluateMove(move).sosCount > 0);
                    if (scoringMoves.length > 0) {
                        return scoringMoves[Math.floor(Math.random() * scoringMoves.length)];
                    }
                    return this.randomMove(moves);
                }

                if (this.game.difficulty === "medium") {
                    return this.bestMove(moves, false);
                }

                return this.bestMove(moves, true); // Hard
            }

            getAllMoves() {
                const moves = [];
                const empty = this.game.getEmptyCells();
                for (const cell of empty) {
                    moves.push({ row: cell.row, col: cell.col, letter: "S" });
                    moves.push({ row: cell.row, col: cell.col, letter: "O" });
                }
                return moves;
            }

            evaluateMove(move) {
                const clone = this.game.clone();
                return clone.makeMove(move.row, move.col, move.letter, "computer");
            }

            bestMove(moves, hard) {
                let best = [];
                let bestScore = -Infinity;

                for (const move of moves) {
                    const result = this.evaluateMove(move);
                    if (!result) continue;

                    let score = result.sosCount * 1000;
                    const centerRow = (this.game.rows - 1) / 2;
                    const centerCol = (this.game.cols - 1) / 2;
                    const distance = Math.abs(move.row - centerRow) + Math.abs(move.col - centerCol);
                    score += Math.max(0, 30 - distance * 5);

                    if (hard) {
                        const future = this.futureValue();
                        score += future * 20;
                    }

                    score += Math.random() * 5;

                    if (score > bestScore) {
                        bestScore = score;
                        best = [move];
                    } else if (score === bestScore) {
                        best.push(move);
                    }
                }
                return this.randomMove(best);
            }

            futureValue() {
                let danger = 0;
                const clone = this.game.clone();
                const empty = clone.getEmptyCells();
                for (const cell of empty) {
                    for (const letter of ["S", "O"]) {
                        const result = clone.makeMove(cell.row, cell.col, letter, "human");
                        if (result && result.sosCount > 0) danger += result.sosCount;
                        clone.board[cell.row][cell.col] = "";
                    }
                }
                return -danger;
            }

            randomMove(moves) {
                return moves[Math.floor(Math.random() * moves.length)];
            }
        }

        // RENDER BOARD
        function renderBoard(highlightCells = []) {
            const board = document.getElementById("gameBoard");
            board.innerHTML = "";
            board.style.gridTemplateColumns = `repeat(${game.cols}, 1fr)`;

            for (let r = 0; r < game.rows; r++) {
                for (let c = 0; c < game.cols; c++) {
                    const cell = document.createElement("button");
                    cell.className = "cell";
                    const value = game.board[r][c];
                    cell.textContent = value;
                    if (value !== "") cell.classList.add("filled");

                    const highlighted = highlightCells.some(group =>
                        group.some(([hr, hc]) => hr === r && hc === c)
                    );
                    if (highlighted) cell.classList.add("sos");

                    cell.addEventListener("click", () => handlePlayerMove(r, c));
                    board.appendChild(cell);
                }
            }
        }

        // PLAYER MOVE
        function handlePlayerMove(row, col) {
            if (!game) return;
            if (computerThinking) return;

            // In computer mode, prevent move if it's computer's turn
            if (gameMode === "computer" && game.currentPlayer !== "human") return;

            if (!game.isEmpty(row, col)) {
                showToast("That cell is already filled.");
                return;
            }

            const result = game.makeMove(row, col, selectedLetter, game.currentPlayer);
            if (!result) return;

            renderBoard(result.sosCells);
            updateScore();

            if (result.sosCount > 0) {
                showToast(result.sosCount === 1 ? "SOS! Another turn!" : `${result.sosCount} SOS! Another turn!`);
            }

            if (result.boardFull) {
                endGame();
                return;
            }

            if (result.extraTurn) {
                updateTurn(); // Player gets another turn
                return;
            }

            // Change turn
            game.currentPlayer = game.currentPlayer === "human" ? "computer" : "human";
            updateTurn();

            if (gameMode === "computer" && game.currentPlayer === "computer") {
                computerThinking = true;
                setTimeout(computerTurn, 600);
            }
        }

        // COMPUTER TURN
        function computerTurn() {
            if (!game || game.gameOver || gameMode !== "computer") {
                computerThinking = false;
                return;
            }

            const ai = new SOSAI(game);
            const move = ai.getMove();

            if (!move) {
                computerThinking = false;
                endGame();
                return;
            }

            const result = game.makeMove(move.row, move.col, move.letter, "computer");
            renderBoard(result.sosCells);
            updateScore();

            if (result.sosCount > 0) {
                showToast(`Computer made ${result.sosCount} SOS!`);
            }

            if (result.boardFull) {
                computerThinking = false;
                endGame();
                return;
            }

            if (result.extraTurn) {
                updateTurn();
                setTimeout(computerTurn, 500);
                return;
            }

            game.currentPlayer = "human";
            computerThinking = false;
            updateTurn();
        }

        // UI UPDATES
        function updateScore() {
            document.getElementById("playerScore").textContent = game.playerScore;
            document.getElementById("computerScore").textContent = game.computerScore;
        }

        function updateTurn() {
            const indicator = document.getElementById("turnIndicator");

            if (gameMode === "computer") {
                if (game.currentPlayer === "human") {
                    indicator.textContent = `${player1Name}'s Turn`;
                } else {
                    indicator.textContent = "Computer is thinking...";
                }
            } else {
                if (game.currentPlayer === "human") {
                    indicator.textContent = `${player1Name}'s Turn`;
                } else {
                    indicator.textContent = `${player2Name}'s Turn`;
                }
            }
        }

        // START GAME
        function startGame() {
            const rows = parseInt(document.getElementById("rowsInput").value);
            const cols = parseInt(document.getElementById("colsInput").value);

            if (Number.isNaN(rows) || Number.isNaN(cols) || rows < 3 || rows > 10 || cols < 3 || cols > 10) {
                showToast("Rows and columns must be between 3 and 10.");
                return;
            }

            game = new SOSGame(rows, cols, gameMode === "multiplayer" ? "N/A" : selectedDifficulty);
            selectedLetter = "S";

            document.querySelectorAll(".letter-btn").forEach(button => {
                button.classList.toggle("selected", button.dataset.letter === "S");
            });

            // Update UI Labels
            document.getElementById("player1Label").textContent = player1Name.toUpperCase();
            document.getElementById("player2Label").textContent = player2Name.toUpperCase();
            document.getElementById("modeDisplay").textContent = gameMode === "computer" ? "Computer" : "Multiplayer";
            document.getElementById("difficultyDisplay").textContent = gameMode === "computer" ?
                (selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)) : "N/A";

            updateScore();
            updateTurn();
            renderBoard();
            computerThinking = false;

            showScreen("gameScreen");
        }

        // GAME OVER
        function endGame() {
            if (!game) return;
            game.gameOver = true;
            computerThinking = false;

            let resultText = "";
            let icon = "";
            let winnerName = null;

            if (game.playerScore > game.computerScore) {
                resultText = gameMode === "computer" ? "YOU WIN!" : `${player1Name.toUpperCase()} WINS!`;
                icon = "🏆";
                winnerName = player1Name;
            } else if (game.computerScore > game.playerScore) {
                resultText = gameMode === "computer" ? "COMPUTER WINS" : `${player2Name.toUpperCase()} WINS!`;
                icon = gameMode === "computer" ? "🤖" : "🏆";
                winnerName = player2Name;
            } else {
                resultText = "DRAW!";
                icon = "🤝";
            }

            // Save history only on victory
            if (winnerName) {
                saveWinner(winnerName, Math.max(game.playerScore, game.computerScore), gameMode,
                    gameMode === "computer" ? (selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)) : "N/A",
                    game.rows, game.cols);
            }

            document.getElementById("winnerIcon").textContent = icon;
            document.getElementById("gameResult").textContent = resultText;

            document.getElementById("finalPlayer1Label").textContent = `${player1Name} Score`;
            document.getElementById("finalPlayer2Label").textContent = `${player2Name} Score`;
            document.getElementById("finalPlayerScore").textContent = game.playerScore;
            document.getElementById("finalComputerScore").textContent = game.computerScore;

            showScreen("gameOverScreen");
        }

        // EVENT LISTENERS
        document.getElementById("startGameBtn").addEventListener("click", () => showScreen("modeScreen"));
        document.getElementById("historyBtn").addEventListener("click", () => { renderHistory(); showScreen("historyScreen"); });

        // MODE SELECTION
        document.querySelectorAll(".mode-btn").forEach(button => {
            button.addEventListener("click", function () {
                gameMode = this.dataset.mode;
                if (gameMode === "computer") {
                    showScreen("difficultyScreen");
                } else {
                    showScreen("multiplayerNamesScreen");
                }
            });
        });
        document.getElementById("modeBackBtn").addEventListener("click", () => showScreen("homeScreen"));

        // DIFFICULTY SELECTION
        document.querySelectorAll(".difficulty-btn").forEach(button => {
            button.addEventListener("click", function () {
                selectedDifficulty = this.dataset.difficulty;
                showScreen("playerNameScreen");
            });
        });
        document.getElementById("difficultyBackBtn").addEventListener("click", () => showScreen("modeScreen"));

        // PLAYER NAME LOGIC
        document.getElementById("singleNameNextBtn").addEventListener("click", () => {
            const input = document.getElementById("singlePlayerName").value.trim();
            player1Name = input || "Player 1";
            player2Name = "Computer";
            showScreen("setupScreen");
        });
        document.getElementById("singleNameBackBtn").addEventListener("click", () => showScreen("difficultyScreen"));

        document.getElementById("multiNamesNextBtn").addEventListener("click", () => {
            const p1 = document.getElementById("multiPlayer1Name").value.trim();
            const p2 = document.getElementById("multiPlayer2Name").value.trim();
            player1Name = p1 || "Player 1";
            player2Name = p2 || "Player 2";
            showScreen("setupScreen");
        });
        document.getElementById("multiNamesBackBtn").addEventListener("click", () => showScreen("modeScreen"));

        // SETUP
        document.getElementById("setupBackBtn").addEventListener("click", () => {
            if (gameMode === "computer") showScreen("playerNameScreen");
            else showScreen("multiplayerNamesScreen");
        });
        document.getElementById("beginGameBtn").addEventListener("click", startGame);

        // IN GAME
        document.querySelectorAll(".letter-btn").forEach(button => {
            button.addEventListener("click", function () {
                if (gameMode === "computer" && game && game.currentPlayer !== "human") return;
                selectedLetter = this.dataset.letter;
                document.querySelectorAll(".letter-btn").forEach(btn => btn.classList.remove("selected"));
                this.classList.add("selected");
            });
        });

        document.getElementById("restartBtn").addEventListener("click", () => { if (game) startGame(); });
        document.getElementById("gameHomeBtn").addEventListener("click", () => { game = null; computerThinking = false; showScreen("homeScreen"); });

        // GAME OVER
        document.getElementById("playAgainBtn").addEventListener("click", startGame);
        document.getElementById("gameOverHomeBtn").addEventListener("click", () => { game = null; showScreen("homeScreen"); });
        document.getElementById("historyBackBtn").addEventListener("click", () => showScreen("homeScreen"));

        // INITIALIZATION
        showScreen("homeScreen");