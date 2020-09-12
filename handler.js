import * as log from "lambda-log";
const axios = require("axios");

import { includes, isNil, isNumber } from "lodash";
import { Exception } from "./libs/error-lib";

const validTypes = ["REG", "PRE", "POST"];

export const byeWeek = async (event, context) => {
  try {
    log.info({ data: event });

    let {
      format = "json",
      year = "2020",
      type = "REG",
      team: inputTeam = null,
    } = event;

    type = type.toUpperCase();

    //Check for common issues before writing to axios
    if (isNil(format)) {
      throw new Exception(
        "invalid input",
        "format must be either json or xml",
        400
      );
    }
    if (!isNumber(parseInt(year))) {
      throw new Exception("invalid input", "year is not valid", 400);
    }
    if (!includes(validTypes, type)) {
      throw new Exception(
        "invalid input",
        "type must be one of 'REG', 'PRE', or 'POST",
        400
      );
    }

    let response = await axios({
      method: "GET",
      url: `https://api.sportsdata.io/v3/nfl/scores/${format}/Byes/${year}${type}`,
      params: {
        key: "8c64ccbdcf6e407cae8b857c8d22e096",
      },
    });

    let { data = {}, status = 800, statusText = null } = response;
    if (status != 200 && status != 201) {
      throw new Exception("API response error", statusText, status);
    }

    log.info({ data });

    // return {
    //   statusCode: 200,
    //   headers: {
    //     "Access-Control-Allow-Origin": "*", // Required for CORS support to work
    //     "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS
    //   },
    //   body: JSON.stringify(
    //     {
    //       message: "Go Serverless v1.0! Your function executed successfully!",
    //       input: event
    //     },
    //     null,
    //     2
    //   )
    // };
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
  } catch (error) {
    let {
      message = JSON.stringify(error, Object.getOwnPropertyNames(error)),
      statusCode = 999,
    } = error;
    log.error({ message, statusCode });
  }
};
