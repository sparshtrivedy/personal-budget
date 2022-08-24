const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const envelopes = require('./envelopes');
const Pool = require('pg').Pool
const {newId} = require('./helper');

app.use(bodyParser.json());

const PORT = process.env.PORT || 4001;

const pool = new Pool({
  user: 'me',
  host: 'localhost',
  database: 'newapi',
  password: 'password',
  port: 5432,
})

// GET all envelopes
const getUsers = (request, response) => {
    pool.query('SELECT * FROM envelopes ORDER BY id ASC', (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}

// GET all transfers
const getTransfers = (request, response) => {
    pool.query('SELECT * FROM transfers ORDER BY id ASC', (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}

// GET the envelope with the given id
const getUserById = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('SELECT * FROM envelopes WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}

// POST add specified envelope to the envelopes array
const createUser = (request, response) => {
    const id = newId(envelopes);
    const {title, budget} = request.body;
    pool.query('INSERT INTO envelopes (id, title, budget) VALUES ($1, $2, $3) RETURNING *', [id, title, budget], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(201).send(`User added with ID: ${results.rows[0].id}`);
    });
}

const createTransfer = (request, response) => {
    const {date, amount, recipient, transferer} = request.body;
    pool.query('UPDATE envelopes SET budget = budget - $1 WHERE title = $2', [amount, transferer]);
    pool.query('UPDATE envelopes SET budget = budget + $1 WHERE title = $2', [amount, recipient]);
    pool.query('INSERT INTO transfers (date, amount, recipient, transferer) VALUES ($1, $2, $3, $4) RETURNING *', [date, amount, recipient, transferer], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(201).send(`User added with ID: ${results.rows[0].id}`);
    });
}

// PUT update the envelope with the specified id
const updateUser = (request, response) => {
    const id = parseInt(request.params.id);
    const {title, budget} = request.body;
    pool.query('UPDATE envelopes SET title = $1, budget = $2 WHERE id = $3', [title, budget, id], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).send(`User modified with ID: ${id}`)
    });
}

// DELETE the envelope with the specified id
const deleteUser = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('DELETE FROM envelopes WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).send(`User deleted with ID: ${id}`);
    });
}

// DELETE the transfer with the specified id
const deleteTransfer = async (request, response) => {
    const id = parseInt(request.params.id);
    const transactionAmount = await pool.query('SELECT amount FROM transfers WHERE id = $1', [id]);
    pool.query('UPDATE envelopes SET budget = budget + $1 WHERE title IN (SELECT transferer FROM transfers WHERE id = $2)', [transactionAmount.rows[0].amount, id]);
    pool.query('UPDATE envelopes SET budget = budget - $1 WHERE title IN (SELECT recipient FROM transfers WHERE id = $2)', [transactionAmount.rows[0].amount, id]);
    pool.query('DELETE FROM transfers WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).send(`User deleted with ID: ${id}`);
    });
}

app.get('/envelopes', getUsers);
app.get('/envelopes/:id', getUserById);
app.post('/createEnvelope', createUser);
app.put('/updateEnvelope/:id', updateUser);
app.delete('/deleteEnvelope/:id', deleteUser);
app.get('/transfers', getTransfers);
app.post('/createTransfer', createTransfer);
app.delete('/deleteTransfer/:id', deleteTransfer);

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});