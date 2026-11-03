"use client";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import styles from "../page.module.css";

const API_URL = "http://127.0.0.1:8000";

export default function GamePage(){
    const [gameId, setGameId] = useState("");
    const [playerId, setPlayerId] = useState("");
    const [letters, setLetters] = useState<string[]>([]);
    const [word, setWord] = useState("");
    const [score, setScore] = useState(0);
    const [message, setMessage] = useState("");
    const [timeLeft, setTimeLeft] = useState(60);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [usedLetters, setUsedLetters] = useState<number[]>([]);
    const [wordsFound, setWordsFound] = useState(0);
    const [feedbackType, setFeedbackType] = useState<"correct" | "incorrect" | null>(null);
    const router = useRouter();

    useEffect(() => {
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
        if(!gameId) return;
        async function loadGame() {
            try{
                const response = await fetch(
                    `${API_URL}/game/anagrams/${gameId}/status`
                );
                const data = await response.json();
                if(!data.success){
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
                setLetters(data.letters);
                const gameEndTime = new Date(data.started_at).getTime()+data.time_limit*1000;
                setEndTime(gameEndTime);
                setTimeLeft(Math.max(0, Math.ceil((gameEndTime-Date.now())/1000)
                )
            );
            } catch {
                setMessage("couldn't connect to the server.");
            }
        }
        loadGame();
    }, [gameId, router]);

    //submit a word
    async function submitWord() {
        if(timeLeft<=0||!gameId||!playerId) return;
        if(word.trim().length<3) return;
        const submittedWord=word.trim().toLowerCase();
        try{
            const response = await fetch(
                `${API_URL}/game/anagrams/check`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        game_id: gameId,
                        player_id: playerId,
                        word: submittedWord,
                    }),
                }
            );

            const data = await response.json();
            if(data.valid){
                setScore(data.total_score);
                setWordsFound((prev)=>prev+1);
                setMessage(`${submittedWord.toUpperCase()} (+${data.points})`);
                setFeedbackType("correct");
            } else {
                setMessage(data.message);
                setFeedbackType("incorrect");
            }
            setWord("");
            setUsedLetters([]);
        } catch {
            setMessage("Couldn't submit your word. Try again.");
            setFeedbackType("incorrect");
        }
    }
    function addLetter(letter: string, index: number){
        if(timeLeft<=0||usedLetters.includes(index)) return;
        setMessage("");
        setFeedbackType(null);
        setWord((prev)=>prev+letter);
        setUsedLetters((prev)=>[...prev,index]);
    }

    function removeLetter() {
        if(word.length===0) return;
        setMessage("");
        setFeedbackType(null);
        setWord((prev)=>prev.slice(0, -1));
        setUsedLetters((prev)=>prev.slice(0,-1));
    }

    function clearWord() {
        setWord("");
        setUsedLetters([]);
        setMessage("");
        setFeedbackType(null);
    }

    function handleTyping(value: string){
        const newLetter = value.slice(-1).toUpperCase();
        if(value.length<word.length){
            removeLetter();
            return;
        }
        if(!/^[A-Z]$/.test(newLetter)) return;
        const availableIndex = letters.findIndex(
            (letter,index)=>
                letter.toUpperCase() === newLetter && !usedLetters.includes(index)
        );
        if(availableIndex===-1) return;
        addLetter(newLetter, availableIndex);
    }

    function formatTime(seconds: number) {
        const minutes = Math.floor(seconds/60);
        const remainingSeconds=seconds%60;
        return `${minutes}:${remainingSeconds.toString().padStart(2,"0")}`;
    }

    useEffect(()=> {
        if(endTime===null) return;
        const timer=setInterval(()=> {
            const remaining = Math.max(
                0, 
                Math.ceil((endTime-Date.now())/1000)
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
            <div className={styles.timer}>
                {formatTime(timeLeft)}
            </div>
            <div className={styles.scoreNote}>
                <div className={styles.avatar}>🤑</div>
                <div className={styles.noteText}>
                    <div className={styles.wordsTest}>
                        WORDS: {wordsFound}
                    </div>

                    <div className={styles.scoreText}>
                        SCORE: {score.toString().padStart(4,"0")}
                    </div>
                </div>
            </div>
            <div className={styles.inputArea}>
                <input
                    className={styles.wordInput}
                    disabled={timeLeft<=0}
                    value={word}
                    onChange={(event)=>handleTyping(event.target.value)}
                    onKeyDown={(event)=>{
                        if(event.key==="Enter") submitWord();
                        if(event.key==="Backspace"){
                            event.preventDefault();
                            removeLetter();
                        }
                    }}
                    placeholder="type a word..."
                />

                <button
                    className={styles.backButton}
                    onClick={removeLetter}
                    disabled={timeLeft<=0||word.length===0}
                >
                    ←
                </button>

                <button
                    className={styles.clearButton}
                    onClick={clearWord}
                    disabled={timeLeft<=0 || word.length===0}
                >
                    Clear
                </button>
            </div>

            <button
                className={styles.enterButton}
                onClick={submitWord}
                disabled={timeLeft<=0}
            >
                ENTER
            </button>

            <div
                className={`${styles.wordArea} ${
                    feedbackType==="correct"
                        ? styles.wordAreaCorrect
                        : feedbackType==="incorrect"
                        ? styles.wordAreaIncorrect
                        : ""
                }`}
            > 
                <div className={styles.wordSlots}>
                    {Array.from({length: letters.length}).map((_, index) => (
                        <div
                            key={index}
                            className={`${styles.wordSlot} ${
                                index<word.length ? styles.filledSlot : ""
                            }`}
                        >
                            {index<word.length
                                ? word[index].toUpperCase()
                                : ""}
                        </div>
                    ))}
                </div>

                {message && (
                    <div
                        className={`${styles.wordFeedback} ${
                            feedbackType==="correct"
                                ? styles.feedbackCorrect
                                : styles.feedbackIncorrect
                        }`}
                    >
                        {message}
                    </div>
                )}
            </div>
            <div className={styles.letterArea}>
                {letters.map((letter, index)=> (
                    <button
                        key={index}
                        className={`${styles.letterTitle} ${
                            usedLetters.includes(index) ? styles.usedTitle : ""
                        }`}
                        disabled={timeLeft<=0||usedLetters.includes(index)}
                        onClick={()=>addLetter(letter,index)}
                    >
                        {letter.toUpperCase()}
                    </button>
                ))}
            </div>
        </main>
    );
}