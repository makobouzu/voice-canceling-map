const { Router } = require('express');
const router = Router();
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.connect();

// ('video_path', '(lan, lat)')
router.get('/', async (req, res) => {
    const responce_from_db = await pool.query('SELECT * FROM human_canceling_table')
    console.log(responce_from_db.rows);
    res.send(responce_from_db.rows);
});

router.post('/', async (req, res) => {
    const m = [req.body.video_path, req.body.location];
    const reponce_from_db = await pool.query('INSERT INTO human_canceling_table VALUES($1, $2)', m);
    res.send("database post!");
});

module.exports = router;