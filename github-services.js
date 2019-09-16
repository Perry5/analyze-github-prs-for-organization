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

    /**
     * Get the list of all merged PR's from the given list of PR's
     * @param {array} pullRequests - List of PR's from which to get merged ones
     * @returns {array} mergedPrs - List of Merged Pull requests
     */
    getAllMergedPrs(pullRequests) {
        const mergedPrs = [];
        pullRequests.forEach((pr) => {
            if (pr.state === 'closed' && pr.merged_at !== null) {
                mergedPrs.push(pr);
            }
        });
        return mergedPrs;
    }

    /**
     * Get a list of all the PR's that were merged week over week
     * @param {array} mergedPrs - array of merged PRs
     * @return {map} wowMerge - A mapping of all the week (as keys) and merged PR's (as values)
     */
    getWeekOverWeekMerges(mergedPrs) {
        const wowMerges = {};

        mergedPrs.forEach((mpr) => {
            const weekRange = utilService.generateDateKeys(mpr.merged_at);
            if (wowMerges.hasOwnProperty(weekRange)) {
                wowMerges[weekRange].push(mpr)
            } else {
                wowMerges[weekRange] = [mpr];
            }
        });
        return wowMerges;
    }

    /************************* CLASS FUNCTIONS THAT ARE CURRENTLY NOT BEING CALLED FROM THE API **********************/
    getAllPrsByDate(openDate, pullRequests) {
        const prsByDate = [];
        // using moment(string, format) allows us pass in dates in different formats
        const prOpenDate = moment.utc(openDate, ['MM-DD-YYYY", "YYYY-MM-DD']);
        pullRequests.forEach((pr) => {
            // To limit granularity to a unit other than millisecond, we can pass in a second parameter
            // Passing in month will check month and year. Passing in day will check day, month, and year
            if (moment.utc(pr.created_at).isSame(prOpenDate, 'day')) {
                prsByDate.push(pr);
            }
        });

        console.log(`Returning all (${prsByDate.length}) PR's Opened on: ${prOpenDate}`);
        return prsByDate;
    }

    getAllMergedPrsByDate(date, prs) {
        const mergedPrsByDate = [];
        const prMergeDate = moment.utc(date, ['MM-DD-YYYY", "YYYY-MM-DD']);

        prs.forEach((pr) => {
            if ((pr.merged_at !== null) && (moment.utc(pr.merged_at).isSame(prMergeDate, 'month'))) {
                mergedPrsByDate.push(pr);
            }
        });
        return mergedPrsByDate;
    }

    async getPrsByUser(userId, prs) {
        const prsByUser = [];
        prs.forEach((pr) => {
            if (parseInt(pr.user.id) === parseInt(userId)) {
                prsByUser.push(pr);
            }
        });
        console.log(`Returning PRs By User List: ${ prsByUser.length } ...\n`);
        return prsByUser;
    }

    async getMergedPrsByUser(userId, prs) {
        const mergedPrs = await this.getAllMergedPrs(prs);
        console.log(`Returning Merged PR's by User ...`);
        return await this.getPrsByUser(userId, mergedPrs);
    }

    getAllPrsByMonthYear(prs, year, month) {
        // NOTE, months in moment are zero indexed. January is 0 and December is 11
        const prsInGivenMonth = [];
        const prMonth = moment([year, month]);

        prs.forEach((pr) => {
            const prCreatedDate = moment.utc(pr.created_at);
            if (prMonth.diff(prCreatedDate, 'months') === 0) {
                prsInGivenMonth.push(pr);
            }
        });
        return prsInGivenMonth;
    }

    async getCommitsForPr(pr) {
        const commitUrl = pr.commits_url;
        return await utilService.makeFetchRequest(commitUrl, 'GET');
    }

    async getCommitsForAllPrs(prs) {
        const allCommits = [];
        for (const pr of prs) {
            const commits = await this.getCommitsForPr(pr);
            allCommits.push.apply(allCommits, commits);
        }
        return allCommits;
    }

}

module.exports = GitHubService;