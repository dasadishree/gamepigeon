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
        "started_at": datetime.now(),
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

@app.post("/game/anagrams/check")
def check_word(submission: WordSubmission):
    if submission.game_id not in games:
        return{
            "valid": False,
            "message": "Game not found.",
            "points": 0
        }

    game = games[submission.game_id]
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
        game["players"][player_id]={
            "words": [],
            "score": 0
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