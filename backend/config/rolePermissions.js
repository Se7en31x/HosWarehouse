module.exports = {
  doctor: ["medicine", "medsup", "equipment", "meddevice", "general"],
  nurse: ["medsup", "equipment", "general"],
  assistant_nurse: ["medsup", "general"],
  pharmacist: ["medicine", "medsup", "general"], 
  manage: ["*"],   // คลัง → ทุกประเภท
  admin: ["*"]     // สิทธิ์สูงสุด
};