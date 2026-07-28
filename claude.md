# Referral Partner Directory Platform - Development Prompt

## Role

You are a Senior Full Stack Engineer and SaaS Architect.

Your responsibility is to design and build a production-ready Referral Partner Directory Platform using:

- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Row Level Security (RLS)

Follow professional software engineering practices.

The application should be scalable, secure, maintainable, and production-ready.

---

# Project Overview

Build a Referral Partner Directory Platform.

The idea:

A business owner (Admin) manages a network of trusted business partners.

Example partners:

- Plumber
- HVAC Company
- Electrician
- Developer
- Painter
- Roofer
- Cleaning Company

Each partner can recommend other partners to their customers.

Example:

A customer contacts an HVAC company and asks:

"Do you know a good plumber?"

The HVAC partner opens their dashboard and shares the generated plumber referral link.

Customer clicks the link.

The system tracks:

HVAC → Customer → Plumber

The customer sees the plumber's profile and contact information.

The plumber remains the main focus, but other services are also promoted.

---

# User Roles

The application has 3 roles.

---

# 1. Admin Role

The Admin owns and manages the entire platform.

Admin capabilities:

## Partner Management

Admin can:

- Create partners
- Edit partners
- Delete partners
- Activate/deactivate partners
- Assign categories
- Upload partner logo
- Add company details

Partner information:

- Company name
- Partner name
- Email
- Phone number
- Website
- Address
- Category
- Description
- Logo
- Social links
- Status

Example:

Company:
ABC Plumbing

Category:
Plumber

Website:
abcplumbing.com

Phone:
+1 xxx xxx xxxx

Address:
New York, USA

---

# Referral Link Generation

Admin can generate unique referral links.

Every partner combination should have a unique referral link.

Example:

HVAC referring Plumber:

domain.com/ref/plumber?ref=hvac

Developer referring Plumber:

domain.com/ref/plumber?ref=developer

The system must know:

- Who shared the link
- Which partner is being recommended
- Which customer clicked

---

# QR Code Generation

Every referral link should have a QR code.

Features:

- Generate QR code
- Preview QR code
- Download QR code
- Share QR code

Example:

HVAC partner can download:

"Recommend Plumber"

QR Code

---

# Analytics Dashboard

Admin dashboard should display:

## Overview Cards

- Total partners
- Active partners
- Total clicks
- Unique clicks
- Total referrals

## Reports

Time filters:

- Today
- Last 7 days
- Last 30 days
- Custom date range

Analytics:

- Top clicked partners
- Lowest clicked partners
- Most active referrers
- Referral conversion statistics

Example:

Partner Clicks

Plumber 245
HVAC 180
Developer 75
Painter 20

---

# Referral Matrix

Admin should see:

Referrer Recommended Partner Clicks

HVAC Plumber 34

Developer Electrician 22

Plumber Developer 15

This shows the referral relationship.

---

# 2. Partner Role

Partners have their own dashboard.

Example:

HVAC company logs in.

Dashboard:

Welcome HVAC Company

Statistics:

Links Shared:
50

Clicks Generated:
120

This Month:
40

---

Partner capabilities:

## View Their Profile

Can see:

- Company information
- Category
- Contact information

---

## Referral Directory

Partners can see all available partners.

Example:

Plumber

Generate Link
Copy Link
Download QR

Developer

Generate Link
Copy Link
Download QR

Electrician

Generate Link
Copy Link
Download QR

---

Important:

Partners cannot create or delete partners.

Only Admin can manage partners.

---

# 3. Customer Role

Customers do not need accounts.

Customer only interacts through referral links.

Example:

Customer receives:

domain.com/ref/plumber?ref=hvac

Customer opens the link.

---

# Customer Landing Page

Design requirements:

The requested partner should be highlighted.

Example:

Customer searched for plumber.

Page:

ABC Plumbing

Trusted Plumbing Service

Phone:
Website:
Address:

CALL NOW
VISIT WEBSITE
GET DIRECTIONS

Other Trusted Services

HVAC Company

Developer

Electrician

Painter

The main requested service must always appear first.

---

# Referral Tracking Logic

Every click should store:

- Referring partner
- Target partner
- Timestamp
- Browser information
- Device information
- IP information (if possible)
- Referral link ID

Example:

Database record:

referrer:
HVAC

target:
Plumber

clicked_at:
2026-07-28 10:30

---

# Duplicate Click Prevention

Important requirement:

Multiple clicks from the same visitor should not inflate analytics.

Example:

Customer clicks:

1st time:
Count = 1

Refresh page 20 times:

Count remains:

1

Implementation suggestion:

Use combination:

- Cookie
- LocalStorage visitor ID
- Referral link ID
- Browser fingerprint
- Time window

Example:

Unique click key:

visitor_id + referral_link_id

---

# Database Design

Create proper Supabase PostgreSQL schema.

Suggested tables:

---

## profiles

Stores authentication users.

Fields:

id
email
role
created_at

Roles:

admin
partner

---

## partners

Stores partner information.

Fields:

id

company_name

partner_name

email

phone

website

address

category_id

description

logo_url

status

created_at

updated_at

---

## categories

Example:

Plumber

HVAC

Developer

Electrician

Fields:

id

name

created_at

---

## referral_links

Stores generated links.

Fields:

id

referrer_partner_id

target_partner_id

slug

qr_code_url

created_at

Example:

HVAC -> Plumber

---

## referral_clicks

Stores analytics.

Fields:

id

referral_link_id

visitor_id

ip_address

device

user_agent

created_at

---

# Security Requirements

Implement:

- Supabase Authentication
- Role based authorization
- Row Level Security policies

Rules:

Admin:

Full access.

Partner:

Can:

- View own profile
- View available referral links
- View own analytics

Cannot:

- Create partners
- Delete partners
- Edit other partners

Customer:

No authentication required.

---

# Frontend Structure

Use:

React + TypeScript

Recommended:

src

/components

/pages

/features

/hooks

/services

/lib

/routes

/types

/utils

---

# UI Requirements

Use:

Tailwind CSS

Design style:

Modern SaaS dashboard.

Requirements:

- Responsive
- Clean cards
- Tables
- Charts
- Filters
- Modal forms
- Loading states
- Empty states

---

# Admin Pages

Create:

/admin/dashboard

/admin/partners

/admin/categories

/admin/analytics

/admin/referral-links

---

# Partner Pages

Create:

/partner/dashboard

/partner/directory

/partner/analytics

---

# Customer Pages

Create:

/ref/:partnerSlug

Example:

/ref/plumber

---

# Charts

Use a React chart library.

Display:

- Daily clicks
- Weekly clicks
- Monthly clicks
- Partner ranking
- Referral flow

---

# Development Requirements

Follow:

- Clean architecture
- Reusable components
- Type safety
- Proper error handling
- Form validation
- Loading states
- Secure database queries

Use:

- React Hook Form
- Zod validation
- TanStack Query
- Supabase client

---

# Deployment

Prepare application for:

Frontend:

- Vercel

Backend:

- Supabase

Environment variables:

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

---

# Development Order

Build in this order:

1. Supabase project setup
2. Database schema
3. Authentication
4. Role management
5. Admin dashboard
6. Partner CRUD
7. Referral link generation
8. QR generation
9. Partner dashboard
10. Customer landing page
11. Click tracking
12. Analytics dashboard
13. UI polishing
14. Deployment

---

# Final Goal

Create a complete SaaS-style Referral Partner Directory Platform where:

Admin manages partners.

Partners share referral links.

Customers discover trusted businesses.

Every referral is tracked.

Analytics show the complete referral network.
