// i think this shd be temporary until i make ts into a slakc extension
"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

export default function LobbyPage() {
    const [gameId, setGameId] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [playerId, setPlayerId] = useState("");
    const [message, setMessage] = useState("");

    const router = useRouter();

    async function createGame() {
        if(!playerId.trim()){
            setMessage("Enter your name first.");
            return;
        }

        const response = await fetch(`${API_URL}/game/anagrams/new`);
        const data = await response.json();

        setGameId(data.game_id);

        const joinResponse = await fetch(`${API_URL}/game/anagrams/join`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                game_id: data.game_id,
                player_id: playerId,
            }),
        });

        const joinData = await joinResponse.json();

        if(joinData.success) {
            setMessage(`Game created! Code: ${data.game_id}`);
        }
    }

    async function joinGame() {
        if(!playerId.trim() || !joinCode.trim()) {
            setMessage("Enter your name and game code.");
            return;
        }

        const response = await fetch(
            `${API_URL}/game/anagrams/join`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    game_id: joinCode.trim(),
                    player_id: playerId,
                }),
            }
        );

        const data = await response.json();
    }
}