# Báo cáo Phân tích Tấn công — HoLA smoking

**Phạm vi:** Tấn công nhắm vào **tài khoản người dùng**, **thông tin bảo mật tài khoản** (mật khẩu, phiên đăng nhập) và **PII khách hàng** (họ tên, số điện thoại, địa chỉ giao hàng trong bảng `orders`).

**Ứng dụng:** TanStack Start (React 19) + Lovable Cloud (Supabase). Auth = email/password. Dữ liệu nhạy cảm: `auth.users`, `public.profiles`, `public.orders`, `public.wallet_transactions`.

---

## 1. Mô hình đe dọa (Threat Model)

| Tác nhân | Động cơ | Khả năng |
|---|---|---|
| **Người dùng đã đăng nhập ác ý** | Đọc đơn/PII của người khác, chiếm ví | Gọi trực tiếp Data API bằng access token của mình |
| **Kẻ tấn công ngoài (chưa đăng nhập)** | Chiếm tài khoản, dò email tồn tại | Brute-force login, credential stuffing, phishing |
| **Kẻ tấn công XSS** | Đánh cắp session từ `localStorage` | Chèn script qua input người dùng |
| **Kẻ tấn công MITM** | Nghe lén token | Chỉ khả thi nếu người dùng dùng HTTP / Wi-Fi giả |

**Tài sản cần bảo vệ:** email, mật khẩu (hash), access token JWT, số điện thoại, địa chỉ nhà, lịch sử đơn hàng, số dư ví.

---

## 2. Kịch bản tấn công đã thử (Attack Scenarios)

### A1 — Đọc đơn hàng của người dùng khác (IDOR qua Data API)
**Mô tả:** Người dùng B đăng nhập, gọi trực tiếp REST endpoint `/rest/v1/orders?select=*` bằng token của mình để cố đọc đơn của A (chứa họ tên, SĐT, địa chỉ).

**Cách thử:**
```bash
curl "$SUPABASE_URL/rest/v1/orders?select=*" \
  -H "apikey: <publishable>" \
  -H "Authorization: Bearer <token_of_B>"
```

**Kết quả:** ✅ Chỉ trả về đơn của B. RLS policy `own orders select USING (auth.uid() = user_id)` chặn thành công.

**Rủi ro:** Thấp — đã kiểm soát bằng RLS.

---

### A2 — Sửa/xoá đơn hàng của người khác
**Mô tả:** Thử `UPDATE`/`DELETE` trên `orders` bằng token thường.

**Kết quả:** ✅ Bảng `orders` **denied UPDATE/DELETE** ở cấp policy — không role `authenticated` nào có quyền. Đơn không thể bị sửa hoặc xoá từ client.

**Rủi ro:** Rất thấp.

---

### A3 — Leo thang đặc quyền qua `wallet_balance` (đã vá)
**Mô tả:** Trước đây policy `own profile update` cho phép cập nhật mọi cột của profile, bao gồm `wallet_balance`. Attacker có thể `PATCH /rest/v1/profiles?id=eq.<self>` với `{wallet_balance: 999999999}` để tự cộng tiền.

**Cách vá:**
- Revoke `UPDATE` toàn cột trên `profiles` với role `authenticated`.
- Chỉ `GRANT UPDATE (full_name, email)`.
- Trigger `protect_wallet_balance` chặn mọi update lên `wallet_balance` không đi qua RPC `topup_wallet` (SECURITY DEFINER).

**Kết quả sau vá:** ✅ PATCH thẳng vào `wallet_balance` trả `permission denied for column`.

**Rủi ro:** Đã đóng.

---

### A4 — Đọc email/PII qua bảng `profiles`
**Mô tả:** Bảng `profiles` có `email`, `full_name`. RLS: `own profile select USING (auth.uid() = id)`. Thử `GET /rest/v1/profiles?select=email` với token bất kỳ.

**Kết quả:** ✅ Chỉ trả về profile của chính mình. Không thể liệt kê email của user khác → không dùng làm nguồn phishing được.

**Rủi ro:** Thấp.

---

### A5 — Dò email tồn tại (User Enumeration)
**Mô tả:** Attacker gọi `signUp` với email X. Nếu Supabase trả lỗi "User already registered" → biết X có tài khoản. Tương tự với `resetPasswordForEmail`.

**Trạng thái:** ⚠️ Supabase mặc định trả cùng response cho email tồn tại và không tồn tại ở `resetPasswordForEmail`, nhưng `signUp` có thể lộ. Login response cũng phân biệt "invalid credentials" vs "email not confirmed".

**Rủi ro chấp nhận (Accepted Risk):** Trung bình — thuộc hành vi mặc định của Supabase Auth. Giảm nhẹ bằng rate-limit và không hiển thị chi tiết lỗi ở UI (đã dùng `toast.error(error.message)` — nên map lại thành thông báo chung).

**Khuyến nghị:** Trong `handleLogin`/`handleSignup` thay `error.message` bằng "Email hoặc mật khẩu không đúng" để không tiết lộ email tồn tại.

---

### A6 — Brute-force / Credential stuffing
**Mô tả:** Thử hàng loạt mật khẩu phổ biến trên endpoint `/auth/v1/token`.

**Biện pháp hiện tại:**
- ✅ **HIBP password check đã bật** → chặn mật khẩu đã lộ trong data breach.
- ✅ **Min length nâng từ 6 → 8** ký tự, bắt buộc chữ + số.
- ✅ Supabase Auth có rate-limit mặc định trên IP.
- ⚠️ Không có CAPTCHA — nếu attacker phân tán IP vẫn có thể chậm rãi thử.

