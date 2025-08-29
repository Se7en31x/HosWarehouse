// models/history/index.js

const withdrawHistoryModel = require("./withdrawHistoryModel");
const returnHistoryModel = require("./returnHistoryModel");
const stockinHistoryModel = require("./stockinHistoryModel"); // ✅ Renamed
const damagedHistoryModel = require("./damagedHistoryModel");
const expiredHistoryModel = require("./expiredHistoryModel");
const stockoutHistoryModel = require("./stockoutHistoryModel");
const borrowHistoryModel = require("./borrowHistoryModel")

module.exports = {
    withdrawHistoryModel,
    returnHistoryModel,
    stockinHistoryModel, // ✅ Renamed
    expiredHistoryModel,
    damagedHistoryModel,
    stockoutHistoryModel,
    borrowHistoryModel,
};