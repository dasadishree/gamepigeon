from english_words import get_english_words_set
DICTIONARY = get_english_words_set(['web2'], lower=True)

# for anagrams
def is_valid_word(word, letters):
    word=word.lower()
    if word not in DICTIONARY:
        return False
    available_letters = letters.copy()
    for letter in word:
        if letter in available_letters:
            available_letters.remove(letter)
        else:
            return False
        
    return True

# all games
def calculate_score(word):
    length = len(word)

    if length==6:
        return 2000
    elif length==5:
        return 1200
    elif length==4:
        return 400
    elif length==3:
        return 100
    else:
        return 0
    
# for word hunt
def can_form_word(board, word):
    word=word.lower()
    if word not in DICTIONARY:
        return False
    rows=len(board)
    cols=len(board[0])
    def search(row, col, index, visited):
        if board[row][col].lower() != word[index]:
            return False
        if index==len(word)-1:
            return True
        visited.add((row,col))
        for dr in [-1,0,1]:
            for dc in [-1,0,1]:
                if dr==0 and dc==0:
                    continue
                new_row = row+dr
                new_col = col+dc
                if(
                    0 <= new_row < rows
                    and 0 <= new_col < cols
                    and (new_row, new_col) not in visited
                ):
                    if search(new_row, new_col, index+1, visited):
                        return True
        visited.remove((row,col))
        return False
    
    for row in range(rows):
        for col in range(cols):
            if search(row, col, 0, set()):
                return True
    
    return False