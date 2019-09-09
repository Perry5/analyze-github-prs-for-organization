const dotenv = require('dotenv');

/**
 * Load environment variables from .env file, parse the contents, assign it to process.env.
 */
dotenv.config();

const config = {
    port: process.env.PORT || 8080,
    gitHub: {
        baseURL: process.env.GITHUB_BASE_URL || 'https://api.github.com/',
        organization: process.env.ORGANIZATION || 'ramda',
        perPageLimit: process.env.PER_PAGE_LIMIT || '',
        clientID: process.env.CLIENT_ID || '',
        clientSecret: process.env.CLIENT_SECRET || '',
    }
};

module.exports = config;