const fetch = require('node-fetch');
const moment = require('moment');
const config = require('./config');

const clientSecret = config.gitHub.clientSecret;
const clientID = config.gitHub.clientID;

/**
 * Using the pagination information provided in the link header of the API call, we create a mapping of links/url
 * to page, this allows us to be able to quickly look up url for previous, next and last page
 * @param {string} linkHeader - Link header of the API call
 * @returns {map} linksRelationshipMap - Map of all pages for a given response along with the URLs to query them
 */
function extractUrlFromLinkHeader(linkHeader) {
    const linksRelationshipList = linkHeader.trim().split(',');
    let linksRelationshipMap = {};

    linksRelationshipList.forEach((linkRel) => {
        let urlAndPosition = linkRel.trim().split(';');
        let positionList = urlAndPosition[1].trim().split('=');
        linksRelationshipMap[positionList[positionList.length - 1].slice(1,-1)] = urlAndPosition[0].trim().slice(1,-1);
    });
    return linksRelationshipMap;
}

/**
 *
 * @param {string} endPoint - Endpoint to which fetch request will be sent to
 * @param {string} method - Http method to use for querying
 * @returns {Promise<{response: *, resJson: *}>} - Response object (promise) and extracted JSON body (resJson)
 */
async function makeFetchRequest(endPoint, method) {
    // Concatenate the Client ID and secret to allow us make up to 5k requests / hr
    const modifiedEndPoint = `${endPoint}&client_id=${clientID}&client_secret=${clientSecret}`;
    const fetchOptions = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    let response;
    let resJson;

    try {
        response = await fetch(modifiedEndPoint, fetchOptions);
        resJson = await response.json();
    } catch(err) {
        console.log(err);
    }
    return { response, resJson };
}

function generateDateKeys(date) {
    const dateInMoment = moment(date);
    const startOfWeek = moment(dateInMoment.toISOString()).startOf('week');
    const endOfWeek = moment(dateInMoment.toISOString()).endOf('week');

    return `${startOfWeek.format('ll')} - ${endOfWeek.format('ll')}`;
}


module.exports = { extractUrlFromLinkHeader, makeFetchRequest, generateDateKeys };