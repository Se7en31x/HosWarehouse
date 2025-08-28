const m = require("../models/historyPurchasingModel");

// Lists
exports.getRFQHistory = async (req, res) => { try { res.json(await m.getRFQHistory()); } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); } };
exports.getPOHistory = async (req, res) => { try { res.json(await m.getPOHistory()); } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); } };
exports.getAllGRHistory = async (req, res) => { try { res.json(await m.getAllGRHistory()); } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); } };

// Details
exports.getRFQItems = async (req, res) => { try { res.json(await m.getRFQItems(req.params.rfq_id) || []); } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); } };
exports.getPOItems = async (req, res) => { try { res.json(await m.getPOItems(req.params.po_id) || []); } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); } };
exports.getGRHistoryByPO = async (req, res) => { try { res.json(await m.getGRHistoryByPO(req.params.po_id) || []); } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); } };
exports.getPOSourcePRItems = async (req, res) => { try { res.json(await m.getPOSourcePRItems(req.params.po_id) || []); } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); } };
exports.getGRItems = async (req, res) => { try { res.json(await m.getGRItems(req.params.gr_id) || []); } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); } };
