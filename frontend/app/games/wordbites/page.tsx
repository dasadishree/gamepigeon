"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const API_URL = "http://127.0.0.1:8000";
type Tile = {
    id: string;
    letters: string;
    orientation: "single" | "horizontal" | "vertical";
    row: number | null;
    col:number | null;
};

type Board = {
    rows: number;
    cols: number;
    tiles: Tile[];
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
    const [word, setWord] = useState("");
    const [message, setMessage] = useState("");
    const [draggedTile, setDraggedTile] = useState<string | null>(null);
    const [movingTile, setMovingTile] = useState(false);
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

    async function moveTile(row: number, col: number) {
        if(!draggedTile || !board || timeLeft <= 0 || movingTile) {
            return;
        }
        setMovingTile(true);
        try{
            const response = await fetch(
                `${API_URL}/game/wordbites/move`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        game_id: gameId,
                        player_id: playerId,
                        tile_id: draggedTile,
                        row,
                        col,
                    }),
                }
            );
            const data = await response.json();

            if(data.success) {
                setBoard(data.board);
                setMessage("");
            } else {
                setMessage(data.message);
            } 
        } catch {
            setMessage("couldn't move that tile");
        } finally {
            setDraggedTile(null);
            setMovingTile(false);
        }
    }
    
    async function submitWord(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if(!word.trim() || timeLeft <= 0) return;
        try {
            const response = await fetch(
                `${API_URL}/game/wordbites/check`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        game_id: gameId,
                        player_id: playerId,
                        word: word,
                    }),
                }
            );
            const data = await response.json();
            if(data.valid){
                setScore(data.total_score);
                setWordsFound(previous => previous +1);
                setMessage(`${data.word.toUpperCase()} + ${data.points}`);
                setWord("");
            } else {
                setMessage(data.message);
            }
        } catch {
            setMessage("Couldn't submit your word.");
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
    const placedTiles = board.tiles.filter(
        tile => tile.row !== null && tile.col !== null
    );
    const trayTiles = board.tiles.filter(
        tile => tile.row === null
    );
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
                {message && (
                    <p className={styles.message}>{message}</p>
                )}
                <div className={styles.board}>
                    {Array.from(
                        { length: board.rows * board.cols },
                        (_, index) => {
                            const row = Math.floor(index / board.cols);
                            const col = index % board.cols;
                            return(
                                <div
                                    key={`${row}-${col}`}
                                    className={styles.boardCell}
                                    onDragOver={event=>event.preventDefault()}
                                    onDrop={() => moveTile(row, col)}
                                />
                            );
                        }
                    )}
                    {placedTiles.map(tile => (
                        <button
                            key={tile.id}
                            type="button"
                            draggable={timeLeft>0 && !movingTile}
                            onDragStart={()=>setDraggedTile(tile.id)}
                            onDragEnd={() => setDraggedTile(null)}
                            className={`${styles.tile} ${
                                tile.orientation === "single"
                                    ? styles.singleTile
                                    : styles.doubleTile
                            }`}
                            style={{
                                gridRow: `${tile.row! + 1} / span ${
                                    tile.orientation === "vertical" ? 2 : 1
                                }`,
                                gridColumn: `${tile.col! + 1} / span ${
                                    tile.orientation === "horizontal" ? 2 : 1
                                }`,
                            }}
                        >
                            {tile.letters.toUpperCase()}
                        </button>
                    ))}
                </div>

                <p className={styles.instructions}>
                    Drag your tiles onto the board. Double-letter tiles
                    must stay together!
                </p>

                <div className={styles.tray}>
                    <h2>YOUR TILES</h2>
                    <div className={styles.trayTiles}>
                        {trayTiles.map(tile => (
                            <button
                                key={tile.id}
                                type="button"
                                draggable={timeLeft > 0 && !movingTile}
                                onDragStart={() => setDraggedTile(tile.id)}
                                onDragEnd={() => setDraggedTile(null)}
                                className={`${styles.tile} ${
                                    tile.orientation === "single"
                                        ? styles.singleTile
                                        : styles.doubleTile
                                }`}
                            >
                                {tile.letters.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <form
                    className={styles.wordForm}
                    onSubmit={submitWord}
                >
                    <input
                        type="text"
                        value={word}
                        onChange={event => setWord(event.target.value)}
                        placeholder="Enter a word..."
                        disabled={timeLeft<=0}
                    />
                    <button
                        type="submit"
                        disabled={timeLeft<=0 || !word.trim()}
                    >
                        SUBMIT
                    </button>
                </form>
            </div>
        </main>
    );
}