"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

export default function LobbyPage() {
    const [joinCode, setJoinCode] = useState("");
    const [selectedGame, setSelectedGame] = useState<"anagrams" | "wordhunt">("anagrams");
    const [playerId, setPlayerId] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    async function createGame() {
        if(!playerId.trim()){
            setMessage("Enter your name first.");
            return;
        }
        setLoading(true);

        try{
            const response = await fetch(`${API_URL}/game/${selectedGame}/new`);
            const data = await response.json();

            const joinResponse = await fetch(
                `${API_URL}/game/${selectedGame}/join`, 
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        game_id: data.game_id,
                        player_id: playerId,
                    }),
                }
            );

            const joinData = await joinResponse.json();
            if(!joinData.success) {
                setMessage(joinData.message || "couldnt join the game");
                return;
            }

            if(joinData.success) {
                setMessage(`Game created! Code: ${data.game_id}`);
            }

            sessionStorage.setItem("gameId", data.game_id);
            sessionStorage.setItem("gameType", selectedGame);
            sessionStorage.setItem("playerId", playerId.trim());
            router.push(`/lobby/${data.game_id}`);
        } catch { 
            setMessage("couldnt connect to server try again");
        } finally {
            setLoading(false);
        }
    }

    async function joinGame() {
        if(!playerId.trim() || !joinCode.trim()) {
            setMessage("Enter your name and game code.");
            return;
        }

        setLoading(true);
        try{
            const response = await fetch(
                `${API_URL}/game/${selectedGame}/join`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        game_id: joinCode.trim(),
                        player_id: playerId.trim()
                    }),
                }
            );
        
            const data = await response.json();

            if(!data.success){
                setMessage(data.message);
                return;
            }

            sessionStorage.setItem("gameId", joinCode.trim());
            sessionStorage.setItem("playerId", playerId.trim());
            sessionStorage.setItem("gameType", selectedGame);
            router.push(`/lobby/${joinCode.trim()}`);
        } catch {
            setMessage("Couldn't connect to the server. Try again.");
        } finally {
            setLoading(false);
        }
    }

    return(
        <main style={{
            minHeight: "100vh",
            background: selectedGame === "wordhunt" ? "dcefd5" : "#d8c9f2",
            display: "flex",
            justifyContent:"center",
            alignItems:"center",
            fontFamily:"Arial, Helvetica, sans-serif",
            color: selectedGame === "wordhunt" ? "#285c38" : "#3302044",
            padding: "20px"
        }}>
            <div style={{
                background:"#fffdf5",
                padding: "40px",
                borderRadius: "20px",
                width: "100%",
                maxWidth: "380px",
                textAlign:"center",
                boxShadow: "0 8px 25px rgba(48,32,68,0.2)",
            }}>
                <h1>GAMEPIGEON</h1>
                <h2>CHOOSE YOUR GAME</h2>
                {/* game selector */}
                <div style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "25px",
                }}>
                    <button
                        onClick={()=>setSelectedGame("anagrams")}
                        style={{
                            flex: 1,
                            padding: "18px 8px",
                            background: selectedGame==="anagrams" ? "#4b2f70" : "#eee6f7",
                            color: selectedGame === "anagrams" ? "white" : "#4b2f70",
                            border: "2px solid #4b2f70",
                            borderRadius: "12px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        ANAGRAMS
                    </button>

                    <button
                        onClick={()=>setSelectedGame("wordhunt")}
                        style={{
                            flex: 1,
                            padding: "18px 8px",
                            background: selectedGame === "wordhunt" ? "#285c38" : "#e4efdf",
                            color: selectedGame === "wordhunt" ? "white" : "#285c38",
                            border: "2px solid #285c38",
                            borderRadius: "12px",
                            cursor: "pointer",
                            fontWeight: "bold",
                        }}
                    >
                        WORD HUNT
                    </button>
                </div>

                <input
                    placeholder="Your name"
                    value={playerId}
                    onChange={(event)=>setPlayerId(event.target.value)}
                    style={{
                        width: "100%",
                        padding: "13px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        boxSizing: "border-box",
                        marginBottom: "20px",
                    }}
                />
                <button
                    onClick={createGame}
                    disabled={loading}
                    style={{
                        width:"100%",
                        padding: "14px",
                        background: "#4b2f70",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                    }}
                >
                    CREATE {selectedGame === "anagrams" ? "ANAGRAMS" : "WORD HUNT"} GAME
                </button>

                <p>OR</p>
                <input
                    placeholder="Enter game code"
                    value={joinCode}
                    onChange={(event)=>setJoinCode(event.target.value)}
                    style={{
                        width: "100%",
                        padding: "13px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        boxSizing: "border-box",
                        marginBottom: "12px",
                    }}
                />
                <button
                    onClick={joinGame}
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "14px",
                        background: "#bf8b5a",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                    }}
                >
                    JOIN GAME
                </button>
                {message && (
                    <p style={{marginTop: "20px"}}>{message}</p>
                )}
                {loading && <p>Loading...</p>}
            </div>
        </main>
    );
}