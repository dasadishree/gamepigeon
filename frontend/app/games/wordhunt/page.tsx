"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import styles from "./page.module.css";
const API_URL = "http://127.0.0.1:8000";
type Board = string[][];

type TilePosition ={
    row: number;
    col: number;
};

export default function WordHuntPage() {
    const router = useRouter();
    const [gameId, setGameId] = useState("");
    const [playerId, setPlayerId] = useState("");
    const [board, setBoard] = useState<Board>([]);
    const [timeLeft, setTimeLeft] = useState(60);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [wordsFound, setWordsFound] = useState(0);
    const [message, setMessage] = useState("");
    const [selectedTiles, setSelectedTiles] = useState<TilePosition[]>([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [validTiles, setValidTiles] = useState<TilePosition[]>([]);

    useEffect(() => {
        sessionStorage.setItem("gameType", "wordhunt");
        const params = new URLSearchParams(window.location.search);
        const id = params.get("gameId");
        const player = sessionStorage.getItem("playerId");
        const gameType = sessionStorage.getItem("gameType");
        if(!id || !player || gameType !== "wordhunt") {
            router.push("/lobby");
            return;
        }
        setGameId(id);
        setPlayerId(player);
    }, [router]);

    useEffect(() => {
        if(!gameId) return;
        async function loadGame() {
            try{
                const response = await fetch(
                    `${API_URL}/game/wordhunt/${gameId}/status`
                );
                const data = await response.json();
                if(!data.success) {
                    setMessage(data.message);
                    return;
                }
                if(data.status==="waiting"){
                    router.push(`/lobby/${gameId}`);
                    return;
                }
                if(data.status==="finished"){
                    sessionStorage.setItem("gameType", "wordhunt")
                    router.push(`/results?gameId=${gameId}`);
                    return;
                }
                setBoard(data.board);
                const gameEndTime = new Date(data.started_at).getTime()+data.time_limit*1000;
                setEndTime(gameEndTime);
                setTimeLeft(
                    Math.max(
                        0,
                        Math.ceil((gameEndTime-Date.now()) / 1000)
                    )
                );
            } catch {
                setMessage("Couldn't connect to the server.");
            }
        }
        loadGame();
    }, [gameId, router]);

    useEffect(() => {
        if(endTime === null) return;
        const timer = setInterval(() => {
            const remaining = Math.max(
                0,
                Math.ceil((endTime - Date.now()) / 1000)
            );
            setTimeLeft(remaining);
            if(remaining===0){
                clearInterval(timer);
                sessionStorage.setItem("gameType", "wordhunt");
                router.push(`/results?gameId=${gameId}`);
            }
        }, 250);
        return () => clearInterval(timer);
    }, [endTime, gameId, router]);

    function startSelection(row: number, col: number) {
        setIsSelecting(true);
        setSelectedTiles([{row, col}])
    }

    // submit word
    async function endSelection() {
        setIsSelecting(false);

        if(selectedTiles.length<3){
            setSelectedTiles([]);
            return;
        }

        const word = selectedTiles
            .map(tile => board[tile.row][tile.col])
            .join("")
            .toLowerCase();

        try{
            const response=await fetch(`${API_URL}/game/wordhunt/check`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    game_id: gameId,
                    player_id: playerId,
                    word: word,
                }),
            });
            const data = await response.json();
            if(data.valid){
                setScore(data.total_score);
                setWordsFound(previous => previous+1);
                setMessage(`${word.toUpperCase()} +${data.points}`);
                setValidTiles(selectedTiles);
                setSelectedTiles([]);
                setTimeout(() => {
                    setValidTiles([]);
                    setMessage("");
                }, 800);
            } else {
                setSelectedTiles([]);
            }
        } catch {
            setSelectedTiles([]);
        }
    }

    function addTile(row: number, col: number) {
        if(timeLeft<=0) return;
        setSelectedTiles((previous)=>{
            const alreadySelected = previous.some(
                (tile) => tile.row === row && tile.col === col
            );
            if(alreadySelected) return previous;
            if(previous.length>0){
                const lastTile = previous[previous.length-1];
                const rowDifference = Math.abs(lastTile.row - row);
                const colDifference = Math.abs(lastTile.col-col);
                if(rowDifference>1 || colDifference > 1) {
                    return previous;
                }
            }

            return [...previous, { row, col }];
        });
    }

    return(
        <main className={styles.page}>
            <div className={styles.timer}>
                <strong>{timeLeft}</strong>
            </div>

            <div className={styles.gameContainer}>
                <div className={styles.scoreNote}>
                    <div className={styles.noteText}> 
                        <div className={styles.wordsText}>SCORE:</div>
                        <div className={styles.scoreText}>{score}</div>
                    </div>
                </div>

                {message && (
                    <p className={styles.message}>{message}</p>
                )}

                <div className={styles.board}>
                    {/* white connecting line */}
                    <svg className={styles.selectionLines} viewBox="0 0 400 400">
                        {selectedTiles.length>1 && (
                            <polyline
                                points={selectedTiles
                                    .map(tile=>`${50+tile.col*100},${50+tile.row*100}`)
                                    .join(" ")}
                                fill="none"
                                stroke="white"
                                strokeWidth="13"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}
                    </svg>

                    {board.map((row, rowIndex) => 
                        row.map((letter, colIndex) => (
                            <button
                                key={`${rowIndex}-${colIndex}`}
                                className={`${styles.letterTile} ${
                                    selectedTiles.some(
                                        tile => tile.row === rowIndex && tile.col === colIndex
                                    ) 
                                        ? styles.selectedTile
                                        : validTiles.some(
                                            tile => tile.row === rowIndex && tile.col === colIndex
                                        )
                                        ? styles.validTile
                                        : ""
                                }`}

                                disabled={timeLeft<=0}
                                onPointerDown={()=>startSelection(rowIndex, colIndex)}
                                onPointerEnter={()=>{
                                    if(isSelecting){
                                        addTile(rowIndex,colIndex);
                                    }
                                }}
                                onPointerUp={endSelection}
                            >
                                {letter.toUpperCase()}
                            </button>
                        ))
                    )}
                </div>

                <p className={styles.instructions}>
                    Connect letters to find words!
                </p>
            </div>
        </main>
    );
}