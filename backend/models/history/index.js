//models/history/index.js

const withdrawHistoryModel = require("./withdrawHistoryModel");
const returnHistoryModel = require("./returnHistoryModel");
const importHistoryModel = require("./importHistoryModel");
const damagedHistoryModel = require("./damagedHistoryModel");
const expiredHistoryModel = require("./expiredHistoryModel");
const disposalHistoryModel = require("./disposalHistoryModel");
const borrowHistoryModel = require("./borrowHistoryModel")

module.exports = {
    withdrawHistoryModel,
    returnHistoryModel,
    importHistoryModel,
    expiredHistoryModel,
    damagedHistoryModel,
    disposalHistoryModel,
    borrowHistoryModel,
};
