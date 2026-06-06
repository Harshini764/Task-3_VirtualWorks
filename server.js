const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const dbPath = path.resolve(__dirname, 'coffee.db');
const db = new sqlite3.Database(dbPath);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function initDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS coffees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        votes INTEGER NOT NULL DEFAULT 0
      )
    `);

    const items = [
      { name: 'Espresso' },
      { name: 'Americano' },
      { name: 'Latte' },
      { name: 'Cappuccino' }
    ];

    db.all('SELECT COUNT(*) AS count FROM coffees', (err, rows) => {
      if (err) {
        console.error('Failed to count coffee rows:', err);
        return;
      }
      const count = rows[0].count;
      if (count === 0) {
        const stmt = db.prepare('INSERT INTO coffees (name, votes) VALUES (?, 0)');
        items.forEach(item => stmt.run(item.name));
        stmt.finalize(() => {
          console.log('Inserted initial coffee items.');
        });
      }
    });
  });
}

app.get('/api/items', (req, res) => {
  db.all('SELECT id, name, votes FROM coffees ORDER BY id', (err, rows) => {
    if (err) {
      console.error('Error fetching items:', err);
      return res.status(500).json({ error: 'Failed to load items.' });
    }
    res.json(rows);
  });
});

app.post('/api/vote', (req, res) => {
  const { id } = req.body;
  if (typeof id !== 'number') {
    return res.status(400).json({ error: 'Invalid item id.' });
  }

  db.run('UPDATE coffees SET votes = votes + 1 WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error updating vote count:', err);
      return res.status(500).json({ error: 'Failed to update vote.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    db.get('SELECT id, name, votes FROM coffees WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error reading updated item:', err);
        return res.status(500).json({ error: 'Failed to fetch updated item.' });
      }
      res.json(row);
    });
  });
});

app.post('/api/items', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Item name is required.' });
  }

  const trimmedName = name.trim();
  db.run('INSERT INTO coffees (name, votes) VALUES (?, 0)', [trimmedName], function (err) {
    if (err) {
      console.error('Error creating item:', err);
      return res.status(500).json({ error: 'Failed to add item.' });
    }

    db.get('SELECT id, name, votes FROM coffees WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        console.error('Error reading created item:', err);
        return res.status(500).json({ error: 'Failed to fetch new item.' });
      }
      res.status(201).json(row);
    });
  });
});

app.post('/api/reset', (req, res) => {
  db.run('UPDATE coffees SET votes = 0', err => {
    if (err) {
      console.error('Error resetting votes:', err);
      return res.status(500).json({ error: 'Failed to reset votes.' });
    }

    res.json({ message: 'All votes have been reset.' });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  initDatabase();
  console.log(`Coffee rating app listening on http://localhost:${port}`);
});
