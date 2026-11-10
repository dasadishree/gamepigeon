from fastapi import FastAPI
from pydantic import BaseModel
from game import is_valid_word, calculate_score, can_form_word, DICTIONARY
import random
import uuid
from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://gamepigeon-azure.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SIX_LETTER_WORDS = [
    word for word in DICTIONARY
    if len(word) == 6 and word.isalpha()
]

games={}
wordhunt_games = {}
wordbites_games={}

@app.get("/")
def home():
    return {"message": "Slack Games backend is running!"}

@app.get("/game/anagrams/new")
def new_anagram_game():
    word = random.choice(SIX_LETTER_WORDS)
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
    positions: list[list[int]] | None = None

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
        "score": 0,
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

#getgsmeresults
@app.get("/game/anagrams/{game_id}/results")
def get_game_results(game_id: str):
    if game_id not in games:
        return{
            "success": False,
            "message": "Game not found."
        }
    game=games[game_id]

    if game["started_at"] is None:
        return{
            "success": False,
            "message": "Game hasn't started yet."
        }
    if datetime.now()<game["started_at"]+timedelta(
        seconds=game["time_limit"]
    ):
        return{
            "success": False,
            "message": "Game is still in progress."
        }
    results =[]
    for player_id, player in game["players"].items():
        player_words=[]
        for word in player["words"]:
            player_words.append({
                "word": word.upper(),
                "points": calculate_score(word)
            })
        results.append({
            "player_id": player_id,
            "score": player["score"],
            "words": player_words
        })
    return{
        "success": True,
        "players": results
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

# word hunt generate (make it more posisubke to make words from)
def generate_wordhunt_board():
    board = [[""]*4 for _ in range(4)]
    words = [
        word for word in DICTIONARY
        if 3<=len(word) <=6 and word.isalpha()
    ]

    def place_word(word):
        positions = [
            (row, col)
            for row in range(4)
            for col in range(4)
        ]
        random.shuffle(positions)
        
        def search(row, col, index, visited):
            if board[row][col] not in ("", word[index]):
                return False
            was_empty = board[row][col] == ""
            board[row][col] = word[index]
            visited.add((row, col))
            if index==len(word)-1:
                return True
            neighbors = [
                (row + dr, col+dc)
                for dr in [-1,0,1]
                for dc in [-1,0,1]
                if (dr!=0 or dc!=0)
                and 0<= row + dr<4
                and 0<=col+dc<4
                and (row+dr, col+dc) not in visited
            ]
            random.shuffle(neighbors)
            for next_row, next_col in neighbors:
                if search(
                    next_row, next_col, index+1, visited
                ):
                    return True
            visited.remove((row, col))
            if was_empty: 
                board[row][col]=""
            return False
        for row,col in positions:
            if search(row, col, 0, set()):
                return True
        return False
    selected_words = random.sample(words, min(8, len(words)))
    for word in selected_words:
        place_word(word)
    common_letters = "eeeeeeeeeeeeaaaaaaaaiiiiiiiiioooooooonnnnnnrrrrrrttttttssssssllllccccuuddddppmmhgbfyw"
    for row in range(4):
        for col in range(4):
            if board[row][col] =="":
                board[row][col] = random.choice(common_letters)
    return board

# word hunt create game enepdoint
@app.get("/game/wordhunt/new")
def new_wordhunt_game():
    board=generate_wordhunt_board()
    game_id = str(uuid.uuid4())[:6]
    wordhunt_games[game_id] = {
        "board": board,
        "time_limit": 60,
        "started_at": None,
        "players": {}
    }
    return{
        "game_id": game_id,
        "board": board,
        "time_limit": 60
    }

#join word hunt game
@app.post("/game/wordhunt/join")
def join_wordhunt_game(join: JoinGame):
    if join.game_id not in wordhunt_games:
        return{
            "success": False,
            "message": "Game not found."
        }
    game = wordhunt_games[join.game_id]
    if join.player_id in game["players"]:
        return{
            "success": True,
            "message": "You are already in this game.",
            "players": list(game["players"].keys()),
            "board": game["board"],
            "time_limit": game["time_limit"]
        }
    if len(game["players"])>=2:
        return{
            "success": False,
            "message": "This game is already full."
        }
    game["players"][join.player_id]={
        "words": [],
        "score": 0
    }
    if len(game["players"]) == 2:
        game["started_at"] = datetime.now()

    return{
        "success": True,
        "message": "Joined game!",
        "players": list(game["players"].keys()),
        "board": game["board"],
        "time_limit": game["time_limit"],
        "started_at": (
            game["started_at"].isoformat()
            if game["started_at"] else None
        )
    }

# word hunt game status
@app.get("/game/wordhunt/{game_id}/status")
def get_wordhunt_status(game_id: str):
    if game_id not in wordhunt_games:
        return{
            "success": False,
            "message": "Game not found."
        }
    game=wordhunt_games[game_id]

    if game["started_at"] is None:
        status = "waiting"
    elif datetime.now() >= game["started_at"]+timedelta(
        seconds=game["time_limit"]
    ):
        status="finished"
    else:
        status="active"

    return{
        "success": True,
        "status": status,
        "players": list(game["players"].keys()),
        "board": game["board"],
        "time_limit": game["time_limit"],
        "started_at": (
            game["started_at"].isoformat()
            if game["started_at"] else None
        )
    }

#word hunt check word and score
@app.post("/game/wordhunt/check")
def check_wordhunt_word(submission: WordSubmission):
    if submission.game_id not in wordhunt_games:
        return{
            "valid": False,
            "message": "Game not found",
            "points": 0
        }
    game=wordhunt_games[submission.game_id]
    if game["started_at"] is None:
        return{
            "valid": False,
            "message": "The game has not started yet.",
            "points": 0
        }
    if datetime.now()>=game["started_at"]+timedelta(
        seconds=game["time_limit"]
    ):
        return{
            "valid": False,
            "message": "Time's up!",
            "points": 0
        }
    word = submission.word.strip().lower()
    player_id = submission.player_id

    if player_id not in game["players"]:
        return{
            "valid": False,
            "message": "You havent joined this game",
            "points": 0
        }
    
    player = game["players"][player_id]

    if word in player["words"]:
        return{
            "valid": False,
            "message": "You already submitted that word!",
            "points": 0
        }
    
    if len(word)<3 or not can_form_word(game["board"], word):
        return{
            "valid": False,
            "message": "That's not a valid word on this board!",
            "points": 0
        }
    
    points = calculate_score(word)
    player["words"].append(word)
    player["score"] += points

    return{
        "valid": True,
        "word": word,
        "points": points,
        "total_score": player["score"]
    }

# word hunt game results
@app.get("/game/wordhunt/{game_id}/results")
def get_wordhunt_results(game_id: str):
    if game_id not in wordhunt_games:
        return{
            "success": False,
            "message": "Game not found."
        }
    game=wordhunt_games[game_id]
    if game["started_at"] is None:
        return{
            "success": False,
            "message": "Game hasn't started yet."
        }
    if datetime.now() < game["started_at"] + timedelta(
        seconds=game["time_limit"]
    ):
        return{
            "success": False,
            "message": "Game is still in progress."
        }
    results = []
    for player_id, player in game["players"].items():
        player_words =[]
        for word in player["words"]:
            player_words.append({
                "word": word.upper(),
                "points": calculate_score(word)
            })
        
        results.append({
            "player_id": player_id,
            "score": player["score"],
            "words": player_words
        })
    
    return{
        "success": True,
        "players": results
    }

# word bites generate board
def generate_wordbites_board():
    rows=9
    cols=9
    grid = [[None for _ in range(cols)] for _ in range(rows)]
    directions = [
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1),           (0, 1),
        (1, -1), (1, 0), (1, 1)
    ]
    word_bank = [
        word for word in DICTIONARY
        if isinstance(word, str) and word.isalpha() and 3<=len(word)<=8
    ]
    random.shuffle(word_bank)
    placed_count = 0
    for word in word_bank:
        if placed_count >= 15:
            break
        placed=False
        for _ in range(100):
            dr, dc = random.choice(directions)
            start_row = random.randrange(rows)
            start_col = random.randrange(cols)
            positions = [
                (start_row+dr*i, start_col+dc*i)
                for i in range(len(word))
            ]
            if not all(
                0 <= r < rows and 0 <= c < cols
                for r, c in positions
            ):
                continue
            if not all(
                grid[r][c] is None or grid[r][c] == letter
                for(r, c), letter in zip(positions, word)):
                continue
            for(r,c), letter in zip(positions, word):
                grid[r][c] = letter
            placed=True
            placed_count+=1
            break
    letters="etaoinshrdlucmfwypvbgk"
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] is None:
                grid[r][c] = random.choice(letters)
    return{
        "rows": rows,
        "cols": cols,
        "grid": grid
    }

