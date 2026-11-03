"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import styles from "./page.module.css";
const API_URL = "http://127.0.0.1:8000";
type Board = string[][];

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

    useEffect(() => {
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
                router.push(`/results?gameId=${gameId}`);
            }
        }, 250);
        return () => clearInterval(timer);
    }, [endTime, gameId, router]);

    return(
        <main className={styles.page}>
            <div className={styles.gameContainer}>
                <div className={styles.scoreNote}>
                    <div className={styles.noteHeader}>
                        WORD HUNT
                    </div>

                    <div className={styles.stats}>
                        <div>
                            <span>TIME</span>
                            <strong>{timeLeft}</strong>
                        </div>
                        <div>
                            <span>SCORE</span>
                            <strong>{score}</strong>
                        </div>
                        <div>  
                            <span>WORDS</span>
                            <strong>{wordsFound}</strong>
                        </div>
                    </div>
                </div>

                {message && (
                    <p className={styles.message}>{message}</p>
                )}

                <div className={styles.board}>
                    {board.map((row, rowIndex) => 
                        row.map((letter, colIndex) => (
                            <button
                                key={`${rowIndex}-${colIndex}`}
                                className={styles.letterTile}
                                disabled={timeLeft<=0}
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