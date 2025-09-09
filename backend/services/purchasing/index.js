// services/purchasing/runPurchasingRules.js
const { checkNewPurchaseRequests } = require("./checkNewPurchaseRequests");

async function runPurchasingRules() {
  await checkNewPurchaseRequests();
}

module.exports = { runPurchasingRules };
