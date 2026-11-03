"use client";
import {useEffect,useState} from "react";
import styles from "./page.module.css";
const API_URL = "http://127.0.0.1:8000";

type Word ={
    word: string;
    points: number;
};

type PlayerResult={
    player_id: string;
    score: number;
    words: Word[];
};

type GameResults ={
    success: boolean;
    players: PlayerResult[];
};

export default function ResultsPage(){
    const [results, setResults] = useState<GameResults | null>(null);
    const [playerId, setPlayerId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadResults() {
            const params = new URLSearchParams(window.location.search);
            const gameId = params.get("gameId");
            const savedPlayerId = sessionStorage.getItem("playerId");
            if(!gameId || !savedPlayerId){
                setError("Missing game information.");
                setLoading(false);
                return;
            }
            setPlayerId(savedPlayerId);
            try{
                let data;
                while(true){
                    const response=await fetch(
                        `${API_URL}/game/anagrams/${gameId}/results`
                    );
                    data=await response.json();
                    if (response.ok && data.success) {
                        break;
                    }
                    if(response.status!==400){
                        throw new Error(data.detail || "Could not load results.");
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
                setResults(data);
            } catch(err){
                setError(
                    err instanceof Error ? err.message : "Something went wrong."
                );
            } finally {
                setLoading(false);
            }
        }
        loadResults();
    }, []);

    const yourResult = results?.players.find(
        (player) => player.player_id === playerId
    );

    const opponentResult = results?.players.find(
        (player) => player.player_id !== playerId
    )

    const yourWords = yourResult?.words ?? [];
    const opponentWords = opponentResult?.words ?? [];
    const opponentFinished = !!results && !!opponentResult;
    const yourScore = yourResult?.score ?? 0;
    const opponentScore = opponentResult?.score ?? 0;
    const yourWon = yourScore > opponentScore;
    const youLost = yourScore < opponentScore;
    const tie=yourScore===opponentScore;

    if(loading){
        return<main className={styles.page}>Loading results...</main>;
    }
    if(error || !results || !yourResult || !opponentResult) {
        return (
            <main className={styles.page}>
                {error || "Could not find both players' results."}
            </main>
        );
    }

    return(
        <main className={styles.page}>

            <div className={styles.players}>
                <section 
                    className={`${styles.playerSide} ${
                        yourWon ? styles.winnerPanel : tie ? styles.tiePanel : ""
                    }`}>
                    <h1 className={styles.playerName}>You</h1>
                    <div className={`${styles.avatar} ${
                        yourWon ? styles.winnerAvatar : ""
                        }`}
                    >
                        🤑
                    </div>

                    <div className={styles.scorePaper}>
                        <div className={styles.paperWords}>
                            WORDS: {yourWords.length}
                        </div>

                        <div className={styles.paperScore}>
                            SCORE: {yourScore.toString().padStart(4, "0")}
                        </div>
                    </div>

                    <div className={styles.wordListBox}>
                        {yourWords.map((item, index) => (
                            <div className={styles.wordRow} key={index}>
                                <div className={styles.wordCard}>
                                    {item.word}
                                </div>

                                <div className={styles.points}>
                                    +{item.points}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section 
                    className={`${styles.playerSide} ${
                        youLost ? styles.loserPanel : tie ? styles.tiePanel : ""
                    }`}>
                    <h1 className={styles.playerName}>
                        Opponent
                    </h1>

                    <div className={`${styles.avatar} ${youLost ? styles.loserAvatar : ""}`}>
                        👤
                    </div>

                    {opponentFinished ? (
                        <>
                        <div className={styles.scorePaper}>
                            <div className={styles.paperWords}>
                                WORDS: {opponentWords.length}
                            </div>

                            <div className={styles.paperScore}>
                                SCORE: {opponentScore
                                    .toString()
                                    .padStart(4, "0")
                                }
                            </div>
                        </div>

                        <div className={styles.wordListBox}>
                            {opponentWords.map((item, index) => (
                                <div className={styles.wordRow} key={index}>
                                    <div className={styles.wordCard}>
                                        {item.word}
                                    </div>

                                    <div className={styles.points}>
                                        +{item.points}
                                    </div>
                                </div>
                            ))}

                        </div>
                    </>
                ) : (
                    <div className={styles.waitingBox}>
                        Waiting...
                    </div>
                )}
                </section>
            </div>
            
            {!opponentFinished ? (
                <div className={styles.bottomWaiting}>
                    WAITING FOR OPPONENT
                </div>
            ) : yourWon ? (
                <div className={styles.youWon}>
                    YOU WON!
                </div>
            ) : youLost ? (
                <div className={styles.youLost}>
                    YOU LOST!
                </div>
            ) : (
                <div className={styles.youTie}>
                    TIE
                </div>
            )}


            <button
                className={styles.lobbyButton}
                type="button"
                onClick={() => {
                    window.location.href="/lobby";
                }}
            >
                PLAY AGAIN
            </button>
        </main>
    );
}