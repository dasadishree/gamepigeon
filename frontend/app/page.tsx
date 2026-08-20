"use client";
import {useEffect, useState } from "react";
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
    } else {
      setMessage(data.message);
    }
    setWord("");
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
    <main>
      <h1>anagrams</h1>
      <p>Time: {timeLeft}</p>
      <p>Score: {score}</p>
      <div>
        {letters.map((letter, index)=>(
          <button 
            key={index}
            disabled={timeLeft<=0||usedLetters.includes(index)}
            onClick={()=>{
              setWord(word+letter);
              setUsedLetters([...usedLetters, index]);
            }}
          >
            {letter.toUpperCase()}
          </button>
        ))}
         <button onClick={()=>{
            if(word.length===0) return;
            setWord(word.slice(0,-1));
            setUsedLetters(usedLetters.slice(0,-1));
          }}
          disabled={timeLeft<=0||word.length===0}
          >
            ←
          </button>
          <button
            onClick={()=>{
              setWord("");
              setUsedLetters([]);
            }}
            disabled={timeLeft<=0||word.length===0}
          >
            clear
          </button>
      </div>
      <input
        disabled={timeLeft<=0}
        value={word}
        onChange={(event)=>setWord(event.target.value)}
        onKeyDown={(event)=>{
          if(event.key==="Enter"){
            submitWord();
          }
        }}
        placeholder="type a word..."
      />
      <button onClick={submitWord} disabled={timeLeft<=0}>
        submit
      </button>
      <p>{message}</p>
      <button onClick={startGame}>
        New Game
      </button>
    </main>
  );
}