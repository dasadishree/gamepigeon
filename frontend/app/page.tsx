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

  async function startGame() {
    const response= await fetch(`${API_URL}/game/anagrams/new`);
    const data = await response.json();

    setGameId(data.game_id);
    setLetters(data.letters);
    setTimeLeft(data.time_limit);
    setScore(0);
    setWord("");
    setMessage("");
  }

  async function submitWord() {
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
    if(timeLeft<=0){
      return;
    }
    const timer=setInterval(()=>{
      setTimeLeft((current)=>current-1);
    }, 100);
    return () => clearInterval(timer);
  }, [timeLeft]);

  return(
    <main>
      <h1>anagrams</h1>
      <p>Time: {timeLeft}</p>
      <p>Score: {score}</p>
      <div>
        {letters.map((letter, index)=>(
          <button key={index}>
            {letter.toUpperCase()}
          </button>
        ))}
      </div>
      <input
        value={word}
        onChange={(event)=>setWord(event.target.value)}
        onKeyDown={(event)=>{
          if(event.key==="Enter"){
            submitWord();
          }
        }}
        placeholder="type a word..."
      />
      <button onClick={submitWord}>
        submit
      </button>
      <p>{message}</p>
    </main>
  )
}