**Rủi ro còn lại:** Thấp–Trung bình. **Khuyến nghị nếu triển khai thật:** bật hCaptcha ở Supabase Auth.

---

### A7 — Đánh cắp session token qua XSS
**Mô tả:** Session Supabase lưu ở `localStorage` (key `sb-<ref>-auth-token`). Nếu có lỗi XSS, attacker `document.body.innerText` sẽ đọc được token và phát lại.

**Bề mặt input trong app:**
- Form đăng ký/đăng nhập → chỉ nộp qua Supabase Auth, không render lại.
- Form checkout: `full_name`, `phone`, `address` → được lưu và **không hiển thị lại cho người khác** (RLS chặn). Attacker không thể "gieo" XSS cho nạn nhân qua trường này.
- Không dùng `dangerouslySetInnerHTML` ở đâu.

**Kết quả:** ✅ Không tìm thấy sink XSS khai thác được trong codebase hiện tại.

**Rủi ro chấp nhận:** Thấp. Chú ý khi thêm tính năng "review" / "comment" hiển thị nội dung user khác — phải sanitize.

---

### A8 — SQL Injection
**Mô tả:** Thử payload `' OR 1=1--` vào các trường form.

**Kết quả:** ✅ Toàn bộ truy vấn đi qua PostgREST + `supabase-js` (parameterized). Không có string concatenation SQL trong code. Trigger/function dùng `plpgsql` với `SET search_path = public` chống search-path hijack.

**Rủi ro:** Rất thấp.

---

### A9 — CSRF vào endpoint đổi mật khẩu / cập nhật profile
**Mô tả:** Attacker dụ nạn nhân click link → gửi POST đổi mật khẩu.

**Kết quả:** ✅ Supabase Auth dùng **Bearer token trong header**, không cookie → CSRF cổ điển không áp dụng. Header `Authorization` không tự động gắn bởi trình duyệt cross-origin.

**Rủi ro:** Rất thấp.

---

### A10 — Reset-password link hijack
**Mô tả:** Link đặt lại mật khẩu chứa recovery token trong URL hash. Nếu người dùng forward email hoặc click link ở máy công cộng, attacker có thể chiếm.

**Trạng thái:** ⚠️ Bản chất của mọi hệ thống email-reset. Đã giảm nhẹ:
- Trang `/reset-password` `noindex` — không lộ ra công cụ tìm kiếm.
- Token có TTL ngắn (mặc định Supabase 1 giờ).
- Yêu cầu mật khẩu mới đạt policy mới (8+, chữ+số, HIBP).

**Rủi ro chấp nhận:** Thấp — trách nhiệm phần lớn ở người dùng.

---

## 3. Rủi ro phải nhận (Accepted Risks)

| Mã | Mô tả | Lý do chấp nhận | Bù đắp |
|---|---|---|---|
| AR-1 | User enumeration mềm qua thông báo lỗi Auth | Hành vi mặc định của Supabase; không có UI hiển thị email của user khác | Rate-limit của Supabase; khuyến nghị làm mờ thông báo lỗi |
| AR-2 | Session lưu ở `localStorage` (không HttpOnly) | Ràng buộc kiến trúc SPA + PostgREST | Chưa có XSS sink; CSP có thể bổ sung sau |
| AR-3 | Không có CAPTCHA/2FA | Ngoài phạm vi bài tập demo | HIBP + password policy + rate-limit mặc định |
| AR-4 | Email reset có thể bị chiếm nếu hộp thư nạn nhân bị lộ | Không nằm trong tầm kiểm soát của app | TTL ngắn, `noindex` |

---

## 4. Chức năng trọng yếu (Critical Functions)

1. **`supabase.auth.signInWithPassword`** — cổng vào tài khoản.
2. **`supabase.auth.updateUser({password})`** — điểm đổi mật khẩu.
3. **RLS policies trên `orders`** — hàng rào duy nhất bảo vệ PII khách hàng.
4. **RLS policies trên `profiles`** — bảo vệ email + tách quyền `wallet_balance`.
5. **RPC `topup_wallet`** — con đường **duy nhất** hợp lệ để thay đổi số dư (kèm trigger chặn ngã khác).
6. **Trigger `handle_new_user`** — tạo profile khi có user mới; nếu hỏng, hệ thống không nhất quán.

---

## 5. Biện pháp đã áp dụng trong turn này

- ✅ Bật **HIBP Password Check** (chặn mật khẩu đã bị lộ).
- ✅ Nâng chính sách mật khẩu client-side: **≥ 8 ký tự, có chữ + số** (thay cho ≥ 6).
- ✅ Cập nhật cả trang đăng ký và trang đặt lại mật khẩu.
- ✅ Giữ nguyên các vá trước: khóa cột `wallet_balance`, trigger `protect_wallet_balance`, revoke UPDATE toàn cột trên `profiles`.

## 6. Khuyến nghị tiếp theo (nếu ngoài phạm vi bài tập)

1. Bật hCaptcha ở Supabase Auth khi lên production.
2. Map thông báo lỗi Auth về "Email hoặc mật khẩu không đúng" để giảm enumeration.
3. Cân nhắc lưu địa chỉ/SĐT vào bảng riêng và mã hoá cột với `pgcrypto` nếu quy mô mở rộng.
4. Thêm Content-Security-Policy header khi phục vụ tĩnh (giảm blast-radius XSS trong tương lai).
5. Bật 2FA (TOTP) cho tài khoản admin (khi có role admin).

---

**Kết luận:** Sau các bản vá, các vector tấn công trực tiếp vào tài khoản và PII khách hàng đã bị chặn ở tầng RLS + Auth policy. Rủi ro còn lại đều là rủi ro nhận có ý thức, phù hợp phạm vi ứng dụng demo.
