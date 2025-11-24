const readline = require('readline');

// --- Game Configuration ---
const BOARD_SIZE = 9; // 9x9 is standard for quick games (19x19 is full size)
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

// --- State ---
let board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
let cursor = { x: 4, y: 4 }; // Start in center
let currentPlayer = BLACK;
let message = "Use Arrow Keys to move. ENTER to place stone. CTRL+C to quit.";

// --- Rendering Logic ---
function render() {
    // 1. Move cursor to top-left (0,0) and clear screen
    // \x1B[H moves cursor home, \x1B[2J clears screen
    process.stdout.write('\x1B[H\x1B[2J'); // Hard clear to prevent scrolling artifacts

    // 2. Print Header
    const playerColor = currentPlayer === BLACK ? "\x1B[36mBlack (X)\x1B[0m" : "\x1B[33mWhite (O)\x1B[0m";
    process.stdout.write(`\n  GO (Weiqi) - Player: ${playerColor}\n\n`);

    // 3. Render Board
    // We render a top border, then the rows
    process.stdout.write("    " + Array(BOARD_SIZE).fill(" . ").join("") + "\n");

    for (let y = 0; y < BOARD_SIZE; y++) {
        let rowStr = "   "; // Left padding
        for (let x = 0; x < BOARD_SIZE; x++) {
            // Is the cursor here?
            const isCursor = (x === cursor.x && y === cursor.y);
            
            // Determine symbol for this cell
            let symbol = "┼"; // Standard grid intersection
            let colorCode = "\x1B[90m"; // Dark Gray for grid lines

            const cell = board[y][x];
            if (cell === BLACK) {
                symbol = "●";
                colorCode = "\x1B[36m"; // Cyan for Black
            } else if (cell === WHITE) {
                symbol = "○";
                colorCode = "\x1B[33m"; // Yellow for White
            }

            // Highlighting logic
            if (isCursor) {
                // If cursor is here, use a background color (White bg, Black text)
                // \x1B[47m = White BG, \x1B[30m = Black Text
                rowStr += `\x1B[47m\x1B[30m[${symbol}]\x1B[0m`;
            } else {
                // Normal cell rendering
                if (cell === EMPTY) {
                    rowStr += `${colorCode} ${symbol} \x1B[0m`;
                } else {
                    rowStr += `${colorCode} ${symbol} \x1B[0m`;
                }
            }
        }
        process.stdout.write(rowStr + "\n");
    }

    // 4. Print Status Message
    process.stdout.write(`\n  ${message}\n`);
}

// --- Input Handling ---
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
    // Exit listener
    if (key.ctrl && key.name === 'c') {
        process.stdout.write('\x1B[?25h'); // Show cursor again before exiting
        process.exit();
    }

    message = ""; // Clear old messages on movement

    // Navigation
    if (key.name === 'up' && cursor.y > 0) cursor.y--;
    if (key.name === 'down' && cursor.y < BOARD_SIZE - 1) cursor.y++;
    if (key.name === 'left' && cursor.x > 0) cursor.x--;
    if (key.name === 'right' && cursor.x < BOARD_SIZE - 1) cursor.x++;

    // Action
    if (key.name === 'return') {
        if (board[cursor.y][cursor.x] !== EMPTY) {
            message = "\x1B[31mInvalid Move: Space occupied!\x1B[0m";
        } else {
            // Place stone
            board[cursor.y][cursor.x] = currentPlayer;
            
            // Check for captures (Simple "Suicide" check only for this demo)
            // A real Go engine would check liberties here to remove opponent stones.
            
            // Switch Turn
            currentPlayer = (currentPlayer === BLACK) ? WHITE : BLACK;
            message = "Move placed.";
        }
    }

    render();
});

// --- Start Game ---
process.stdout.write('\x1B[?25l'); // Hide the real terminal cursor so it doesn't flicker
render();