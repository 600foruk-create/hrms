import sqlite3
import json

conn = sqlite3.connect('backend/hrms_db.sqlite')
c = conn.cursor()
c.execute('SELECT data FROM users')
for row in c.fetchall():
    user = json.loads(row[0])
    lb = user.get('leaveBalances')
    if lb:
        print(user['name'], lb)
