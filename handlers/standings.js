import * as log from "lambda-log";

const axios = require("axios");

import { isNil, isNumber, map, orderBy } from "lodash";
import { Exception } from "../libs/error-lib";
import { validateYear } from "../libs/validations";

const format = "json";

/*
description: 
    Get standings for the NFL season based on the input. Returns data
    formatted based on conference and division. Data is sorted based on rank.
input: 
    object ->
     {
         year: <number or corercable string> //the season to get standings for
         team: <string> //the only team to return 
     }
output:
    array of objects -> 
    [
        {
            <conference>-<division>: [
                {
                    Team: <string>,         //team city acronym
                    Wins: <number>,         //number of wins
                    Losses: <numser>,       //number of losses
                    NetPoints: <number>,    //net points based on wins, losses, ties
                    Standing: <number>      //team standing in the division
                }
            ]
        },
    ...
    ]
*/
export const standings = async (event, context) => {
  try {
    log.info({ data: event });

    let { year = null, team: inputTeam = null } = event;

    //Check for common issues before writing to axios
    if (!isNumber(parseInt(year))) {
      throw new Exception("invalid input", "year is not valid", 400);
    }
    //If a year was not provided, use the upcoming/current season
    if (isNil(year)) {
      let response = await axios({
        method: "GET",
        url: `https://api.sportsdata.io/v3/nfl/scores/${format}/UpcomingSeason`,
        params: {
          key: process.env.API_KEY,
        },
      });
      let {
        data: seasonData = null,
        status = 800,
        statusText = null,
      } = response;
      if (status != 200 && status != 201) {
        throw new Exception("API response error", statusText, status);
      }
      year = seasonData;
    }

    validateYear(year);

    if (!isNil(inputTeam) && (inputTeam.length > 3 || inputTeam.length < 1)) {
      throw new Exception(
        "invalid input",
        "team should be the 2-3 letter acronymn for the team's city",
        400
      );
    }

    let response = await axios({
      method: "GET",
      url: `https://api.sportsdata.io/v3/nfl/scores/${format}/Standings/${year}`,
      params: {
        key: process.env.API_KEY,
      },
    });

    let { data = {}, status = 800, statusText = null } = response;
    if (status != 200 && status != 201) {
      throw new Exception("API response error", statusText, status);
    }

    log.info({ data });

    //Format the response data
    let result = {};
    for (let thisTeam of data) {
      let {
        Wins = null,
        Losses = null,
        NetPoints = null,
        Conference = null,
        Division = null,
        Team = null,
      } = thisTeam;
      let location = Conference + "-" + Division;

      if (isNil(result[location])) {
        result[location] = [{ Team, Wins, Losses, NetPoints }];
      } else {
        result[location].push({ Team, Wins, Losses, NetPoints });
      }
    }

    //Sort the results according to Net Points for each Conference/Division
    //Add the overall standing to the results for display
    let sortedResults = map(result, function (thisResult, value) {
      orderBy(thisResult, ["NetPoints", "Wins"], ["desc"]);
      for (let thisTeam in thisResult) {
        thisResult[thisTeam]["standing"] = parseInt(thisTeam) + 1;
      }
      return { [value]: thisResult };
    });

    return sortedResults;
    // Use this return statement when function is triggered by an API gateway
    // return {
    //   statusCode: 200,
    //   headers: {
    //     "Access-Control-Allow-Origin": "*", // Required for CORS support to work
    //     "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS
    //   },
    //   body: JSON.stringify(
    //     sortedResults,
    //     null,
    //     2
    //   )
    // };
  } catch (error) {
    let {
      description = null,
      message = JSON.stringify(error, Object.getOwnPropertyNames(error)),
      statusCode = 800,
    } = error;
    log.error({ message, statusCode });
    return { description, message, statusCode };
    //TODO: Update return when error occurs if using an API Gateway. Must return appropriate error code.
  }
};
