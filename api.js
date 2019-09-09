const GitHubService  = require('./github-services');
const config = require('./config');

let ALL_PULL_REQUESTS = [];

/**
 * API Function that receives an incoming request and returns a response with the total number of PR's.
 * We don't return the list containing the actual PR.
 * @param {request} req - Incoming request
 * @param {response} res - Server response
 * @returns {object} res.json - Json object returned with requested values
 */
async function getPrs(req, res) {
    const organization = config.gitHub.organization;
    const gitHubService = new GitHubService(organization);
    const repos = await gitHubService.getAllRepos();

    //get all prs for each repo
    for (const repo of repos) {
        const prs = await gitHubService.getPullRequests(repo);
        ALL_PULL_REQUESTS.push.apply(ALL_PULL_REQUESTS, prs);
    }

    return res.json({
        pull_request_total: ALL_PULL_REQUESTS.length,
        pull_requests: [] // ALL_PULL_REQUESTS uncomment to return all prs
    })
}

module.exports = { getPrs };