#create word bites game
@app.get("/game/wordbites/new")
def new_wordbites_game():
    board = generate_wordbites_board()
    game_id=str(uuid.uuid4())[:6]
    wordbites_games[game_id]={
        "board": board,
        "time_limit": 60,
        "started_at": None,
        "players": {}
    }
    return{
        "game_id": game_id,
        "board": board,
        "time_limit": 60 
    }

# join word bites game
@app.post("/game/wordbites/join")
def join_wordbites_game(join: JoinGame):
    if join.game_id not in wordbites_games:
        return{
            "success": False,
            "message": "game not found"
        }
    game=wordbites_games[join.game_id]
    if join.player_id in game["players"]:
        return{
            "success": True,
            "message": "You are already in this game.",
            "players": list(game["players"].keys()),
            "board": game["players"][join.player_id]["board"],
            "time_limit": game["time_limit"]
        }
    if len(game["players"])>=2:
        return{
            "success": False,
            "message": "This game is already full."
        }

    game["players"][join.player_id]={
        "words": [],
        "score": 0,
        "board": {
            "rows": game["board"]["rows"],
            "cols": game["board"]["cols"],
            "grid": [
                row.copy()
                for row in game["board"]["grid"]
            ]
        }
    }

    if len(game["players"])==2:
        game["started_at"]=datetime.now()

    return {
        "success": True,
        "message": "Joined game!",
        "players": list(game["players"].keys()),
        "board": game["players"][join.player_id]["board"],
        "time_limit": game["time_limit"],
        "started_at": (
            game["started_at"].isoformat()
            if game["started_at"] else None
        )
    }

