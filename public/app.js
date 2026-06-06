const itemsContainer = document.getElementById('items');
const messageEl = document.getElementById('message');

function showMessage(text) {
  messageEl.textContent = text;
  setTimeout(() => { messageEl.textContent = ''; }, 2500);
}

function renderItems(items) {
  itemsContainer.innerHTML = '';
  const totalVotes = items.reduce((sum, item) => sum + item.votes, 0);
  document.getElementById('total-votes').textContent = totalVotes;

  items.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'item';

    const label = document.createElement('div');
    label.innerHTML = `<span class="item-name">${item.name}</span> <span class="votes">(${item.votes} votes)</span>`;

    const button = document.createElement('button');
    button.textContent = 'Vote';
    button.addEventListener('click', () => castVote(item.id));

    itemEl.appendChild(label);
    itemEl.appendChild(button);
    itemsContainer.appendChild(itemEl);
  });
}

async function loadItems() {
  try {
    const response = await fetch('/api/items');
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to load items (${response.status}): ${text}`);
    }

    let items;
    try {
      items = await response.json();
    } catch (parseError) {
      const text = await response.text();
      throw new Error(`Invalid JSON response from server: ${text}`);
    }

    renderItems(items);
  } catch (error) {
    console.error(error);
    showMessage('Unable to load coffee items.');
  }
}

async function castVote(id) {
  try {
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Vote failed');
    }

    const updated = await response.json();
    showMessage(`You voted for ${updated.name}!`);
    loadItems();
  } catch (error) {
    console.error(error);
    showMessage(error.message || 'Vote failed.');
  }
}

async function addItem() {
  const input = document.getElementById('new-item-name');
  const name = input.value.trim();
  if (!name) {
    showMessage('Please enter a coffee name.');
    return;
  }

  try {
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add item.');
    }

    const newItem = await response.json();
    input.value = '';
    showMessage(`Added ${newItem.name}.`);
    loadItems();
  } catch (error) {
    console.error(error);
    showMessage(error.message || 'Failed to add item.');
  }
}

async function resetVotes() {
  try {
    const response = await fetch('/api/reset', { method: 'POST' });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Reset failed.');
    }

    showMessage('All votes have been reset.');
    loadItems();
  } catch (error) {
    console.error(error);
    showMessage(error.message || 'Reset failed.');
  }
}

document.getElementById('add-item-button').addEventListener('click', addItem);
document.getElementById('reset-button').addEventListener('click', resetVotes);

loadItems();
