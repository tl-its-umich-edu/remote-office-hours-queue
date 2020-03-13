import unicodedata


def generate_username(email):
    return unicodedata.normalize('NFKC', email).split('@')[0]
