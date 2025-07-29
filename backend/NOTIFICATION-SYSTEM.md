# 🔔 VidhyaSetu - Notification System

## 📋 Overview

The notification system provides real-time alerts to tuition owners and teachers about important events in their tuition management system.

---

## 🎯 Features

### **1. Real-time Notifications**
- **Payment Pending** - When students submit payments for verification
- **Student Registered** - When new students register via self-registration
- **Attendance Reminders** - Daily reminders for marking attendance
- **Fee Due Alerts** - When students have pending fees
- **Payment Verified** - When payments are approved/rejected
- **General Notifications** - Custom notifications

### **2. Notification Badge**
- **Red badge with number** - Shows unread notification count
- **Click to view** - Opens notification panel
- **Auto-update** - Real-time count updates

### **3. Priority Levels**
- **Low** - General information
- **Medium** - Important updates (default)
- **High** - Urgent actions needed
- **Urgent** - Critical alerts

---

## 🚀 How It Works

### **1. Automatic Notifications**

#### **Student Registration**
```javascript
// When student registers via self-registration link
await createNotification({
  tuition_id: tuition._id,
  user_id: tuition.owner_id,
  title: 'New Student Registered',
  message: `${student.name} (${student.standard}) has registered via self-registration link`,
  type: 'student_registered',
  related_id: student._id,
  related_type: 'student',
  priority: 'medium'
});
```

#### **Payment Verification**
```javascript
// When student submits payment for verification
await createNotification({
  tuition_id: tuition._id,
  user_id: tuition.owner_id,
  title: 'Payment Pending Verification',
  message: `${student.name} has submitted a payment of ₹${amount} (${mode}) for verification`,
  type: 'payment_pending',
  related_id: payment._id,
  related_type: 'payment',
  priority: 'high'
});
```

### **2. Notification Display**

#### **Dashboard Badge**
```html
<div class="notification-badge">
  🔔 Notifications
  <span class="count">5</span> <!-- Unread count -->
</div>
```

#### **Notification List**
```html
<div class="notification-item unread priority-high">
  <div class="notification-title">Payment Pending Verification</div>
  <div class="notification-message">Rahul Kumar has submitted a payment of ₹5000 (cash) for verification</div>
  <div class="notification-meta">
    <span class="notification-type type-payment_pending">payment_pending</span>
    <span>2025-01-13 10:30 AM</span>
  </div>
</div>
```

---

## 📱 API Endpoints

### **1. Get Unread Count**
```bash
GET /notifications/count?tuition_id=YOUR_TUITION_ID
Authorization: Bearer YOUR_TOKEN

Response:
{
  "count": 5
}
```

### **2. Get Notifications**
```bash
GET /notifications?tuition_id=YOUR_TUITION_ID&limit=50&skip=0
Authorization: Bearer YOUR_TOKEN

Response:
{
  "notifications": [
    {
      "id": "notification_id",
      "title": "Payment Pending Verification",
      "message": "Rahul Kumar has submitted a payment...",
      "type": "payment_pending",
      "is_read": false,
      "priority": "high",
      "created_at": "2025-01-13T10:30:00.000Z"
    }
  ]
}
```

### **3. Mark as Read**
```bash
PUT /notifications/:id/read
Authorization: Bearer YOUR_TOKEN

Response:
{
  "success": true,
  "notification": {
    "id": "notification_id",
    "is_read": true
  }
}
```

### **4. Mark All as Read**
```bash
PUT /notifications/read-all
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "tuition_id": "YOUR_TUITION_ID"
}

Response:
{
  "success": true,
  "marked_count": 5
}
```

### **5. Delete Notification**
```bash
DELETE /notifications/:id
Authorization: Bearer YOUR_TOKEN

Response:
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## 🎨 GraphQL Queries & Mutations

### **1. Get Notifications**
```graphql
query {
  notifications(tuition_id: "YOUR_TUITION_ID", limit: 50) {
    id
    title
    message
    type
    is_read
    priority
    created_at
  }
  unreadNotificationCount(tuition_id: "YOUR_TUITION_ID")
}
```

### **2. Mark as Read**
```graphql
mutation {
  markNotificationAsRead(id: "NOTIFICATION_ID") {
    id
    is_read
  }
}
```

### **3. Mark All as Read**
```graphql
mutation {
  markAllNotificationsAsRead(tuition_id: "YOUR_TUITION_ID")
}
```

### **4. Delete Notification**
```graphql
mutation {
  deleteNotification(id: "NOTIFICATION_ID")
}
```

---

## 🧪 Testing

### **1. Test Page**
```
http://localhost:4000/notifications-test
```

### **2. Manual Testing**
```bash
# Create test notification
curl -X POST http://localhost:4000/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "payment_pending",
    "title": "Test Payment",
    "message": "This is a test notification",
    "priority": "high"
  }'

