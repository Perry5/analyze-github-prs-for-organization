const GitHubService  = require('./github-services');
const config = require('./config');
const utils = require('./utils');

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

    // get all mergedPrs
    const mergedPrs = gitHubService.getAllMergedPrs(ALL_PULL_REQUESTS);

    // get week over week merges
    const wowMerges = gitHubService.getWeekOverWeekMerges(mergedPrs);

    return res.json({
        pull_request_total: ALL_PULL_REQUESTS.length,
        week_over_week_merges: wowMerges,
        pull_requests: ALL_PULL_REQUESTS.slice(0, 100) // display only first 100 of all the PRs
    })
}

module.exports = { getPrs };