const { checkRequestStatus } = require("./checkRequestStatus");
const { checkReturnStatus } = require("./checkReturnStatus");

async function runUserNotifications() {
  await checkRequestStatus();
  await checkReturnStatus();
}

module.exports = { runUserNotifications };
