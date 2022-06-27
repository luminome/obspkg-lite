#!/usr/bin/env python3
import os
import random
import sqlite3
from sqlite3 import Error

config = {
    'db-location' : 'sample.db',
    'word-paths': ["tools/words.txt","tools/words-two.txt"],
    'num-pairs': 64
}


def getWords(base_path):
    WORDS = [[],[]]
    for n, words_path in enumerate(config['word-paths']):
        path = os.path.join(base_path, words_path)
        with open(path,'r') as handle:
            for line in handle:
                WORDS[n].append(line.rstrip())
        random.shuffle(WORDS[n])
    return WORDS


def reset_db(conn, words):
    sql_create_table = """
        CREATE TABLE IF NOT EXISTS datum (
           id INTEGER PRIMARY KEY,
           time TEXT DEFAULT CURRENT_TIMESTAMP,
           key TEXT,
           value TEXT
        );"""

    sql_flat_wipe = """
        DELETE from datum;
    """
    
    sql_populate = """
        INSERT INTO datum(key, value) VALUES(?,?)
    """
    
    c = conn.cursor()
    c.execute(sql_create_table)
    c.execute(sql_flat_wipe)
    conn.commit()
    
    for n in range(config['num-pairs']):
        pair = [words[1][n], words[0][n]]
        c.execute(sql_populate, pair)
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    w_path = os.getcwd()
    words = getWords(w_path)
    conn = sqlite3.connect(config['db-location'])
    reset_db(conn, words)