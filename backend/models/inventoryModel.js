const db = require('../config/db');

exports.getAllItems = async ()=>{
    const result = await db.pool.query('SELECT * FROM items');
    console.log(result.rows);
    return result.rows;
}