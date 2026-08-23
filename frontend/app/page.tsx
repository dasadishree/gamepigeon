"use client";
import {useEffect, useState } from "react";
import styles from "./page.module.css";

const API_URL = "http://127.0.0.1:8000";

export default function Home() {
  const [gameId, setGameId] = useState("");
  const [letters, setLetters] = useState<string[]>([]);
  const [word, setWord] = useState("");
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [usedLetters, setUsedLetters] = useState<number[]>([]);
  const [wordsFound, setWordsFound] = useState(0);

  async function startGame() {
    const response= await fetch(`${API_URL}/game/anagrams/new`);
    const data = await response.json();

    setGameId(data.game_id);
    setLetters(data.letters);
    setTimeLeft(data.time_limit);
    setEndTime(Date.now() + data.time_limit*1000);
    setScore(0);
    setWord("");
    setMessage("");
    setUsedLetters([]);
    setWordsFound(0);
  }

  async function submitWord() {
    if(timeLeft<=0){
      setMessage("Time's up!");
      return;
    }
    if(!word.trim()) {
      return;
    }
    const response = await fetch(`${API_URL}/game/anagrams/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        game_id: gameId,
        player_id: "adishree",
        word: word,
      }),
    });

    const data = await response.json();
    if(data.valid){
      setMessage(`Correct! +${data.points} points`);
      setScore(data.total_score);
      setWordsFound((prev)=>prev+1);
    } else {
      setMessage(data.message);
    }
    setWord("");
    setUsedLetters([]);
  }

  function addLetter(letter: string, index: number){
    if(timeLeft<=0||usedLetters.includes(index)){
      return;
    }
    setWord((prev)=>prev+letter);
    setUsedLetters((prev)=>[...prev, index]);
  }

  function removeLetter(){
    if(word.length===0){
      return;
    }
    setWord((prev)=>prev.slice(0,-1));
    setUsedLetters((prev)=>prev.slice(0,-1));
  }

  function clearWord(){
    setWord("");
    setUsedLetters([]);
  }

  useEffect(()=> {
    startGame();
  }, []);

  useEffect(() => {
    if(endTime===null){
      return;
    }
    const timer=setInterval(()=>{
      const remaining=Math.max(0,
        Math.ceil((endTime-Date.now()) / 1000)
      );

      setTimeLeft(remaining);

      if(remaining===0){
        clearInterval(timer);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [endTime]);

  return(
    <main className={styles.page}>
      <div className={styles.header}>
        <h1>anagrams</h1>
        <div className={styles.timer}>
          <span>Time</span>
          <strong>{timeLeft}</strong>
        </div>
      </div>
      
      <div className={styles.scoreNote}>
        <div className={styles.pin}></div>
        <div className={styles.noteText}>
          <div>
            Score: <span>{score}</span>
          </div>
          <div>
            Words: <span>{wordsFound}</span>
          </div>
        </div>
      </div>

      <div className={styles.wordArea}>
        {letters.map((_, index) => {
          const letterIndex = usedLetters.indexOf(index);
          return(
            <div
              key={index}
              className={`${styles.wordSlot} ${
                letterIndex !== -1 ? styles.filledSlot : ""
              }`}
            >
              {letterIndex !== -1
              ? word[letterIndex].toUpperCase()
              : ""}
            </div>
          );
        })}
      </div>

      <div className={styles.message}>
        {message}
      </div>

      <div className={styles.letterArea}>
        {letters.map((letter, index)=>(
          <button 
            key={index}
            className={`${styles.letterTile} ${
              usedLetters.includes(index) ? styles.usedTile : ""
            }`}
            disabled={timeLeft<=0||usedLetters.includes(index)}
            onClick={()=>addLetter(letter, index)}
          >
            {letter.toUpperCase()}
          </button>
        ))} 
      </div>

      <div className={styles.inputArea}>
        <input 
          className={styles.wordInput}
          disabled={timeLeft<=0}
          value={word}
          onChange={(event)=>{
            setWord(event.target.value);
            setUsedLetters([]);
          }}
          onKeyDown={(event)=> {
            if(event.key==="Enter"){
              submitWord();
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
          disabled={timeLeft<=0||word.length===0}
        >
          Clear
        </button>
      </div>

      <button
        className={styles.submitButton}
        onClick={submitWord}
        disabled={timeLeft<=0}
      >
        Submit
      </button>
      <button
        className={styles.newGameButton}
        onClick={startGame}
      >
        New Game
      </button>
    </main>
  );
}