# word bites game status
@app.get("/game/wordbites/{game_id}/status")
def get_wordbites_status(game_id: str, player_id: str):
    if game_id not in wordbites_games:
        return{
            "success": False,
            "message": "Game not found."
        }
    game=wordbites_games[game_id]
    if player_id not in game["players"]:
        return {
            "success": False,
            "message": "You haven't joined this game."
        }
    if game["started_at"] is None:
        status = "waiting"
    elif datetime.now() >= game["started_at"] + timedelta(
        seconds=game["time_limit"]
    ):
        status="finished"
    else:
        status="active"
    player = game["players"][player_id]
    return{
        "success": True,
        "status": status,
        "players": list(game["players"].keys()),
        "board": player["board"],
        "score": player["score"],
        "words": player["words"],
        "word_details": [
            {
                "word": found_word.upper(),
                "points": calculate_wordbites_score(found_word)
            }
            for found_word in player["words"]
        ],
        "time_limit": game["time_limit"],
        "started_at": (
            game["started_at"].isoformat()
            if game["started_at"] else None
        )
    }

# check whehter word exisits in straight line on the board
def can_form_wordbites_word(board, word, positions):
    if positions is None or len(positions) != len(word):
        return False
    grid = board["grid"]
    rows = board["rows"]
    cols = board["cols"]
    visited = set()
    formed_word = ""
    for i, position in enumerate(positions):
        if len(position) != 2:
            return False
        row, col = position
        if not(0<=row<rows and 0<=col<cols):
            return False
        if(row,col) in visited:
            return False
        if i>0:
            previous_row, previous_col = positions[i-1]
            if(
                abs(row - previous_row)>1 or abs(col-previous_col)>1 or (row==previous_row and col==previous_col)
            ):
                return False
        visited.add((row, col))
        formed_word += grid[row][col]
    return formed_word == word

# scoring word bites 
def calculate_wordbites_score(word):
    if len(word)==3:
        return 100
    elif len(word)==4:
        return 400
    elif len(word)==5:
        return 1200
    elif len(word)==6:
        return 2000
    elif len(word)>6:
        return 2000+(len(word)-6)*500
    return 0

# check and score word bites
@app.post("/game/wordbites/check")
def check_wordbites_word(submission: WordSubmission):
    if submission.game_id not in wordbites_games:
        return{
            "valid": False,
            "message": "Game not found",
            "points": 0
        }
    game=wordbites_games[submission.game_id]
    if game["started_at"] is None:
        return{
            "valid": False,
            "message": "The game has not started yet",
            "points": 0
        }
    if datetime.now()>= game["started_at"]+timedelta(
        seconds=game["time_limit"]
    ):
        return{
            "valid": False,
            "message": "Time's up!",
            "points": 0
        }
    word=submission.word.strip().lower()
    if not word.isalpha():
        return{
            "valid": False,
            "message": "Words can only contain letters.",
            "points": 0
        }

    player_id=submission.player_id
    if player_id not in game["players"]:   
        return{
            "valid": False,
            "message": "You haven't joined this game",
            "points": 0
        }
    player=game["players"][player_id]
    if len(word)<3:
        return{
            "valid": False,
            "message": "Words must contain at least 3 letters",
            "points": 0
        }
    if word in player["words"]:
        return{
            "valid": False,
            "message": "You already submitted that word!",
            "points": 0
        }
    if word not in DICTIONARY:
        return{
            "valid": False,
            "message": "That's not a valid English word!",
            "points":0
        }
    if not can_form_wordbites_word(player["board"], word, submission.positions):
        return{
            "valid": False,
            "message": "That word isn't formed on your board!",
            "points": 0
        }
    points = calculate_wordbites_score(word)
    player["words"].append(word)
    player["score"]+= points
    return{
        "valid": True,
        "word": word,
        "points": points,
        "total_score": player["score"]
    }

#word bites game results
@app.get("/game/wordbites/{game_id}/results")
def get_wordbites_results(game_id: str):
    if game_id not in wordbites_games:
        return{
            "success": False,
            "message": "Game not found"
        }
    game=wordbites_games[game_id]
    if game["started_at"] is None:
        return{
            "success": False,
            "message": "Game hasn't started yet."
        }
    if datetime.now() < game["started_at"] + timedelta(
        seconds=game["time_limit"]
    ):
        return{
            "success": False,
            "message": "Game is still in progress."
        }
    results =[]
    for player_id, player in game["players"].items():
        player_words = []
        for word in player["words"]:
            player_words.append({
                "word": word.upper(),
                "points": calculate_wordbites_score(word)
            })
        results.append({
            "player_id": player_id,
            "score": player["score"],
            "words": player_words
        })
    return{
        "success": True,
        "players": results
    }