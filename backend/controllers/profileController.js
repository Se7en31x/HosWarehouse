const { pool } = require('../config/db');

exports.getProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT user_fname, user_lname, user_role FROM public."users" WHERE user_id = $1`,
      [id]
    );

    if (result.rows.length === 0 ){
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    } 

    const user = result.rows[0];
    res.json({
      name:`${user.user_fname} ${user.user_lname}`,
      role: user.user_role
    });
    
  } catch (err){
    console.error('เกิดข้อผิดพลาด:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};  

exports.getAllProfile = async (req ,res) =>{
  try {
    // คำสั่ง SQL ดึงข้อมูลทั้งหมดจากตาราง user
    const result = await pool.query(
      `SELECT user_fname, user_lname, user_role FROM public."users"`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่มีข้อมูลผู้ใช้' });
    }

    // ส่งข้อมูลทั้งหมดกลับมาเป็น JSON
    res.json(result.rows);
    
  } catch (err) {
    console.error('เกิดข้อผิดพลาด:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};  
