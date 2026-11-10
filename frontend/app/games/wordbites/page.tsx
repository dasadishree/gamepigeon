"use client";
import { useEffect, useRef,useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const API_URL = "http://127.0.0.1:8000";
type Board = {
    rows: number;
    cols: number;
    grid: string[][];
};

export default function WordBitesPage() {
    const router = useRouter();
    const [gameId, setGameId] = useState("");
    const [playerId, setPlayerId] = useState("");
    const [board, setBoard] = useState<Board | null>(null);
    const [timeLeft, setTimeLeft] = useState(60);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [wordsFound, setWordsFound] = useState(0);
    const [foundWords, setFoundWords] = useState<
        {word: string; points: number}[]
    >([]);
    const [message, setMessage] = useState("");
    const [selectedPositions, setSelectedPositions] = useState<[number, number][]>([]);
    const selectedPositionsRef = useRef<[number, number][]>([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        sessionStorage.setItem("gameType", "wordbites");
        const params = new URLSearchParams(window.location.search);
        const id = params.get("gameId");
        const player = sessionStorage.getItem("playerId");
        if(!id || !player) {
            router.push("/lobby");
            return;
        }
        setGameId(id);
        setPlayerId(player);
    }, [router]);

    useEffect(() => {
        if(!gameId || !playerId) return;
        async function loadGame() {
            try{
                const response = await fetch(
                    `${API_URL}/game/wordbites/${gameId}/status?player_id=${encodeURIComponent(playerId)}`
                );
                const data = await response.json();
                if(!data.success){
                    setMessage(data.message);
                    return;
                }
                if(data.status==="waiting") {
                    router.push(`/lobby/${gameId}`);
                    return;
                }
                if(data.status==="finished"){
                    router.push(`/results?gameId=${gameId}`);
                    return;
                }
                setBoard(data.board);
                setScore(data.score);
                setWordsFound(data.words.length);
                setFoundWords(data.word_details ?? []);
                const gameEndTime = new Date(data.started_at).getTime() + data.time_limit *1000;
                setEndTime(gameEndTime);
                setTimeLeft(Math.max(0, Math.ceil((gameEndTime-Date.now())/1000)));
            } catch {
                setMessage("couldn't connect to the server");
            }
        }
        loadGame();
    }, [gameId, playerId, router]);

    useEffect(() => {
        if(endTime === null) return;
        const timer = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            setTimeLeft(remaining);
            if(remaining===0){
                clearInterval(timer);
                sessionStorage.setItem("gameType", "wordbites");
                router.push(`/results?gameId=${gameId}`);
            }
        }, 250);
        return () => clearInterval(timer);
    }, [endTime, gameId, router]);

    // wordbites selecti cells function
    function selectCell(row: number, col: number) {
        if(timeLeft <= 0 || submitting) return;
        const previous = selectedPositionsRef.current;
        if(previous.some(([r, c]) => r === row && c === col)) return;
        if(previous.length>0){
            const [lastRow, lastCol] = previous[previous.length-1];
            const isAdjacent = Math.abs(row - lastRow) <= 1 && Math.abs(col - lastCol) <= 1;
            if(!isAdjacent) return;
        }
        const updated = [...previous, [row, col] as [number, number]];
        
        selectedPositionsRef.current = updated;
        setSelectedPositions(updated);
    }

    // drag
    async function finishSelection() {
        const positions = selectedPositionsRef.current;
        if(!board || positions.length<3 || submitting || timeLeft<=0) {
            selectedPositionsRef.current = [];
            setSelectedPositions([]);
            setIsSelecting(false);
            return;
        }
        const selectedWord = positions
            .map(([row, col]) => board.grid[row][col])
            .join("")
            .toLowerCase();
        selectedPositionsRef.current = [];
        setSelectedPositions([]);
        setIsSelecting(false);
        await checkWord(selectedWord, positions);
    }
    
    // check submitted/selected words
    async function checkWord(selectedWord: string, positions: [number, number][]){
        if(submitting || timeLeft <= 0) return;
        setSubmitting(true);
        try{
            const response = await fetch(
                `${API_URL}/game/wordbites/check`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        game_id: gameId,
                        player_id: playerId,
                        word: selectedWord,
                        positions: positions,
                    }),
                }
            );
            const data = await response.json();
            if(data.valid){
                setScore(data.total_score);
                setWordsFound(previous => previous+1);
                setFoundWords(previous => [
                    ...previous,
                    {
                        word: data.word.toUpperCase(),
                        points: data.points,
                    },
                ]);
                setMessage(`${data.word.toUpperCase()} + ${data.points}`);
            } else {
                setMessage(data.message);
            }
        } catch{
            setMessage("Couldn't submit your word.");
        } finally {
            setSubmitting(false);
        }
    }

    if(!board) {
        return(
            <main className={styles.page}>
                <p className={styles.loading}>
                    {message || "loading word bites..."}
                </p>
            </main>
        );
    }
    return(
        <main className={styles.page}>
            <div className={styles.timer}>
                <strong>{timeLeft}</strong>
            </div>

            <div className={styles.gameContainer}>
                <header className={styles.header}>
                    <h1>WORD BITES</h1>
                </header>
                <div className={styles.stats}>
                    <div className={styles.statCard}>
                        <span>SCORE</span>
                        <strong>{score}</strong>
                    </div>
                    <div className={styles.statCard}>
                        <span>WORDS FOUND</span>
                        <strong>{wordsFound}</strong>
                    </div>
                </div>
                <div className={styles.foundWords}>
                    <h2>FOUND WORDS</h2>
                    {foundWords.length === 0 ? (
                        <p>No words found yet.</p>
                    ) : (
                        <ul>
                            {foundWords.map((item, index) => (
                                <li key={`${item.word}-${index}`}>
                                    <span>{item.word}</span>
                                    <strong>+{item.points}</strong>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {message && (
                    <p className={styles.message}>{message}</p>
                )}
                <div 
                    className={styles.board}
                    onPointerUp={finishSelection}
                    onPointerCancel={finishSelection}
                    onPointerMove={event => {
                        if(!isSelecting) return;
                        const element = document.elementFromPoint(
                            event.clientX,
                            event.clientY
                        );
                        const cell = element?.closest("[data-row][data-col]");
                        if(!cell) return;
                        const row = Number(cell.getAttribute("data-row"));
                        const col=Number(cell.getAttribute("data-col"));
                        selectCell(row, col);
                    }}
                >
                    {board.grid.map((rowLetters, row) => rowLetters.map((letter, col) => {
                        const isSelected = selectedPositions.some(
                            ([r,c]) => r === row && c === col
                        );
                        return(
                            <button
                                key={`${row}-${col}`}
                                type="button"
                                data-row={row}
                                data-col={col}
                                className={`${styles.boardCell} ${
                                    isSelected ? styles.selectedCell : ""
                                }`}
                                onPointerDown={event=> {
                                    event.preventDefault();
                                    selectedPositionsRef.current = [];
                                    setSelectedPositions([]);
                                    setIsSelecting(true);
                                    selectCell(row, col);
                                }}
                            >
                                {letter.toUpperCase()}
                            </button>
                        );
                    })
                )}
            </div>

                <p className={styles.instructions}>
                    Drag across adjacent letters to find words. Words can go in any direction!
                </p>

            </div>
        </main>
    );
}