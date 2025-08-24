"use client";
import { useState, useEffect } from 'react';
import { Bell, Check, Clock, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// ตรวจสอบว่าเป็น Client-side หรือไม่
const isClient = typeof window !== "undefined";
const host = isClient ? window.location.hostname : "localhost";

/**
 * @description คอมโพเนนต์หลักสำหรับหน้าการแจ้งเตือน
 */
const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // กำหนด User ID สำหรับการเรียก API (ในความเป็นจริงควรได้จาก session หรือ context)
  const userId = 8; 

  // ดึงข้อมูลการแจ้งเตือนเมื่อคอมโพเนนต์ถูก Mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`http://${host}:3001/noti/api/notifications/${userId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // จัดเรียงการแจ้งเตือนล่าสุดขึ้นก่อน
        const sortedNotifications = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setNotifications(sortedNotifications);
      } catch (e) {
        console.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูล:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, [userId]);

  /**
   * @description ทำเครื่องหมายการแจ้งเตือนรายการเดียวว่าอ่านแล้ว
   * @param {number} notificationId - ID ของการแจ้งเตือนที่ต้องการอัปเดต
   */
  const markAsRead = async (notificationId) => {
    if (isUpdating) return; 
    setIsUpdating(true);

    try {
      // แก้ไข: เพิ่ม body เข้าไปใน fetch call
      const response = await fetch(`http://${host}:3001/noti/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        // แก้ไข: แนบ body ที่มีค่า isRead เป็น true
        body: JSON.stringify({ isRead: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      // อัปเดตสถานะใน UI ทันที
      setNotifications(prevNotifications => 
        prevNotifications.map(n => 
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      );

    } catch (e) {
      console.error('❌ ข้อผิดพลาดในการอัปเดตการแจ้งเตือน:', e);
      setErrorMessage(`ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้: ${e.message}`);
      // ซ่อนข้อความแสดงข้อผิดพลาดหลังจาก 5 วินาที
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * @description ทำเครื่องหมายการแจ้งเตือนที่ยังไม่อ่านทั้งหมดว่าอ่านแล้ว
   */
  const markAllAsRead = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      // แก้ไข: API call to mark all unread notifications as read
      const response = await fetch(`http://${host}:3001/noti/api/notifications/user/${userId}/read-all`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        // แก้ไข: แนบ body ที่มีค่า isRead เป็น true
        body: JSON.stringify({ isRead: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // อัปเดตสถานะใน UI ทันที
      setNotifications(prevNotifications => 
        prevNotifications.map(n => ({ ...n, is_read: true }))
      );

    } catch (e) {
      console.error('❌ ข้อผิดพลาดในการอัปเดตการแจ้งเตือนทั้งหมด:', e);
      setErrorMessage(`ไม่สามารถทำเครื่องหมายทั้งหมดว่าอ่านแล้วได้: ${e.message}`);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  // ฟังก์ชันสำหรับกรองการแจ้งเตือนตามสถานะ
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'read') return notification.is_read;
    return true;
  });

  // ฟังก์ชันสำหรับจัดรูปแบบวันที่
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'วันนี้';
    if (diffDays === 1) return 'เมื่อวาน';
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH');
  };

  // นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-inter">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
              <Bell className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">กำลังโหลดการแจ้งเตือน</h3>
              <p className="text-gray-500">โปรดรอสักครู่...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4 font-inter">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">เกิดข้อผิดพลาด</h3>
              <p className="text-gray-500 mb-4">ไม่สามารถโหลดการแจ้งเตือนได้</p>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                โหลดใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="max-w-4xl mx-auto">
        
        {/* Header and Mark All as Read Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bell className="w-8 h-8 text-blue-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                การแจ้งเตือน
              </h1>
              <p className="text-gray-500 text-sm">
                {notifications.length > 0 ? `ทั้งหมด ${notifications.length} รายการ` : 'ไม่มีการแจ้งเตือน'}
                {unreadCount > 0 && ` • ${unreadCount} รายการใหม่`}
              </p>
            </div>
          </div>
          {/* ปุ่มทำเครื่องหมายทั้งหมดว่าอ่านแล้ว */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={isUpdating}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-white rounded-full shadow-sm ring-1 ring-blue-500/20 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        {notifications.length > 0 && (
          <div className="mt-6 flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'all', label: 'ทั้งหมด', count: notifications.length },
              { key: 'unread', label: 'ยังไม่อ่าน', count: unreadCount },
              { key: 'read', label: 'อ่านแล้ว', count: notifications.length - unreadCount }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  filter === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    filter === tab.key
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      

        {/* Content */}
        <div className="max-w-4xl mx-auto py-8">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-lg bg-red-100 text-red-700 text-sm font-medium flex items-center"
            >
              <X className="w-4 h-4 mr-2" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border p-12 text-center"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">ไม่มีการแจ้งเตือน</h3>
              <p className="text-gray-500">คุณจะเห็นการแจ้งเตือนใหม่ๆ ที่นี่เมื่อมีการอัพเดท</p>
            </motion.div>
          ) : filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border p-12 text-center"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                ไม่มีการแจ้งเตือน{filter === 'unread' ? 'ที่ยังไม่อ่าน' : filter === 'read' ? 'ที่อ่านแล้ว' : ''}
              </h3>
              <p className="text-gray-500">ลองเปลี่ยนตัวกรองเพื่อดูการแจ้งเตือนอื่นๆ</p>
            </motion.div>
          ) : (
            <motion.div layout className="space-y-3">
              <AnimatePresence>
                {filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.notification_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => !notification.is_read && markAsRead(notification.notification_id)}
                    className={`group relative bg-white rounded-xl shadow-sm border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                      !notification.is_read 
                        ? 'border-l-4 border-l-blue-500 bg-blue-50/30 cursor-pointer' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            !notification.is_read ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                          }`} />
                          <div className="flex-1">
                            <h3 className={`font-semibold mb-1 ${
                              !notification.is_read 
                                ? 'text-gray-900' 
                                : 'text-gray-600'
                            }`}>
                              {notification.title}
                            </h3>
                            <p className={`text-sm leading-relaxed ${
                              !notification.is_read 
                                ? 'text-gray-700' 
                                : 'text-gray-500'
                            }`}>
                              {notification.message}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.is_read && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              ใหม่
                            </span>
                          )}
                          <div className="flex items-center text-xs text-gray-400 space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(notification.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {notification.is_read ? (
                            <div className="flex items-center space-x-1 text-xs text-green-600">
                              <Check className="w-3 h-3" />
                              <span>อ่านแล้ว</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 text-xs text-blue-600">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <span>ยังไม่ได้อ่าน</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;