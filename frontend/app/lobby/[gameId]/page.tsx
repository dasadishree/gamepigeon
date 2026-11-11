"use client";

import {useEffect, useState} from "react";
import { useParams, useRouter} from "next/navigation";

const API_URL = "https://gamepigeon-svxj.vercel.app";
export default function WaitingRoom() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.gameId as string;
    const [players, setPlayers] = useState<string[]>([]);
    const [status, setStatus] = useState("waiting");
    const [gameType, setGameType] = useState("anagrams");
    const [message, setMessage] = useState("waiting for another player...");

    useEffect(() => {
        async function checkStatus(){
            try{
                const currentGameType=sessionStorage.getItem("gameType") || "anagrams";
                setGameType(currentGameType);

                const statusUrl = currentGameType === "wordbites" 
                    ? `${API_URL}/game/${currentGameType}/${gameId}/status?player_id=${encodeURIComponent(sessionStorage.getItem("playerId") || "")}`
                    : `${API_URL}/game/${currentGameType}/${gameId}/status`;

                const response=await fetch(statusUrl);
                const data = await response.json();
                console.log("GAME TYPE:", currentGameType);
                console.log("GAME STATUS:", data);

                if(!data.success){
                    setMessage(data.message);
                    return;
                }
                setPlayers(data.players);
                setStatus(data.status);
                if(data.status==="active"){
                    router.push(`/games/${currentGameType}?gameId=${gameId}`)
                } else if (data.status==="finished"){
                    setMessage("This game has already ended.");                   
                } else{
                    setMessage("Waiting for another player...");
                }
            } catch{
                setMessage("Couldn't connect to the server.");
            }
        }
        checkStatus();
        const interval=setInterval(checkStatus, 1000);
        return()=>clearInterval(interval);
    }, [gameId, router]);

    return(
        <main style={{
            minHeight: "100vh",
            background: 
                gameType === "wordhunt"
                    ? "#dcefd5" 
                    : gameType === "wordbites"
                    ? "#d9edfa"
                    : "#d8c9f2",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#302044",
            padding: "20px",
        }}>
            <div style={{
                background:"#fffdf5",
                padding: "40px",
                borderRadius: "20px",
                width: "100%",
                maxWidth: "420px",
                textAlign: "center",
                boxShadow: "0 8px 25px rgba(48,32,68,0.2)",
            }}>
                <h1>GAMEPIGEON</h1>
                <h2>
                    {gameType === "wordhunt" 
                        ? "WORD HUNT" 
                        : gameType === "wordbites"
                        ? "WORD BITES"
                        : "ANAGRAMS"}
                </h2>
                <p>share this code with a friend:</p>
                <h1 style={{
                    fontSize: "42px",
                    letterSpacing: "8px",
                    color: "#4b2f70",
                }}>
                    {gameId.toUpperCase()}
                </h1>

                <p>{players.length}/2 players joined</p>

                <p>{message}</p>

                {status === "waiting" && (
                    <p>Once your opponent joins, the game will begin!</p>
                )}
            </div>
        </main>
    );
}