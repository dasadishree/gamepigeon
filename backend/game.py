from english_words import get_english_words_set
DICTIONARY = get_english_words_set(['web2'], lower=True)

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