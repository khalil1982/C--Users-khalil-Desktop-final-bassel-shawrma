# Phase 2: التأسيس التقني والمعمارية (Foundation & Architecture)

---

## 2.1 الهدف
بناء الهيكل التقني الذي سيحمل النظام ويضمن Offline-First وقابلية التوسّع.

---

## 2.2 المنصة والتقنية
* **Electron Desktop Application**
* **HTML / CSS / JavaScript**
* **Node.js (Local Backend)**
* **SQLite Local Database**
* **وضع ملء الشاشة (Fullscreen) بدون شريط القوائم (Menu Bar)**
* **واجهة نظيفة بدون عناصر نظام التشغيل**

---

## 2.3 متطلبات تقنية

### متطلبات أساسية
* فصل منطق الأعمال عن الواجهة (Separation of Concerns)
* دعم اللغة العربية (RTL - Right-to-Left)
* نظام صلاحيات (Admin / Cashier)

### المعايير المالية
* **العملة الرسمية:** الشيكل الإسرائيلي (₪ / ILS)
* **تنسيق الأرقام المالية:** عرض منزلتين عشريتين
* **صيغة العرض المالي:** ₪123.45

### المعمارية التقنية
```
┌─────────────────────────────────────┐
│     Electron Main Process           │
│  (Window Management, System Access) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Renderer Process (UI)           │
│  (HTML/CSS/JS - User Interface)     │
│  • Login Screen                     │
│  • Main Dashboard                   │
│  • Logout Button                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Authentication Layer            │
│  (Login, Logout, Session Mgmt)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Business Logic Layer            │
│  (Sales, Shifts, Validation)        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Data Access Layer (DAL)         │
│  (SQLite Queries, Transactions)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     SQLite Database (Local)         │
│  (All Data Stored Offline)          │
└─────────────────────────────────────┘
```

---

## 2.4 هيكل قاعدة البيانات (Database Schema)

### الجداول الأساسية المطلوبة:

#### 1. Users (المستخدمين)
```sql
- user_id (Primary Key)
- username (Unique)
- password_hash (bcrypt)
- role (Admin / Cashier)
- failed_login_attempts (Default: 0)
- locked_until (Nullable timestamp)
- created_at
- is_active
```

#### 2. Sessions (الجلسات)
```sql
- session_id (Primary Key)
- user_id (Foreign Key → Users)
- login_time
- logout_time (Nullable)
- ip_address (Nullable - for future use)
- is_active (Boolean)
```

#### 3. Shifts (الورديات)
```sql
- shift_id (Primary Key)
- shift_type (Morning / Evening)
- opened_by (Foreign Key → Users)
- opened_at
- closed_by (Foreign Key → Users)
- closed_at
- status (Active / Closed)
```

#### 3. Shifts (الورديات)
```sql
- shift_id (Primary Key)
- shift_type (Morning / Evening)
- opened_by (Foreign Key → Users)
- opened_at
- closed_by (Foreign Key → Users)
- closed_at
- status (Active / Closed)
```

#### 4. Tables (الطاولات)
```sql
- table_id (Primary Key)
- table_number
- status (Available / Occupied)
- is_active
```

#### 5. Orders (الطلبات)
```sql
- order_id (Primary Key)
- shift_id (Foreign Key → Shifts)
- order_type (Dine-in / Takeaway / Delivery)
- table_id (Foreign Key → Tables, nullable)
- created_by (Foreign Key → Users)
- created_at
- total_amount
- discount_amount
- final_amount
- status (Open / Closed / Cancelled)
```

#### 6. Order_Items (أصناف الطلب)
```sql
- item_id (Primary Key)
- order_id (Foreign Key → Orders)
- product_id (Foreign Key → Products)
- quantity
- unit_price
- total_price
```

#### 7. Products (الأصناف)
```sql
- product_id (Primary Key)
- product_name_ar
- product_name_en
- category_id (Foreign Key → Categories)
- price
- is_active
```

#### 8. Categories (التصنيفات)
```sql
- category_id (Primary Key)
- category_name_ar
- category_name_en
- icon_name
- sort_order
- is_active
```

#### 9. Expenses (المصاريف)
```sql
- expense_id (Primary Key)
- shift_id (Foreign Key → Shifts)
- expense_type
- amount
- description
- created_by (Foreign Key → Users)
- created_at
```

#### 10. Purchases (المشتريات)
```sql
- purchase_id (Primary Key)
- shift_id (Foreign Key → Shifts)
- supplier_name
- amount
- description
- created_by (Foreign Key → Users)
- created_at
```

#### 11. Cash_Differences (الفروقات المالية)
```sql
- difference_id (Primary Key)
- shift_id (Foreign Key → Shifts)
- expected_amount
- actual_amount
- difference_amount
- reason
- approved_by (Foreign Key → Users)
- approved_at
```

#### 12. Audit_Log (سجل التدقيق)
```sql
- log_id (Primary Key)
- user_id (Foreign Key → Users)
- action_type (LOGIN / LOGOUT / CREATE / UPDATE / DELETE / ADJUSTMENT)
- table_name
- record_id
- old_value (JSON)
- new_value (JSON)
- timestamp
```

---

## 2.5 مخرجات المرحلة
✅ تطبيق Electron أساسي يعمل  
✅ **واجهة تسجيل دخول كاملة مع نظام أمان**  
✅ **زر خروج في الواجهة الرئيسية**  
✅ **إدارة جلسات المستخدمين (Sessions)**  
✅ قاعدة بيانات SQLite محلية مع جميع الجداول (12 جدول)  
✅ بنية كود منظمة وجاهزة للتطوير  
✅ نظام صلاحيات أساسي (Admin / Cashier)  
✅ دعم RTL للواجهة  
✅ **تشفير كلمات المرور (bcrypt)**  
✅ **Audit Log لتتبع عمليات تسجيل الدخول/الخروج**  

---

## حالة المرحلة
🔲 **لم تبدأ بعد** | 🔄 **جارية** | ✅ **مكتملة**

---

**ملاحظات:**
هذه المرحلة تبني الأساس التقني الذي سيُبنى عليه كل شيء. يجب التأكد من:
- قوة نظام الأمان (تشفير كلمات المرور، حماية من Brute Force)
- سلامة البنية المعمارية
- استقرار قاعدة البيانات وعلاقاتها

قبل الانتقال إلى Phase 3.
