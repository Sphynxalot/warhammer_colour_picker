const express = require('express');
const { Pool } = require('pg'); // PostgreSQL client
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// PostgreSQL pool setup
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Warhammer',
    password: 'postgres',
    port: 5432,
});

// API to fetch bloodbowl teams along with image URLs
app.get('/api/bloodbowl', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, image_url FROM bloodbowl');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch bloodbowl team from the database' });
    }
});

// API to get random paints based on a theme
app.get('/api/random-paints/:theme', async (req, res) => {
    let themeName = req.params.theme.toLowerCase() || 'general';
    
    console.log('Selected Theme:', themeName);
    try{
        // Fetch theme ID based on theme name
        let themeResult = await pool.query('SELECT id FROM themes WHERE LOWER(name) = $1', [themeName]);
        
        // If theme not found then fallback to General
        if (themeResult.rows.length === 0) {
            console.log(`Theme "${themeName}" not found, falling back to "general".`);
            themeName = 'General';
            themeResult = await pool.query('SELECT id FROM themes WHERE LOWER(name) = $1', ['general']);
        }

        const themeId = themeResult.rows[0].id;

        // Get paints linked to the theme
        const result = await pool.query(`
            SELECT p.colour, p.image_url
            FROM paints p
            JOIN paint_themes pt ON p.id = pt.paint_id
            WHERE pt.theme_id = $1
        `, [themeId]);

        console.log('Paints linked to theme:', result.rows)

        // If paints match the theme
        if (result.rows.length > 0) {
            //Randomly pick 3 paints from results
            const randomPaints = result.rows.sort(() => 0.5 - Math.random()).slice(0,3);
            return res.json(randomPaints);
        }
        
        // If no paints match the theme, use General theme
            const fallback = await pool.query(`
                SELECT p.colour, p.image_url
                FROM paints p
                JOIN paint_themes pt ON p.id = pt.paint_id
                WHERE pt.theme_id = (SELECT id FROM themes WHERE LOWER(name) = $1)
            `, ['general']);

            console.log('Fallback paints:', fallback.rows); 
            return res.json(fallback.rows.sort(() => 0.5 - Math.random()).slice(0,3));

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch paints from the database '});
        }
});

// Start the Express server on port 3000
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
