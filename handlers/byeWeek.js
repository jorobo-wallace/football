import * as log from "lambda-log";
var moment = require("moment-timezone");
const axios = require("axios");

import { includes, isNil, isNumber } from "lodash";
import { Exception } from "../libs/error-lib";

const validTypes = ["REG", "PRE", "POST"];
const format = "json";

/*
description: 
    Get list of bye weeks for a given season. May get all bye weeks, or just the bye week(s)
    for a given (input) team
input: 
    object ->
     {
         year: <number or corercable string>  //the season to get standings for
         type: <string>                       //season type - PRE, POST, or REG
         team: <string>                       //the only team to return 
     }
output:
    array of objects -> 
    [
        {
            <week number>: [
                <string>  //team (city acronym) that has a bye this week,
                ...
            ]
        },
    ...
    ]
*/
export const byeWeek = async (event, context) => {
  try {
    log.info({ data: event });

    let { year = "2020", type = "REG", team: inputTeam = null } = event;

    type = type.toUpperCase();

    //Check for common issues before writing to axios
    if (!isNumber(parseInt(year))) {
      throw new Exception("invalid input", "year is not valid", 400);
    }
    //The free version of the API only allows the user to look at this season and
    //the previous season. Compare the input year to the current date to ensure
    //the API will not fail for this reason.
    let yearNow = moment.tz(Date.now(), "America/Vancouver").year();
    let monthNow = moment.tz(Date.now(), "America/Vancouver").month();
    monthNow <= 7 ? (yearNow = yearNow + 1) : null;
    if (parseInt(year) < parseInt(yearNow) - 1) {
      throw new Exception(
        "invalid input",
        "year is not valid: cannot look beyond the previous season",
        400
      );
    }
    if (!includes(validTypes, type)) {
      throw new Exception(
        "invalid input",
        "type must be one of 'REG', 'PRE', or 'POST",
        400
      );
    }
    if (!isNil(inputTeam) && (inputTeam.length > 3 || inputTeam.length < 1)) {
      throw new Exception(
        "invalid input",
        "team should be the 2-3 letter acronymn for the team's city",
        400
      );
    }

    let response = await axios({
      method: "GET",
      url: `https://api.sportsdata.io/v3/nfl/scores/${format}/Byes/${year}${type}`,
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
    for (let thisBye of data) {
      let { Week = null, Team = null } = thisBye;
      //If the input specified a team, return only the weeks that team has a bye
      if (isNil(inputTeam) || inputTeam === Team) {
        if (isNil(result[Week])) {
          result[Week] = [Team];
        } else {
          result[Week].push(Team);
        }
      }
    }

    return result;
    // Use the result statement below when returning to an API Gateway
    // return {
    //   statusCode: 200,
    //   headers: {
    //     "Access-Control-Allow-Origin": "*", // Required for CORS support to work
    //     "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS
    //   },
    //   body: JSON.stringify(
    //     result,
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
