var moment = require("moment-timezone");
import { Exception } from "./error-lib";

export function validateYear(year) {
  try {
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
  } catch (error) {
    let {
      message = JSON.stringify(error, Object.getOwnPropertyNames(error)),
      statusCode = 800,
    } = error;
    throw new Exception("validateYear error", message, statusCode);
  }
}