# Get unread count
curl -X GET http://localhost:4000/notifications/count \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get notifications
curl -X GET http://localhost:4000/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎨 Frontend Integration

### **1. Notification Badge Component**
```javascript
function NotificationBadge() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Fetch unread count every 30 seconds
    const interval = setInterval(async () => {
      const response = await fetch('/notifications/count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCount(data.count);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="notification-badge" onClick={showNotifications}>
      🔔 Notifications
      {count > 0 && <span className="count">{count}</span>}
    </div>
  );
}
```

### **2. Notification Panel**
```javascript
function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  
  const loadNotifications = async () => {
    const response = await fetch('/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setNotifications(data.notifications);
  };
  
  const markAsRead = async (id) => {
    await fetch(`/notifications/${id}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadNotifications(); // Refresh list
  };
  
  return (
    <div className="notification-panel">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
          onClick={() => markAsRead(notification.id)}
        >
          <div className="title">{notification.title}</div>
          <div className="message">{notification.message}</div>
          <div className="meta">
            <span className={`type type-${notification.type}`}>
              {notification.type}
            </span>
            <span className="time">
              {new Date(notification.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎨 CSS Styling

### **1. Notification Badge**
```css
.notification-badge {
  position: relative;
  display: inline-block;
  background: #007bff;
  color: white;
  padding: 10px 20px;
  border-radius: 50px;
  cursor: pointer;
}

.notification-badge .count {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}
```

### **2. Notification Items**
```css
.notification-item {
  padding: 15px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item.unread {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
}

.notification-item.read {
  background-color: #f8f9fa;
  opacity: 0.7;
}

.notification-item.priority-high {
  border-left-color: #dc3545;
}

.notification-item.priority-urgent {
  border-left-color: #dc3545;
  background-color: #f8d7da;
}
```

### **3. Notification Types**
```css
.notification-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}

.type-payment_pending { background: #fff3cd; color: #856404; }
.type-student_registered { background: #d1ecf1; color: #0c5460; }
.type-attendance_reminder { background: #d4edda; color: #155724; }
.type-fee_due { background: #f8d7da; color: #721c24; }
.type-payment_verified { background: #d1ecf1; color: #0c5460; }
.type-general { background: #e2e3e5; color: #383d41; }
```

---

## 🔧 Database Schema

### **Notification Model**
```javascript
{
  tuition_id: ObjectId,      // Reference to Tuition
  user_id: ObjectId,         // Who should see this notification
  title: String,             // Notification title
  message: String,           // Notification message
  type: String,              // payment_pending, student_registered, etc.
  related_id: ObjectId,      // ID of related entity
  related_type: String,      // 'student', 'payment', etc.
  is_read: Boolean,          // Read status
  priority: String,          // low, medium, high, urgent
  action_url: String,        // URL to navigate when clicked
  expires_at: Date,          // Optional expiration
  metadata: Mixed,           // Additional data
  created_at: Date,
  updated_at: Date
}
```

---

## 🚀 Production Features

### **1. Auto-cleanup**
- Old read notifications are automatically deleted after 30 days
- Expired notifications are removed immediately

### **2. Performance**
- Indexed queries for fast retrieval
- Pagination support for large notification lists
- Efficient unread count calculation

### **3. Security**
- User-specific notifications (users only see their own)
- Authentication required for all operations
- Tuition-specific filtering

---

## 🎯 Usage Examples

### **1. Dashboard Integration**
```javascript
// In your main dashboard component
function Dashboard() {
  return (
    <div>
      <header>
        <h1>VidhyaSetu Dashboard</h1>
        <NotificationBadge />
      </header>
      <main>
        {/* Dashboard content */}
      </main>
      <NotificationPanel />
    </div>
  );
}
```

### **2. Real-time Updates**
```javascript
// Poll for new notifications every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    checkNewNotifications();
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

### **3. Mobile Responsive**
```css
@media (max-width: 768px) {
  .notification-badge {
    padding: 8px 16px;
    font-size: 14px;
  }
  
  .notification-item {
    padding: 12px;
  }
}
```

---

## 🎉 Ready to Use!

**Your notification system is now complete with:**

✅ **Real-time notifications** for all important events  
✅ **Notification badge** with unread count  
✅ **Priority levels** for different types of alerts  
✅ **Mark as read** functionality  
✅ **Mobile-responsive** design  
✅ **GraphQL & REST APIs** for easy integration  
✅ **Auto-cleanup** for old notifications  
✅ **Test interface** for development  

**Perfect for keeping tuition owners informed about all activities!** 🔔✨ 