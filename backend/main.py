from fastapi import FastAPI
from pydantic import BaseModel
from game import is_valid_word, calculate_score
import random
import uuid
from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# justputting placeholder list of 6 letter words for nwo - later maybe will pull forom a dictionary or smth?
WORDS=[
    "planet",
    "friend",
    "school",
    "orange",
    "stream",
    "button",
    "rocket",
    "forest",
    "little",
    "garden",
    "animal",
    "summer",
    "winter",
    "purple",
    "banana",
    "python",
    "coding",
    "coffee",
    "flower",
    "pencil",
]

games={}

@app.get("/")
def home():
    return {"message": "Slack Games backend is running!"}

@app.get("/game/anagrams/new")
def new_anagram_game():
    word = random.choice(WORDS)
    letters=  list(word)
    random.shuffle(letters)
    game_id=str(uuid.uuid4())[:6]
    games[game_id]={
        "answer": word,
        "letters": letters,
        "time_limit": 60,
        "started_at": None,
        "players": {}
    }
    return {
        "game_id": game_id,
        "letters": letters,
        "time_limit": 60
    }

class WordSubmission(BaseModel):
    game_id: str
    player_id: str
    word: str

class JoinGame(BaseModel):
    game_id: str
    player_id: str

# join anagrams game
@app.post("/game/anagrams/join")
def join_game(join: JoinGame):
    if join.game_id not in games:
        return{
            "success": False,
            "message": "Game not found."
        }
    game = games[join.game_id]
    if join.player_id in game["players"]:
        return{
            "success": True,
            "message": "You are already in this game.",
            "players": list(game["players"].keys()),
            "letters": game["letters"],
            "time_limit": game["time_limit"]
        }
    if len(game["players"]) >=2:
        return{
            "success": False,
            "message": "This game is already full."
        }

    game["players"][join.player_id]={
        "words": [],
        "score": 0
    }
    if len(game["players"])==2:
        game["started_at"]=datetime.now()
    return{
        "success": True,
        "message": "Joined game!",
        "players": list(game["players"].keys()),
        "letters": game["letters"],
        "time_limit": game["time_limit"],
        "started_at": game["started_at"]
    }

# gamestatus endpoint
@app.get("/game/anagrams/{game_id}/status")
def get_game_status(game_id: str):
    if game_id not in games:
        return{
            "success": False,
            "message": "Game not found."
        }
    game=games[game_id]
    if game["started_at"] is None:
        status="waiting"
    elif datetime.now()>=game["started_at"]+timedelta(
        seconds=game["time_limit"]
    ):
        status="finished"
    else:
        status="active"  

    return{
        "success": True,
        "status": status,
        "players": list(game["players"].keys()),
        "letters": game["letters"],
        "time_limit": game["time_limit"],
        "started_at": (
            game["started_at"].isoformat()
            if game["started_at"] else None
        )
    }
# check word and score
@app.post("/game/anagrams/check")
def check_word(submission: WordSubmission):
    if submission.game_id not in games:
        return{
            "valid": False,
            "message": "Game not found.",
            "points": 0
        }

    game = games[submission.game_id]
    if game["started_at"] is None:
        return{
            "valid": False,
            "message": "The game has not started yet.",
            "points": 0
        }
    elapsed = datetime.now() - game["started_at"]
    if elapsed> timedelta(seconds=game["time_limit"]):
        return{
            "valid":False,
            "message": "time's up!!",
            "points": 0
        }

    word = submission.word.strip().lower()
    player_id = submission.player_id

    if player_id not in game["players"]:
        return{
            "valid": False,
            "message": "You haven't joined this game.",
            "points": 0
        }

    player = game["players"][player_id]

    # no repeats
    if word in player["words"]:
        return{
            "valid": False,
            "message": "You already submitted that word!",
            "points": 0
        }
    if not is_valid_word(word, game["letters"]):
        return{
            "valid": False,
            "message": "That's not a valid word!",
            "points": 0
        }
    points = calculate_score(word)
    player["words"].append(word)
    player["score"]+=points
    return{
        "valid": True,
        "word": word,
        "points": points,
        "total_score": player["score"]
    }