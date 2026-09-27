/* =========================================================
           GLOBAL VARIABLES
        ========================================================= */

        let game = null;
        let selectedDifficulty = "easy";
        let selectedLetter = "S";
        let computerThinking = false;


        /* =========================================================
           SCREEN NAVIGATION
        ========================================================= */

        function showScreen(id) {

            document.querySelectorAll(".screen").forEach(screen => {
                screen.classList.remove("active");
            });

            const target = document.getElementById(id);

            if (target) {
                target.classList.add("active");
            }

            window.scrollTo(0, 0);
        }


        /* =========================================================
           TOAST
        ========================================================= */

        function showToast(message) {

            const toast = document.getElementById("toast");

            toast.textContent = message;
            toast.classList.add("show");

            setTimeout(() => {
                toast.classList.remove("show");
            }, 1600);
        }


        /* =========================================================
           HISTORY
        ========================================================= */

        const HISTORY_KEY = "sosGameWinnerHistory";

        function getHistory() {

            try {

                const data = localStorage.getItem(HISTORY_KEY);

                if (!data) {
                    return [];
                }

                return JSON.parse(data);

            } catch (error) {

                return [];

            }
        }


        function saveWinner(score, difficulty, rows, cols) {

            let history = getHistory();

            history.unshift({

                name: "Player",
                difficulty:
                    difficulty.charAt(0).toUpperCase() +
                    difficulty.slice(1),

                board: rows + " × " + cols,

                score: score,

                date: new Date().toLocaleString()

            });

            history = history.slice(0, 5);

            localStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(history)
            );
        }


        function renderHistory() {

            const list = document.getElementById("historyList");

            const history = getHistory();

            if (history.length === 0) {

                list.innerHTML =
                    `<div class="empty-history">
                No victories recorded yet.
             </div>`;

                return;
            }

            list.innerHTML = history.map((item, index) => {

                return `
            <div class="history-item">

                <div class="history-number">
                    ${index + 1}
                </div>

                <div class="history-main">

                    <strong>
                        ${item.name}
                    </strong>

                    <small>
                        ${item.difficulty}
                        •
                        ${item.board}
                        •
                        ${item.date}
                    </small>

                </div>

                <div class="history-score">
                    ${item.score} SOS
                </div>

            </div>
        `;

            }).join("");
        }


        /* =========================================================
           GAME CLASS
        ========================================================= */

        class SOSGame {

            constructor(rows, cols, difficulty) {

                this.rows = rows;
                this.cols = cols;
                this.difficulty = difficulty;

                this.board = [];

                this.playerScore = 0;
                this.computerScore = 0;

                this.currentPlayer = "human";

                this.gameOver = false;

                this.initBoard();
            }


            initBoard() {

                this.board = [];

                for (let r = 0; r < this.rows; r++) {

                    const row = [];

                    for (let c = 0; c < this.cols; c++) {

                        row.push("");

                    }

                    this.board.push(row);
                }
            }


            isEmpty(row, col) {

                return (
                    row >= 0 &&
                    row < this.rows &&
                    col >= 0 &&
                    col < this.cols &&
                    this.board[row][col] === ""
                );
            }


            makeMove(row, col, letter, player) {

                if (!this.isEmpty(row, col)) {
                    return null;
                }

                this.board[row][col] = letter;

                const sosCells =
                    this.findSOS(row, col);

                const sosCount =
                    sosCells.length;

                if (player === "human") {

                    this.playerScore += sosCount;

                } else {

                    this.computerScore += sosCount;

                }

                const boardFull =
                    this.isBoardFull();

                return {

                    row,
                    col,
                    letter,
                    player,
                    sosCount,
                    sosCells,
                    boardFull,

                    extraTurn: sosCount > 0

                };
            }


            findSOS(row, col) {

                const found = [];

                const directions = [

                    [0, 1],
                    [1, 0],
                    [1, 1],
                    [1, -1]

                ];

                for (const [dr, dc] of directions) {

                    for (let position = 0; position < 3; position++) {

                        const sr =
                            row - position * dr;

                        const sc =
                            col - position * dc;

                        const er =
                            sr + 2 * dr;

                        const ec =
                            sc + 2 * dc;

                        if (
                            sr < 0 ||
                            sr >= this.rows ||
                            sc < 0 ||
                            sc >= this.cols ||
                            er < 0 ||
                            er >= this.rows ||
                            ec < 0 ||
                            ec >= this.cols
                        ) {
                            continue;
                        }

                        if (
                            this.board[sr][sc] === "S" &&
                            this.board[sr + dr][sc + dc] === "O" &&
                            this.board[er][ec] === "S"
                        ) {

                            found.push([

                                [sr, sc],
                                [sr + dr, sc + dc],
                                [er, ec]

                            ]);

                        }

                    }

                }

                return found;
            }


            isBoardFull() {

                for (let r = 0; r < this.rows; r++) {

                    for (let c = 0; c < this.cols; c++) {

                        if (this.board[r][c] === "") {
                            return false;
                        }

                    }

                }

                return true;
            }


            getEmptyCells() {

                const cells = [];

                for (let r = 0; r < this.rows; r++) {

                    for (let c = 0; c < this.cols; c++) {

                        if (this.board[r][c] === "") {

                            cells.push({
                                row: r,
                                col: c
                            });

                        }

                    }

                }

                return cells;
            }


            clone() {

                const copy =
                    new SOSGame(
                        this.rows,
                        this.cols,
                        this.difficulty
                    );

                copy.board =
                    this.board.map(row => [...row]);

                copy.playerScore =
                    this.playerScore;

                copy.computerScore =
                    this.computerScore;

                return copy;
            }
        }


        /* =========================================================
           AI
        ========================================================= */

        class SOSAI {

            constructor(game) {

                this.game = game;

            }


            getMove() {

                const moves =
                    this.getAllMoves();

                if (moves.length === 0) {
                    return null;
                }


                /* EASY */

                if (this.game.difficulty === "easy") {

                    const scoringMoves =
                        moves.filter(move =>
                            this.evaluateMove(move).sosCount > 0
                        );

                    if (scoringMoves.length > 0) {

                        return scoringMoves[
                            Math.floor(
                                Math.random() *
                                scoringMoves.length
                            )
                        ];

                    }

                    return this.randomMove(moves);
                }


                /* MEDIUM */

                if (this.game.difficulty === "medium") {

                    return this.bestMove(
                        moves,
                        false
                    );

                }


                /* HARD */

                return this.bestMove(
                    moves,
                    true
                );
            }


            getAllMoves() {

                const moves = [];

                const empty =
                    this.game.getEmptyCells();

                for (const cell of empty) {

                    moves.push({
                        row: cell.row,
                        col: cell.col,
                        letter: "S"
                    });

                    moves.push({
                        row: cell.row,
                        col: cell.col,
                        letter: "O"
                    });

                }

                return moves;
            }


            evaluateMove(move) {

                const clone =
                    this.game.clone();

                return clone.makeMove(
                    move.row,
                    move.col,
                    move.letter,
                    "computer"
                );
            }


            bestMove(moves, hard) {

                let best = [];
                let bestScore = -Infinity;

                for (const move of moves) {

                    const result =
                        this.evaluateMove(move);

                    if (!result) continue;

                    let score = 0;

                    /* Making SOS is extremely valuable */

                    score += result.sosCount * 1000;


                    /* Center preference */

                    const centerRow =
                        (this.game.rows - 1) / 2;

                    const centerCol =
                        (this.game.cols - 1) / 2;

                    const distance =
                        Math.abs(move.row - centerRow) +
                        Math.abs(move.col - centerCol);

                    score += Math.max(
                        0,
                        30 - distance * 5
                    );


                    /* Hard looks at future player opportunities */

                    if (hard) {

                        const future =
                            result.extraTurn
                                ? this.futureValue()
                                : this.futureValue();

                        score += future * 20;

                    }


                    /* Slight randomness */

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

                const clone =
                    this.game.clone();

                const empty =
                    clone.getEmptyCells();

                for (const cell of empty) {

                    for (const letter of ["S", "O"]) {

                        const result =
                            clone.makeMove(
                                cell.row,
                                cell.col,
                                letter,
                                "human"
                            );

                        if (
                            result &&
                            result.sosCount > 0
                        ) {

                            danger +=
                                result.sosCount;

                        }

                        clone.board[cell.row][cell.col] = "";
                    }

                }

                return -danger;
            }


            randomMove(moves) {

                return moves[
                    Math.floor(
                        Math.random() * moves.length
                    )
                ];
            }
        }


        /* =========================================================
           RENDER BOARD
        ========================================================= */

        function renderBoard(highlightCells = []) {

            const board =
                document.getElementById("gameBoard");

            board.innerHTML = "";

            board.style.gridTemplateColumns =
                `repeat(${game.cols}, 1fr)`;


            for (let r = 0; r < game.rows; r++) {

                for (let c = 0; c < game.cols; c++) {

                    const cell =
                        document.createElement("button");

                    cell.className = "cell";

                    const value =
                        game.board[r][c];

                    cell.textContent = value;

                    if (value !== "") {

                        cell.classList.add("filled");

                    }


                    const highlighted =
                        highlightCells.some(
                            group =>
                                group.some(
                                    ([hr, hc]) =>
                                        hr === r &&
                                        hc === c
                                )
                        );

                    if (highlighted) {

                        cell.classList.add("sos");

                    }


                    cell.addEventListener(
                        "click",
                        () => handlePlayerMove(r, c)
                    );

                    board.appendChild(cell);
                }
            }
        }


        /* =========================================================
           PLAYER MOVE
        ========================================================= */

        function handlePlayerMove(row, col) {

            if (!game) return;

            if (computerThinking) return;

            if (game.currentPlayer !== "human") {
                return;
            }

            if (!game.isEmpty(row, col)) {

                showToast("That cell is already filled.");

                return;
            }


            const result =
                game.makeMove(
                    row,
                    col,
                    selectedLetter,
                    "human"
                );


            if (!result) return;


            renderBoard(result.sosCells);

            updateScore();


            if (result.sosCount > 0) {

                showToast(
                    result.sosCount === 1
                        ? "SOS! You get another turn!"
                        : `${result.sosCount} SOS! You get another turn!`
                );

            }


            if (result.boardFull) {

                endGame();

                return;
            }


            /* SOS gives another turn */

            if (result.extraTurn) {

                game.currentPlayer = "human";

                updateTurn();

                return;
            }


            game.currentPlayer = "computer";

            updateTurn();


            computerThinking = true;

            setTimeout(
                computerTurn,
                600
            );
        }


        /* =========================================================
           COMPUTER TURN
        ========================================================= */

        function computerTurn() {

            if (!game || game.gameOver) {
                computerThinking = false;
                return;
            }


            const ai =
                new SOSAI(game);

            const move =
                ai.getMove();


            if (!move) {

                computerThinking = false;

                endGame();

                return;
            }


            const result =
                game.makeMove(
                    move.row,
                    move.col,
                    move.letter,
                    "computer"
                );


            renderBoard(result.sosCells);

            updateScore();


            if (result.sosCount > 0) {

                showToast(
                    `Computer made ${result.sosCount} SOS!`
                );

            }


            if (result.boardFull) {

                computerThinking = false;

                endGame();

                return;
            }


            /* Computer gets another turn */

            if (result.extraTurn) {

                game.currentPlayer = "computer";

                updateTurn();

                setTimeout(
                    computerTurn,
                    500
                );

                return;
            }


            game.currentPlayer = "human";

            computerThinking = false;

            updateTurn();
        }


        /* =========================================================
           SCORE
        ========================================================= */

        function updateScore() {

            document.getElementById(
                "playerScore"
            ).textContent =
                game.playerScore;

            document.getElementById(
                "computerScore"
            ).textContent =
                game.computerScore;
        }


        /* =========================================================
           TURN
        ========================================================= */

        function updateTurn() {

            const indicator =
                document.getElementById(
                    "turnIndicator"
                );

            if (game.currentPlayer === "human") {

                indicator.textContent =
                    "Your Turn — Choose S or O";

            } else {

                indicator.textContent =
                    "Computer is thinking...";

            }
        }


        /* =========================================================
           START GAME
        ========================================================= */

        function startGame() {

            const rows =
                parseInt(
                    document.getElementById(
                        "rowsInput"
                    ).value
                );

            const cols =
                parseInt(
                    document.getElementById(
                        "colsInput"
                    ).value
                );


            if (
                Number.isNaN(rows) ||
                Number.isNaN(cols) ||
                rows < 3 ||
                rows > 10 ||
                cols < 3 ||
                cols > 10
            ) {

                showToast(
                    "Rows and columns must be between 3 and 10."
                );

                return;
            }


            game =
                new SOSGame(
                    rows,
                    cols,
                    selectedDifficulty
                );


            selectedLetter = "S";


            document.querySelectorAll(
                ".letter-btn"
            ).forEach(button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.letter === "S"
                );

            });


            document.getElementById(
                "difficultyDisplay"
            ).textContent =
                selectedDifficulty
                    .charAt(0)
                    .toUpperCase() +
                selectedDifficulty.slice(1);


            updateScore();

            updateTurn();

            renderBoard();

            computerThinking = false;

            showScreen("gameScreen");
        }


        /* =========================================================
           GAME OVER
        ========================================================= */

        function endGame() {

            if (!game) return;

            game.gameOver = true;

            computerThinking = false;


            let resultText = "";
            let icon = "";


            if (
                game.playerScore >
                game.computerScore
            ) {

                resultText = "YOU WIN!";
                icon = "🏆";


                saveWinner(
                    game.playerScore,
                    selectedDifficulty,
                    game.rows,
                    game.cols
                );

            } else if (
                game.computerScore >
                game.playerScore
            ) {

                resultText = "COMPUTER WINS";
                icon = "🤖";

            } else {

                resultText = "DRAW!";
                icon = "🤝";

            }


            document.getElementById(
                "winnerIcon"
            ).textContent = icon;


            document.getElementById(
                "gameResult"
            ).textContent = resultText;


            document.getElementById(
                "finalPlayerScore"
            ).textContent =
                game.playerScore;


            document.getElementById(
                "finalComputerScore"
            ).textContent =
                game.computerScore;


            showScreen("gameOverScreen");
        }


        /* =========================================================
           EVENT LISTENERS
        ========================================================= */


        /* HOME → DIFFICULTY */

        document
            .getElementById("startGameBtn")
            .addEventListener(
                "click",
                function () {

                    showScreen(
                        "difficultyScreen"
                    );

                }
            );


        /* HOME → HISTORY */

        document
            .getElementById("historyBtn")
            .addEventListener(
                "click",
                function () {

                    renderHistory();

                    showScreen(
                        "historyScreen"
                    );

                }
            );


        /* DIFFICULTY */

        document
            .querySelectorAll(".difficulty-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    function () {

                        selectedDifficulty =
                            this.dataset.difficulty;

                        showScreen(
                            "setupScreen"
                        );

                    }
                );

            });


        /* DIFFICULTY BACK */

        document
            .getElementById(
                "difficultyBackBtn"
            )
            .addEventListener(
                "click",
                function () {

                    showScreen("homeScreen");

                }
            );


        /* SETUP BACK */

        document
            .getElementById(
                "setupBackBtn"
            )
            .addEventListener(
                "click",
                function () {

                    showScreen(
                        "difficultyScreen"
                    );

                }
            );


        /* BEGIN GAME */

        document
            .getElementById(
                "beginGameBtn"
            )
            .addEventListener(
                "click",
                function () {

                    startGame();

                }
            );


        /* LETTER BUTTONS */

        document
            .querySelectorAll(".letter-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    function () {

                        if (
                            game &&
                            game.currentPlayer !== "human"
                        ) {
                            return;
                        }

                        selectedLetter =
                            this.dataset.letter;


                        document
                            .querySelectorAll(
                                ".letter-btn"
                            )
                            .forEach(btn => {

                                btn.classList.remove(
                                    "selected"
                                );

                            });


                        this.classList.add(
                            "selected"
                        );

                    }
                );

            });


        /* RESTART */

        document
            .getElementById(
                "restartBtn"
            )
            .addEventListener(
                "click",
                function () {

                    if (!game) return;

                    startGame();

                }
            );


        /* GAME → HOME */

        document
            .getElementById(
                "gameHomeBtn"
            )
            .addEventListener(
                "click",
                function () {

                    game = null;

                    computerThinking = false;

                    showScreen("homeScreen");

                }
            );


        /* PLAY AGAIN */

        document
            .getElementById(
                "playAgainBtn"
            )
            .addEventListener(
                "click",
                function () {

                    startGame();

                }
            );


        /* GAME OVER → HOME */

        document
            .getElementById(
                "gameOverHomeBtn"
            )
            .addEventListener(
                "click",
                function () {

                    game = null;

                    showScreen("homeScreen");

                }
            );


        /* HISTORY → HOME */

        document
            .getElementById(
                "historyBackBtn"
            )
            .addEventListener(
                "click",
                function () {

                    showScreen("homeScreen");

                }
            );


        /* =========================================================
           INITIALIZATION
        ========================================================= */

        showScreen("homeScreen");

        console.log(
            "SOS Game loaded successfully."
        );