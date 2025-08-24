//models/history/index.js

const withdrawHistoryModel = require("./withdrawHistoryModel");
const returnHistoryModel = require("./returnHistoryModel");
const importHistoryModel = require("./importHistoryModel");
const damagedHistoryModel = require("./damagedHistoryModel");
const expiredHistoryModel = require("./expiredHistoryModel");
const stockoutHistoryModel = require("./stockoutHistoryModel");
const borrowHistoryModel = require("./borrowHistoryModel")

module.exports = {
    withdrawHistoryModel,
    returnHistoryModel,
    importHistoryModel,
    expiredHistoryModel,
    damagedHistoryModel,
    stockoutHistoryModel,
    borrowHistoryModel,
};
