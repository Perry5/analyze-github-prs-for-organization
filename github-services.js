const config = require('./config');
const utilService = require('./utils');

// Constants to build endPoint since we are not passing it through the request
const gitHubBaseURL = config.gitHub.baseURL;
const pageLimit = config.gitHub.perPageLimit;


/** GitHubService class in order to move business logic away from the API Routes (separation of concerns)**/
class GitHubService {

    /**
     * Constructor method for creating and initializing an organization
     * @param organization
     */
    constructor(organization) {
        this.organization = organization;
    }

    /**
     * Query github's API for all the PR's for a particular repo
     * Set the CLIENT_ID & CLIENT_SECRET env vars to increase the number of requests allowed per hour

     * @param {string} repository - The repository for which to query
     * @returns {array} prs - The list of Pull Requests for the specified repository
     */
    async getPullRequests(repository) {
        console.log(`Getting all PRs for ${repository}...`);
        let prs = [];
        const endPoint = `${gitHubBaseURL}repos/${this.organization}/${repository}/pulls?state=all&per_page=${pageLimit}`;
        console.log(`Querying First page: ${endPoint}\n`);
        try {
            prs = await this.getPullRequestsUtil(endPoint, prs)
        } catch (e) {
            console.log(e);
        }
        console.log(`Done Querying. Returning ... total PRs for ${repository}: ${prs.length}\n`);
        return prs;
    }

    /**
     * Recursive Utility function to query github's API for all PR's for a particular organization. Since the response
     * is paginated, we recursively fetch the response for all the pages before returning.
     * Set the CLIENT_ID & CLIENT_SECRET env vars to increase the number of requests allowed per hour
     *
     * @param {string} endPoint - Endpoint to query for prs
     * @param {array} prs - Persisted/aggregated list of prs for each page of a response
     * @returns {array} - Aggregated list of PR's from all pages of the github response
     */
    async getPullRequestsUtil(endPoint, prs) {
        const { response, resJson } = await utilService.makeFetchRequest(endPoint, 'GET');

        if (Array.isArray(resJson)) {
            resJson.forEach((pr) => {
                prs.push(pr);
            });

            let linkHeader = response.headers.get('link');
            if (linkHeader) {
                if (utilService.extractUrlFromLinkHeader(linkHeader).hasOwnProperty('next')) {
                    const nextPage = utilService.extractUrlFromLinkHeader(linkHeader).next;
                    console.log(`Querying next page: ${nextPage}\n`);
                    return this.getPullRequestsUtil(nextPage, prs);
                }
            }
        }
        return prs;
    }

    /**
     * Get the list of all repository names for a given organization
     * @returns {array} repos - List of all repositories for an organization
     */
    async getAllRepos() {
        console.log(`Building endpoint to retrieve repos...\n`);
        const endPoint = `${gitHubBaseURL}orgs/${this.organization}/repos?per_page=${pageLimit}`;
        const { resJson } = await utilService.makeFetchRequest(endPoint, 'GET');
        const repos = [];

        if (Array.isArray(resJson)) {
            resJson.forEach((repo) => {
                console.log(`Appending ${repo.name} to the list of repos...\n`);
                repos.push(repo.name);
            })
        }
        console.log(`Returning list of repos...total is: ${repos.length}\n`);
        return repos;
    }
}

module.exports = GitHubService;