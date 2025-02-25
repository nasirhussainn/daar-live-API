require('dotenv').config();
const express = require('express');
const axios = require('axios');

const router = express.Router();

// Google Places API endpoint
const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

// Define the API route
router.post('/', async (req, res) => {
    try {
        const { query } = req.body;  // Extract query from the request body
        if (!query) {
            return res.status(400).json({ message: "Query parameter is required" });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;  // Load API key from environment variables

        // Make the request to Google Places API
        const response = await axios.get(GOOGLE_PLACES_API_URL, {
            params: {
                query,
                key: apiKey
            }
        });

        // Send the API response back to the client
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching places data', error: error.message });
    }
});

module.exports = router;
