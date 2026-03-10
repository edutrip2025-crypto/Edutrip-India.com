# Contact Form Setup - Step-by-Step Guide

## Overview

Your contact form sends submissions to a backend API at `https://api.edutripindia.com/api/contact`. The form is built with plain HTML and JavaScript—no external form service.

---

## Step 1: Form HTML Structure

**Location:** `index.html` (Contact section, ~line 782)

The form has 6 fields:

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| **name** | text | Yes | Visitor's name |
| **email** | email | Yes | Visitor's email |
| **school** | text | No | School/Organization name |
| **phone** | tel | No | Phone number |
| **inquiry_type** | select | Yes | Nature of inquiry (School Enquiry, Investor, Partnership, General) |
| **message** | textarea | Yes | Message content |

```html
<form id="contact-form">
  <input name="name" ... required>
  <input name="email" ... required>
  <input name="school" ...>
  <input name="phone" ...>
  <select name="inquiry_type" ... required>
  <textarea name="message" ... required>
  <button type="submit" class="submit-btn">Send Message</button>
</form>
```

---

## Step 2: Form Submit Handler

**Location:** `index.html` (inline script, ~line 1058)

1. **Event listener** – Listens for `submit` on `#contact-form`
2. **Prevents default** – Stops normal form submission (`e.preventDefault()`)
3. **Collects data** – Reads values from each field and trims whitespace
4. **Builds JSON** – Creates an object with all form fields

---

## Step 3: API Request

**Endpoint:** `https://api.edutripindia.com/api/contact`  
**Method:** `POST`  
**Headers:** `Content-Type: application/json`  
**Body:** JSON with `name`, `email`, `school`, `phone`, `inquiry_type`, `message`

```javascript
fetch("https://api.edutripindia.com/api/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(formData)
});
```

---

## Step 4: User Feedback During Submit

1. **Button state** – Submit button is disabled and shows "Sending..." with a spinner
2. **Loading state** – Button opacity set to 0.7

---

## Step 5: Response Handling

**On success** (`response.ok && data.success`):
1. Success modal is shown (checkmark animation)
2. Form is reset
3. After 2.5 seconds, modal closes and page scrolls to `#home`

**On error**:
- Shows an alert with the error message from the API or a generic message
- Submit button is re-enabled

---

## Step 6: Success Modal

**Location:** `index.html` (~line 884)

- Hidden by default
- Shown when `success-modal` gets class `show`
- Contains a checkmark SVG and "Message Sent Successfully!" text

---

## Data Flow Diagram

```
User fills form → Clicks "Send Message"
       ↓
JavaScript intercepts submit (handleSubmit)
       ↓
Collects: name, email, school, phone, inquiry_type, message
       ↓
POST to https://api.edutripindia.com/api/contact
       ↓
Backend processes (sends email, stores in DB, etc.)
       ↓
Returns JSON: { success: true/false, message: "..." }
       ↓
Success → Show modal, reset form, scroll to home
Error   → Show alert
```

---

## Backend Requirements

Your backend at `api.edutripindia.com` must:

1. Accept `POST` requests at `/api/contact`
2. Expect JSON body with: `name`, `email`, `school`, `phone`, `inquiry_type`, `message`
3. Return JSON: `{ "success": true }` or `{ "success": false, "message": "Error text" }`
4. Set `Content-Type: application/json` in the response

---

## Security (CSP)

The Content Security Policy allows connections to:
- `https://api.edutripindia.com` (for the contact form API)

---

## Summary

| Component | Details |
|-----------|---------|
| **Form** | HTML form with 6 fields |
| **Handler** | JavaScript `handleSubmit` function |
| **API** | `https://api.edutripindia.com/api/contact` |
| **Method** | POST with JSON body |
| **Success** | Modal + form reset + scroll to home |
| **Error** | Alert with message |
