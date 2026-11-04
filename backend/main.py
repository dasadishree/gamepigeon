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
    allow_origins=["http://localhost:3000"],
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

class JoinGame(BaseModel):
    game_id: str
    player_id: str

class MoveTile(BaseModel):
    game_id: str
    player_id: str
    tile_id: str
    row: int
    col: int

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
    cols=8
    board={
        "rows": rows,
        "cols": cols,
        "tiles": []
    }
    for i in range(6):
        board["tiles"].append({
            "id": f"single_{i}",
            "letters": random.choice("etaoinshrdlucmfwypvbgk"),
            "orientation": "single",
            "row": None,
            "col": None
        })
    double_combinations = [
        "th", "er", "in", "an", "re",
        "on", "at", "en", "nd", "ou"
    ]
    for i in range(5):
        board["tiles"].append({
            "id": f"double_{i}",
            "letters": random.choice(double_combinations),
            "orientation": random.choice(["horizontal", "vertical"]),
            "row": None,
            "col": None
        })
    return board

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
            "tiles": [
                {**tile}
                for tile in game["board"]["tiles"]
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
    return{
        "success": True,
        "status": status,
        "players": list(game["players"].keys()),
        "board": game["players"][player_id]["board"],
        "time_limit": game["time_limit"],
        "started_at": (
            game["started_at"].isoformat()
            if game["started_at"] else None
        )
    }

# check whehter word exisits in straight line on the board
def can_form_wordbites_word(board, word):
    grid={}
    double_tile_cells={}
    for tile in board["tiles"]:
        if tile["row"] is None:
            continue
        row = tile["row"]
        col = tile["col"]
        if tile["orientation"] == "horizontal":
            cells=[
                (row, col),
                (row, col+1)
            ]
        elif tile["orientation"] =="vertical":
            cells=[
                (row, col),
                (row+1, col)
            ]
        else:
            cells=[(row,col)]
        for index, cell in enumerate(cells):
            grid[cell]={
                "letter": tile["letters"][index],
                "tile_id": tile["id"]
            }
        if tile["orientation"]!="single":
            double_tile_cells[tile["id"]]=set(cells)
    directions=[
        (0,1),
        (1,0)
    ]
    for row in range(board["rows"]):
        for col in range(board["cols"]):
            for dr, dc in directions:
                positions=[
                    (row+dr*i, col+dc*i)
                    for i in range(len(word))
                ]
                if not all(position in grid for position in positions):
                    continue
                formed_word = "".join(
                    grid[position]["letter"]
                    for position in positions
                )
                if formed_word != word:
                    continue
                used_tiles={
                    grid[position]["tile_id"]
                    for position in positions
                }
                valid_tiles =True
                for tile_id in used_tiles:
                    if tile_id in double_tile_cells:
                        if not double_tile_cells[tile_id].issubset(
                            set(positions)
                        ):
                            valid_tiles=False
                            break
                if valid_tiles:
                    return True
    return False

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
    if not can_form_wordbites_word(player["board"], word):
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

# move word bites tile
@app.post("/game/wordbites/move")
def move_wordbites_tile(move: MoveTile):
    if move.game_id not in wordbites_games:
        return{
            "success": False,
            "message": "Game not found"
        }
    game = wordbites_games[move.game_id]
    if move.player_id not in game["players"]:
        return{
            "success": False,
            "message": "You haven't joined this game."
        }
    if game["started_at"] is None:
        return{
            "success": False,
            "message": "The game hasn't started yet."
        }

    if datetime.now() >= game["started_at"] + timedelta(
        seconds=game["time_limit"]
    ):
        return{
            "success": False,
            "message": "Time's up!"
        }
    board=game["players"][move.player_id]["board"]

    tile=next(
        (
            tile for tile in board["tiles"]
            if tile["id"] == move.tile_id
        ),
        None
    )

    if tile is None:
        return{
            "success": False,
            "message": "tile not found."
        }
    if tile["orientation"] =="horizontal":
        new_cells=[
            (move.row, move.col),
            (move.row, move.col+1)
        ]
    elif tile["orientation"]=="vertical":
        new_cells=[
            (move.row, move.col),
            (move.row+1, move.col)
        ]
    else:
        new_cells=[(move.row, move.col)]

    for row, col in new_cells:
        if not(
            0<=row<board["rows"]
            and 0 <= col<board["cols"]
        ):
            return{
                "success": False,
                "message": "Tile is outside the board."
            }
        
    for other_tile in board["tiles"]:
        if other_tile["id"]==tile["id"]:
            continue
        if other_tile["row"] is None:
            continue
        if other_tile["orientation"] =="horizontal":
            other_cells=[
                (other_tile["row"], other_tile["col"]),
                (other_tile["row"], other_tile["col"]+1)
            ]
        elif other_tile["orientation"]=="vertical":
            other_cells=[
                (other_tile["row"], other_tile["col"]),
                (other_tile["row"]+1, other_tile["col"])
            ]
        else: 
            other_cells=[
                (other_tile["row"], other_tile["col"])
            ]

        if any(cell in other_cells for cell in new_cells):
            return{
                "success": False,
                "message": "Those spaces are already occupied."
            }
    tile["row"] = move.row
    tile["col"] = move.col
    return {
        "success": True,
        "message": "Tile moved!",
        "board": board
    }