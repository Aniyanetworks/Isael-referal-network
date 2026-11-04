**Me:**

We are simplifying the current Konexigo MVP.



Our immediate objective is to launch a fully functional, self-service contractor referral networking platform.



\### 1. Preserve the existing application

\- Review the current architecture before making changes.

\- Reuse all working features.

\- Do not rebuild the application unnecessarily.

\- Preserve existing companies, groups, partners, and QR codes.



\### 2. Company Profiles

\- Allow businesses to upload their logos directly from mobile or desktop.

\- Automatically store the logo and generate its URL.

\- Display logos without cropping.

\- Show website, Facebook, Instagram, and LinkedIn links.

\- Fix the Save Contact feature so company logos are included in compatible vCards.

\- Allow businesses to update their information independently.



\### 3. Group Management

\- Allow any registered business to create and manage its own referral groups.

\- Allow a business to belong to multiple groups using one company account.

\- Each group must have a unique URL, QR code, directory, and membership list.

\- Group creators can invite, approve, remove, and manage members.

\- No Konexigo administrator intervention should be required for normal group operations.

\- Apply reasonable anti-spam and abuse limits.



\### 4. Public Directory

\- Customers can access group directories without registration.

\- Directory access must be unlimited, including repeat visits.

\- Display business profiles, categories, logos, websites, and social media.

\- Allow customers to call businesses, visit websites, save contacts, and submit service requests.

\- Ensure all features work on mobile devices.



\### 5. Referral Tracking

\- Record the group and partner responsible for each referral.

\- Send new service requests to the appropriate business.

\- Provide a basic lead inbox for each business.

\- Track directory visits, profile views, contact clicks, and service requests.

\- Protect customer information and enforce company-level permissions.



\### 6. Progressive Web App

\- Audit whether Konexigo already meets PWA requirements.

\- Implement a valid web app manifest and appropriate icons.

\- Configure a service worker with safe caching rules.

\- Support Add to Home Screen on iPhone and Android.

\- Keep QR access available through the browser without requiring installation.

\- Test mobile responsiveness and installation behavior.



\### 7. Future-Ready Architecture

Prepare the database and integration interfaces for future:

\- Stripe subscriptions and billing.

\- Connect, Growth, and Pro AI plans.

\- GoHighLevel OAuth integration.

\- AI follow-up agents.

\- Referral reward credits.



Do not activate or develop those integrations in MVP 1.0.



\### 8. Testing and Delivery

\- Test account creation and login.

\- Test group creation and invitations.

\- Test businesses joining multiple groups.

\- Test repeated QR scans and directory access.

\- Test contact downloads with logos on iPhone and Android.

\- Test social media links and logo display.

\- Test service requests and referral attribution.

\- Verify data isolation and permissions.

\- Test PWA installation on supported devices.



Before making changes, provide:

1\. A technical audit of the current application.

2\. A list of existing features that can be reused.

3\. Missing features and required fixes.

4\. A phased implementation plan.

5\. Estimated development time.

6\. Any technical risks or dependencies.



\*\*Primary goal:\*\* Launch a reliable, mobile-first, self-service referral network that can grow organically without manual group administration.

\-----------------------

this is client doc

puratai bujhaw bangla alphabet e. then client (Before making changes, provide:) e jegulo chaise segulo daw.

baki kichu questions

\- Before making changes, provide:- eta kivabe korba?

\- Company Profiles er beshirvatg to done, but compatible vCards. bolte ki bujhaise?

\- Allow businesses to update their information independently - ekhon o to tai ache, naki?

\- Group Management- eta maybe boro kaj. bortomane ekhane ache only partners. but client Group Management e boltese business \& group er kotha

\- Referral Tracking taw bujhinai

\- Progressive Web App- eta korte ki alada kono technology lagbe naki ekhane ja ja ache tatei cholbe?

\- Future-Ready Architecture - egulo te ki alada backend lagbe, expressjs er? naki ja ja ache, supabase, etei cholbe?







**Claude:**

অংশ ১: ক্লায়েন্টের ডকুমেন্টের সারাংশ

ক্লায়েন্ট আমাদের অ্যাপের জন্য কিছু নাম ব্যবহার করছে। কোনটা কী, আগে মিলিয়ে নাও:



ক্লায়েন্ট যা বলছে	আমাদের অ্যাপে যা

Company / Business	partners টেবিল (প্রতিটা ব্যবসা)

Group	networks টেবিল

Group-এর partner/member	network\_partners (কোন ব্যবসা কোন গ্রুপে আছে)

মূল লক্ষ্য: একটা self-service প্ল্যাটফর্ম। ব্যবসাগুলো নিজেরাই সাইন আপ করবে, নিজেরাই গ্রুপ বানাবে আর চালাবে। Konexigo অ্যাডমিনকে রোজকার কাজে হাত দিতে হবে না।



১. বর্তমান অ্যাপ রেখে দাও: যা কাজ করছে সেটাই আবার ব্যবহার করো, নতুন করে বানিও না। এখনকার কোম্পানি, গ্রুপ, partner আর QR code নষ্ট করা যাবে না। মানে পুরনো /ref/... লিংক আর ছাপানো QR কাজ করতেই হবে।



২. Company Profile:



ব্যবসা মোবাইল বা ডেস্কটপ থেকে নিজের লোগো আপলোড করবে।

লোগো কাটা (crop) হবে না, পুরোটা দেখাবে।

Website, Facebook, Instagram আর LinkedIn দেখাবে।

Save Contact করলে ফোনের কন্টাক্টে লোগোও যাবে।

ব্যবসা নিজের তথ্য নিজেই আপডেট করবে।

৩. Group Management:



যেকোনো রেজিস্টার্ড ব্যবসা নিজের গ্রুপ বানাবে।

এক অ্যাকাউন্ট দিয়েই একাধিক গ্রুপে থাকা যাবে।

প্রতিটা গ্রুপের নিজস্ব URL, QR, ডিরেক্টরি আর মেম্বার লিস্ট থাকবে।

যে গ্রুপ বানিয়েছে সে মেম্বার invite, approve আর remove করবে।

এসবে অ্যাডমিন লাগবে না।

Spam ঠেকাতে কিছু লিমিট থাকবে।

৪. Public Directory:



কাস্টমার রেজিস্ট্রেশন ছাড়াই গ্রুপের ডিরেক্টরি দেখবে, যতবার খুশি।

Call, Website, Save Contact বাটন থাকবে।

Service Request ফর্ম নতুন। কাস্টমার এখান থেকে কাজের অনুরোধ পাঠাবে।

সবকিছু মোবাইলে ঠিকঠাক চলবে।

৫. Referral Tracking:



প্রতিটা রেফারেল কোন গ্রুপ আর কোন partner-এর মাধ্যমে এলো, সেটা সেভ হবে।

Service request সঠিক ব্যবসার কাছে যাবে।

প্রতিটা ব্যবসার একটা lead inbox থাকবে।

এই চারটা জিনিস গোনা হবে: ডিরেক্টরি ভিজিট, প্রোফাইল ভিউ, কন্টাক্ট ক্লিক আর service request।

কাস্টমারের তথ্য সুরক্ষিত থাকবে। প্রতিটা কোম্পানি শুধু নিজের ডেটা দেখবে।

৬. PWA:



ফোনে "Add to Home Screen" করে অ্যাপের মতো ইনস্টল করা যাবে, iPhone আর Android দুটোতেই।

QR স্ক্যান করলে ব্রাউজারেই চলবে, ইনস্টল বাধ্যতামূলক না।

৭. Future-Ready: ভবিষ্যতের এই জিনিসগুলোর জন্য ডাটাবেস আর কোডের কাঠামো প্রস্তুত রাখতে হবে, কিন্তু এখন চালু বা ডেভেলপ করা যাবে না:



Stripe subscription

Connect / Growth / Pro AI প্ল্যান

GoHighLevel

AI follow-up agent

Reward credits

৮. Testing: লিস্টের সবকিছু টেস্ট করতে হবে, বিশেষ করে আসল iPhone আর Android-এ।



শেষ শর্ত: কাজ শুরুর আগে ৬টা জিনিস দিতে হবে। এগুলো অংশ ৩-এ আছে।



অংশ ২: তোমার প্রশ্নগুলোর উত্তর

১. "Before making changes, provide" কীভাবে করব?

এটা কোডের কাজ না, একটা লিখিত রিপোর্ট বা প্রস্তাব। ক্লায়েন্ট সেটা পড়ে approve করবে, তারপর কাজ শুরু হবে। আমি পুরো codebase আর ডাটাবেস migration দেখে অংশ ৩-এ রিপোর্টটা বানিয়ে দিয়েছি। সময়ের হিসাবটা নিজের মতো বদলে পাঠিয়ে দাও।



২. "Compatible vCards" মানে কী?

এখন Save to Phone চাপলে একটা vCard ফাইল (.vcf) ডাউনলোড হয়। তাতে নাম, ফোন, ওয়েবসাইট আর ঠিকানা থাকে, লোগো থাকে না।



ক্লায়েন্ট চায় কন্টাক্ট সেভ করলে ফোনে কোম্পানির লোগো কন্টাক্টের ছবি হিসেবে দেখাক। "Compatible" মানে এমন ফরম্যাট যেটা iPhone Contacts আর Google Contacts দুটোই বোঝে:



কীভাবে: vCard-এর ভিতরে PHOTO ফিল্ডে ছবিটা base64 করে বসাতে হবে।

কেন embed: শুধু URL দিলে iPhone সাধারণত ছবিটা নেয় না।

SVG সমস্যা: SVG চলে না, আর অনেক লোগোই SVG (যেমন dicebear-এর লোগো)। তাই ব্রাউজারে লোগোকে ছোট JPEG বানিয়ে বসাতে হবে।

বাড়তি: সাথে email আর social link যোগ করা যায়।

টেস্ট: iPhone-এ ফাইলটা সরাসরি "Add Contact" স্ক্রিন খোলে নাকি Files-এ চলে যায়, সেটা আসল ফোনে টেস্ট করতে হবে।

৩. "Update their information independently" তো এখনই আছে, না?

না, নেই। আমি কোড চেক করেছি:



/partner/profile পেজটা শুধু দেখার জন্য। কোনো Edit বাটন নেই।

ডাটাবেসে partners টেবিলে লেখার permission (partners\_write policy) শুধু admin-এর। Partner চাইলেও নিজের row বদলাতে পারবে না।

লোগো আপলোড bucket-টাও (গতবার যেটা বানালাম) শুধু admin-এর জন্য।

Signup ফর্মে এখনো "Logo URL" টেক্সট বক্স।

তাই যা লাগবে:



Partner-এর জন্য একটা Edit ফর্ম।

একটা নতুন RLS policy, যাতে partner শুধু নিজের row এডিট করতে পারে। Status আর slug সে বদলাতে পারবে না।

নিজের লোগো আপলোড করার storage permission।

৪. Group Management কি বড় কাজ?

হ্যাঁ, এটাই সবচেয়ে বড় কাজ। তবে শূন্য থেকে না। এগুলো আগে থেকেই আছে:



networks টেবিল, মানে গ্রুপ।

network\_partners, যেটা many-to-many। তাই এক কোম্পানি একাধিক গ্রুপে থাকতে পারে, এটা ইতিমধ্যে চলে।

/network/:slug পাবলিক পেজ।

পার্থক্য হলো, এখন শুধু admin গ্রুপ বানায় আর মেম্বার যোগ করে। "Business" মানে আমাদের partner বা company, আলাদা কিছু না। যা লাগবে:



গ্রুপের তথ্য: গ্রুপের একজন owner (কোন কোম্পানি বানিয়েছে), description আর join mode।

মেম্বারশিপ: প্রতিটা মেম্বারের status (invited / requested / active / removed) আর role (owner / admin / member)।

Invite: একটা invitations টেবিল, লিংক বা ইমেইল দিয়ে invite করার জন্য।

Permission: RLS, যাতে গ্রুপের owner নিজের গ্রুপ নিজেই চালাতে পারে।

নতুন পেজ: Partner portal-এ "My Groups" পেজ। সেখানে গ্রুপ বানানো, invite পাঠানো, অনুরোধ approve করা আর মেম্বার remove করা যাবে।

লিমিট: যেমন এক কোম্পানি সর্বোচ্চ ৫টা গ্রুপ বানাতে পারবে, দিনে ২০টা invite, আর শুধু approved কোম্পানিই গ্রুপ বানাতে পারবে।

৫. Referral Tracking বুঝিয়ে বলো।

এখন /ref/:slug খুললে শুধু "এই partner-এর লিংকে একটা ক্লিক" সেভ হয়, তাও ৭ দিনে একবার। কাস্টমার কোন গ্রুপ থেকে এলো, কার প্রোফাইল দেখল, কল দিল কিনা, এসব কিছুই রাখা হয় না। /network/... পেজে কোনো tracking নেই।



ক্লায়েন্ট যা চায়, একটা উদাহরণে:



HVAC কোম্পানি তার কাস্টমারকে "Austin Home Pros" গ্রুপের QR দিল। কাস্টমার স্ক্যান করল। → ডিরেক্টরি ভিজিট সেভ হবে (গ্রুপ = Austin, রেফার করেছে = HVAC)।

কাস্টমার Plumber-এর প্রোফাইল খুলল। → প্রোফাইল ভিউ সেভ হবে (টার্গেট = Plumber)।

Call, Website বা Save Contact চাপল। → কন্টাক্ট ক্লিক সেভ হবে।

"Request Service" ফর্মে নাম, ফোন আর কী কাজ লাগবে লিখে পাঠাল। → রিকোয়েস্টটা Plumber-এর lead inbox-এ যাবে, সাথে ইমেইল নোটিফিকেশন। রেকর্ড থাকবে যে এটা HVAC আর Austin গ্রুপের মাধ্যমে এসেছে।

Lead inbox মানে partner dashboard-এ একটা পেজ। সেখানে নিজের পাওয়া রিকোয়েস্টগুলো দেখা যাবে আর status বদলানো যাবে (new / contacted / closed)।



Protect customer info মানে:



কাস্টমারের ফোন আর ইমেইল শুধু সেই ব্যবসা দেখবে, যার কাছে রিকোয়েস্ট গেছে।

যে রেফার করেছে (এখানে HVAC) সে শুধু সংখ্যা দেখবে।

অন্য কোম্পানিরা কিছুই দেখবে না।

এগুলো সব RLS দিয়ে করা হবে।

৬. PWA-র জন্য কি আলাদা টেকনোলজি লাগবে?

না। vite-plugin-pwa নামে একটা npm প্যাকেজ (ভিতরে Workbox) দিয়েই manifest আর service worker হয়ে যায়। Vercel-এ কিছু বদলাতে হবে না। যা লাগবে:



আইকন: অ্যাপ আইকন 192, 512, maskable আর apple-touch-icon। Konexigo লোগো থেকেই বানানো যাবে।

Meta tag: index.html-এ কয়েকটা meta tag।

নিরাপদ caching: অ্যাপের JS আর CSS cache হবে, কিন্তু Supabase-এর API আর login রেসপন্স কখনো cache হবে না। নাহলে পুরনো ডেটা বা অন্য ইউজারের ডেটা দেখাতে পারে।

iPhone: iPhone-এ কোনো "Install" বাটন আসে না। Safari-তে Share → Add to Home Screen দিয়ে ইনস্টল করতে হয়, তাই ছোট একটা নির্দেশনা ব্যানার দেখাতে হবে।

Android: Android-এর Chrome নিজেই ইনস্টল করার prompt দেখায়।

৭. Future-Ready-র জন্য কি Express backend লাগবে?

না। MVP-তে কাজটা শুধু ডাটাবেস টেবিল (plans, subscriptions, integrations, reward credits) আর কিছু TypeScript interface বানানো। এগুলো সব Supabase-এই হয়ে যায়।



পরে Stripe বা GoHighLevel আসলেই চালু করলে কিছু server-side কোড লাগবে, কারণ webhook রিসিভ করা, OAuth callback আর secret key ব্রাউজারে রাখা যায় না। সেটার জন্য Supabase Edge Functions যথেষ্ট। এটা Supabase-এরই অংশ, TypeScript দিয়ে লেখা হয়। এমনকি MVP-তে service request-এর ইমেইল পাঠানোও Edge Function দিয়ে হবে। Express লাগতে পারে শুধু যদি ভবিষ্যতে অনেকক্ষণ ধরে চলা কাজ লাগে, যেমন ভারী AI agent।



আরও কিছু জিনিস তোমার জানা দরকার:



Supabase প্ল্যান: প্রজেক্টটা Free plan-এ আছে, আর আগে একবার pause হয়েছিল, মনে আছে? প্রোডাকশনে Pro plan ($25/মাস) লাগবে।

ইমেইল লিমিট: Supabase-এর নিজস্ব ইমেইল সার্ভিস ঘণ্টায় মাত্র কয়েকটা ইমেইল পাঠাতে পারে। Invite আর নোটিফিকেশনের জন্য custom SMTP লাগবে (যেমন Resend), আর ডোমেইনে DNS সেটআপ করতে হবে।

অপ্রয়োজনীয় প্যাকেজ: Redux, redux-persist আর axios প্রায় অব্যবহৃত, শুধু main.tsx-এ লাগানো। আর pages/partner/Directory.tsx কোনো route-এ নেই।

Commit: এই সেশনের সব পরিবর্তন (লোগো আপলোড, social links, website fix, pagination) এখনো commit হয়নি।

অংশ ৩: ক্লায়েন্টের জন্য রিপোর্ট (English)

Konexigo MVP 1.0: Technical Audit \& Implementation Plan



1\. Technical Audit of the Current Application

Stack



Frontend: React 19 + TypeScript (Vite), Tailwind CSS, TanStack Query, React Hook Form + Zod. Hosted on Vercel.

Backend: Supabase (PostgreSQL, Auth, Storage, Row Level Security). There is no separate server, and none is needed for MVP 1.0.

Database changes: made through versioned SQL migrations. All changes so far have been additive, so existing data is safe.

Data model today



Concept	Table	Notes

Company / business	partners	Profile, category, logo, website, social links, status (active / inactive / pending)

User account	profiles	Linked to Supabase Auth; role = admin or partner; one account → one company

Group	networks + network\_partners	Many-to-many, so a company can already belong to multiple groups; public page at /network/:slug

Categories	categories	Admin-managed

Referral tracking	partner\_referral\_clicks	One click per visitor per partner per 7 days, written via a secure database function

Legacy	referral\_links, referral\_clicks	Older pair-based model, kept in place but hidden

Main findings



Groups are admin-only. Only a Konexigo admin can create groups or add members. Groups have no owner, invitations, join requests or membership status.

Companies cannot edit their own profile. The partner profile page is read-only. Database security only allows admins to modify company records and upload logos.

Logos:

Admins can now upload logos to Supabase Storage.

Self-signup still asks for a logo URL.

Logos are displayed with cropping (object-cover) in 15 places.

Save Contact (vCard):

Includes name, phone, website and address.

Does not include the logo, email or social links.

Downloads through the browser, which behaves inconsistently on iPhone.

Tracking is minimal. Only a "link click" per partner is recorded. Group, profile views, contact actions and the referring partner are not captured. Group pages record nothing.

No service requests or lead inbox exist.

Not a PWA. There is no manifest, service worker or app icons.

Signup creates a "pending" company that an admin must approve.

Infrastructure:

The Supabase project is on the Free plan, which pauses after inactivity. This has already caused one outage.

Supabase's built-in email has very low hourly limits, which is not sufficient for invitations or notifications.

Unused code: some unused libraries (Redux, axios) and one unrouted page can be removed.

2\. Existing Features That Can Be Reused

Accounts: Supabase authentication (signup, login, sessions, role-based routing).

Signup: company self-signup with full business details.

Company profiles: profile data model, including category, website and social links.

Logos: admin logo upload to Supabase Storage with automatic public URLs.

Public profile pages:

Call, Visit Website, Get Directions and Save to Phone buttons.

Social media icons, with safe link handling.

Website links work correctly even when entered without https://.

Group pages: group tables and many-to-many membership; public group page with search and partner details.

Links and QR codes: permanent per-company links (/ref/:slug) with QR generation and download. All existing links and printed QR codes will keep working.

Click tracking: duplicate-proof click recording through a secure database function.

Analytics: dashboard and charts, which will be extended for the new events.

Admin tools: partner and category management with search, filters and pagination.

Shared UI: reusable components (tables, modals, pagination, forms, empty and loading states) and a mobile-responsive layout.

3\. Missing Features and Required Fixes

Company Profiles



Self-service profile editing for companies, restricted to their own record.

Logo upload for companies themselves, at signup and when editing, from mobile camera or files.

Display logos uncropped everywhere.

vCard with embedded logo (PHOTO, base64 JPEG), plus email and social links. Verified on iPhone and Android.

Group Management



Group ownership, description and join settings.

Membership status (invited / requested / active / removed) and roles (owner / admin / member).

Invitations by shareable link and by email; join requests with approve/reject.

A "My Groups" area in the company portal: create, edit, invite, approve, remove, view the QR code and the directory.

Anti-abuse limits, enforced in the database:

only approved companies can create groups;

a maximum number of groups per company;

daily invitation and join-request limits.

Assign owners to existing admin-created groups.

Public Directory \& Referral Tracking



Group-aware referral links (group + referring company), while keeping existing links working.

An event log for directory visits, profile views, contact clicks (call / website / directions / save contact / social) and service requests, each attributed to the group and the referring company.

A service request form, protected by rate limiting and spam protection (honeypot + CAPTCHA).

Email notification to the receiving business.

A lead inbox per company, with status tracking.

Permissions:

customer contact details are visible only to the business that received the request;

referrers see counts only.

PWA



Web app manifest and app icons (including maskable and Apple touch icons).

A service worker with safe caching rules:

the app shell is cached;

API, authentication and customer data are never cached.

An Add to Home Screen prompt on Android and a guided instruction banner on iPhone.

QR links continue to work in the browser with no installation required.

Future-Ready Architecture (schema only, not activated)



Database tables: plans (Connect / Growth / Pro AI), subscriptions (Stripe IDs, status), integrations (provider, connection status; credentials stored server-side only), reward\_credits (ledger), and an entitlement check function.

Code interfaces: placeholder interfaces for the billing, CRM (GoHighLevel) and AI follow-up providers.

4\. Phased Implementation Plan

Phase	Scope

0\. Preparation	Database backup, upgrade Supabase to Pro, configure email sending (SMTP and domain DNS), remove unused code

1\. Company Profiles	Self-service editing, logo upload for companies, uncropped logos, vCard with logo

2\. Group Management	Ownership, roles, invitations, join requests, My Groups portal, limits, migration of existing groups

3\. Directory, Tracking \& Leads	Group-attributed links, event tracking, service request form, email notifications, lead inbox, analytics updates

4\. PWA	Manifest, icons, service worker, install experience on iPhone and Android

5\. Future-Ready Foundation	Billing, plan, integration and credit tables plus placeholder interfaces (inactive)

6\. Testing \& Launch	Full test checklist on real iPhone and Android devices, permission and data-isolation tests, production deployment

Each phase is deployed and reviewed before the next one starts. All database changes are additive and preserve existing data, links and QR codes.



5\. Estimated Development Time

Phase	Estimate

0\. Preparation	1 day

1\. Company Profiles	2–3 days

2\. Group Management	5–7 days

3\. Directory, Tracking \& Leads	4–6 days

4\. PWA	1–2 days

5\. Future-Ready Foundation	1–2 days

6\. Testing \& Launch	2–3 days

Total	16–24 working days (about 3.5–5 weeks)

6\. Technical Risks and Dependencies

Dependencies (needed from the client)



Supabase Pro plan (\~$25/month). The Free plan pauses inactive projects, which takes the live site offline.

Email provider. An account with Resend or a similar SMTP service, plus DNS access for the sending domain (SPF/DKIM), for invitations and lead notifications.

Real devices. Access to an iPhone and an Android phone for vCard and PWA testing.

Risks



vCard on iPhone: Safari's handling of downloaded contact files varies by iOS version. We may need to serve the contact file from a server endpoint instead of generating it in the browser.

Logo formats: SVG logos and logos hosted on other websites may not be convertible for the vCard photo. In those cases the contact is saved without a photo.

iPhone PWA limits: iPhone does not support an automatic install prompt, so users must use Share → Add to Home Screen. We will show instructions.

Spam: the public service request form is the main abuse target. CAPTCHA and rate limits mitigate this.

Existing groups: current groups have no owner and must be assigned one during migration.

Decisions needed before Phase 2



Should new companies still require Konexigo approval, or be approved automatically after email verification?

Should groups be invite-only, open to join requests, or configurable per group?

Should service requests go only to the selected business, or also notify the referring business?

Which company should own each existing group?

Should I publish Part 3 as a shareable page you can send the client as a link?





**Me:**

Preserve the existing application

\- Review the current architecture before making changes.

\- Reuse all working features.

\- Do not rebuild the application unnecessarily.

\- Preserve existing companies, groups, partners, and QR codes.

egulo kivabe korba?



প্রতিটা ব্যবসার একটা lead inbox থাকবে। - inbox mane? ekhane ki socket io use korte hobe?



Service Request ফর্ম নতুন। কাস্টমার এখান থেকে কাজের অনুরোধ পাঠাবে। - ei form kar kache jabe? admin nakei business? se ki status change kkorte parbe ba ki korte parbe?

customer er ki alada login signup profile thakbe? karon se form send korle seta ki se pore abar dekhte parbe?









**Claude:**

১. "Preserve the existing application" কীভাবে করব?

চারটা নিয়ম মেনে চলব:



ক) Review আগে, পরিবর্তন পরে

এটা আগের মেসেজের audit-এ করা হয়ে গেছে। প্রতিটা phase শুরুর আগে শুধু সেই অংশের কোড আর টেবিল আবার দেখে নেব।



খ) ডাটাবেসে শুধু যোগ করব, কিছু মুছব বা রিনেম করব না (additive migration)



নতুন টেবিল বানাব, যেমন service\_requests, group\_invitations, referral\_events।

পুরনো টেবিলে নতুন কলাম যোগ করব, default value সহ। যেমন networks-এ owner\_partner\_id, network\_partners-এ status (default 'active')। এতে এখনকার সব মেম্বার আপনাআপনি active থাকবে।

কোনো টেবিল বা কলাম drop বা rename করব না। পুরনো referral\_links আর referral\_clicks টেবিলও যেমন আছে থাকবে।

এখনকার গ্রুপগুলোর owner নেই। migration-এর সময় ক্লায়েন্ট যাকে বলবে তাকে owner বানাব, নাহলে admin-ই owner থাকবে।

গ) পুরনো URL আর QR কখনো ভাঙবে না

QR code-এর ভিতরে আসলে শুধু একটা URL থাকে, যেমন konexigo.com/ref/abc-plumbing। তাই:



/ref/:slug, /network/:slug আর /business/:slug route যেমন আছে থাকবে।

কোম্পানি বা গ্রুপের slug কেউ বদলাতে পারবে না। Self-edit ফর্মেও slug এডিটের অপশন থাকবে না।

নতুন ফিচার লাগলে URL-এর শেষে প্যারামিটার যোগ করব, যেমন /network/austin-pros?ref=abc-plumbing। পুরনো লিংক প্যারামিটার ছাড়াও আগের মতোই কাজ করবে।

ঘ) নিরাপদে deploy করব



প্রতিটা migration চালানোর আগে Supabase ডাটাবেসের backup নেব।

migration আগে একটা আলাদা staging Supabase প্রজেক্টে চালিয়ে টেস্ট করব, তারপর production-এ চালাব।

কাজ হবে আলাদা git branch-এ। Vercel প্রতিটা branch-এর জন্য একটা preview URL বানায়, সেখানে চেক করে তারপর main-এ merge করব।

Deploy-এর পরে এই তিনটা চেক করব:

কয়েকটা পুরনো QR স্ক্যান করে দেখব।

কোম্পানি, গ্রুপ আর মেম্বারের সংখ্যা আগের সমান আছে কিনা মেলাব।

পুরনো analytics ঠিক দেখাচ্ছে কিনা দেখব।

কোডের দিক থেকে: নতুন করে লিখব না, যা আছে সেটাকেই বাড়াব। যেমন PartnerContactCard-এ "Request Service" বাটন যোগ হবে, NetworkEntry পেজে tracking যোগ হবে, আর partner portal-এ নতুন পেজ যোগ হবে। Admin panel যেমন আছে তেমন থাকবে।



২. Lead inbox মানে কী? Socket.io লাগবে?

Inbox মানে শুধু একটা পেজ, partner dashboard-এ "Leads" নামে। সেখানে ওই ব্যবসার কাছে আসা সব service request একটা লিস্ট বা টেবিলে দেখাবে, অনেকটা ইমেইল ইনবক্সের মতো। কোনো chat বা messaging না।



তারিখ	কাস্টমার	ফোন	কী কাজ	কোথা থেকে এলো	Status

২৯ অক্টো	John	512-xxx	AC কাজ করছে না	Austin Home Pros গ্রুপ, রেফার করেছে ABC Plumbing	New

Socket.io লাগবে না। Socket.io চালাতে একটা আলাদা Node সার্ভার লাগে, যেটা আমাদের নেই আর দরকারও নেই। নতুন lead এলে ব্যবসা জানবে এভাবে:



ইমেইল নোটিফিকেশন: এটাই মূল উপায়। নতুন request এলে সাথে সাথে ব্যবসার কাছে ইমেইল যাবে।

পেজ রিফ্রেশ: inbox পেজ খুললে বা ট্যাবে ফিরে এলে TanStack Query নিজেই নতুন ডেটা নিয়ে আসে।

লাইভ আপডেট (ঐচ্ছিক): পেজ খোলা অবস্থায় রিফ্রেশ ছাড়াই নতুন lead দেখাতে চাইলে Supabase Realtime আছে। এটা Supabase-এর নিজস্ব websocket, আলাদা সার্ভার লাগে না। MVP-তে না করলেও চলে।

৩. Service Request ফর্ম কার কাছে যাবে? কী কী করা যাবে?

যাবে: কাস্টমার যে ব্যবসার প্রোফাইল থেকে ফর্ম পাঠাবে, শুধু সেই ব্যবসার কাছে। উদাহরণ: কাস্টমার Plumber-এর প্রোফাইলে "Request Service" চাপল, তাহলে request যাবে শুধু Plumber-এর inbox-এ আর ইমেইলে।



কে কী দেখবে:



কে	কী দেখবে

যে ব্যবসা request পেয়েছে (Plumber)	সবকিছু: কাস্টমারের নাম, ফোন, ইমেইল আর মেসেজ

যে রেফার করেছে (যেমন HVAC)	শুধু সংখ্যা, যেমন "আমার মাধ্যমে এই মাসে ৫টা request গেছে"। কাস্টমারের তথ্য দেখবে না

গ্রুপের owner	গ্রুপের মোট সংখ্যা। কাস্টমারের তথ্য দেখবে না

Konexigo admin	পুরো প্ল্যাটফর্মের সংখ্যা। কাস্টমারের তথ্য admin দেখবে কিনা, সেটা ক্লায়েন্ট ঠিক করবে। আমার পরামর্শ, support-এর জন্য admin দেখতে পারুক

Request পাওয়া ব্যবসা যা করতে পারবে:



Request-এর পুরো ডিটেইল দেখা।

এক ক্লিকে কাস্টমারকে কল বা ইমেইল করা।

Status বদলানো: New → Contacted → Won / Lost, আর ভুয়া request হলে Spam।

চাইলে একটা ছোট নোট রাখা, যেমন "শুক্রবার আসতে বলেছে"।

ফর্ম ব্যবসার নাম আর লিংক থেকে খোলে, তাই কোনো request ভুল ব্যবসার কাছে যাওয়ার সুযোগ কম। তাই MVP-তে অন্য ব্যবসার কাছে forward করার অপশন রাখব না।

Status দিয়ে analytics-ও হবে, যেমন "এই গ্রুপ থেকে কয়টা lead কাজে পরিণত হলো (Won)"।



৪. কাস্টমারের কি আলাদা login, signup বা profile থাকবে?

না। ক্লায়েন্টের ডকে স্পষ্ট লেখা আছে: "Customers can access group directories without registration." তাই কাস্টমারের কোনো account থাকবে না। ফর্মে শুধু নাম, ফোন, ইমেইল (ঐচ্ছিক) আর কী কাজ লাগবে, এটুকু দিয়ে পাঠাবে।



পাঠানোর পরে কাস্টমার কী দেখবে?



সাথে সাথে: স্ক্রিনে একটা confirmation দেখাবে, যেমন "আপনার request ABC Plumbing-এর কাছে পাঠানো হয়েছে, তারা শীঘ্রই যোগাযোগ করবে।"

ইমেইল দিলে: কাস্টমারকে একটা কপি ইমেইল যাবে। তাতে কী পাঠিয়েছে আর ব্যবসার ফোন নম্বর থাকবে। পরে কিছু দেখতে চাইলে এই ইমেইলই তার রেকর্ড।

পরে অ্যাপে দেখা: MVP-তে পারবে না। দরকারও কম, কারণ এরপর ব্যবসা নিজেই কাস্টমারকে ফোন করবে।

ক্লায়েন্ট যদি চায় কাস্টমার পরে status দেখুক, তাহলেও login লাগবে না। Confirmation ইমেইলে একটা গোপন লিংক দেওয়া যাবে, যেমন konexigo.com/request/a8f3..., যেটা খুললে শুধু সেই request-এর status দেখাবে। এটা পরের ফিচার হিসেবে রাখা যায়।



ক্লায়েন্টকে জিজ্ঞেস করে নিশ্চিত হতে হবে:



Admin কি কাস্টমারের তথ্য দেখতে পারবে?

রেফার করা ব্যবসা (HVAC) কি নোটিফিকেশন পাবে যে "তোমার রেফারেল থেকে একটা request এসেছে"? পেলে শুধু সংখ্যা, কাস্টমারের তথ্য না।

কাস্টমার কি পরে নিজের request-এর status দেখতে পারবে, নাকি confirmation ইমেইলই যথেষ্ট?











**Me:**

নতুন পেজ: Partner portal-এ "My Groups" পেজ। সেখানে গ্রুপ বানানো, invite পাঠানো, অনুরোধ approve করা আর মেম্বার remove করা যাবে। - tumi na bolla group mane network, r network to achei, tahole abar my group keno create korteso?



Admin কি কাস্টমারের তথ্য দেখতে পারবে? yes

রেফার করা ব্যবসা (HVAC) কি নোটিফিকেশন পাবে যে "তোমার রেফারেল থেকে একটা request এসেছে"? পেলে শুধু সংখ্যা, কাস্টমারের তথ্য না। - ok

কাস্টমার কি পরে নিজের request-এর status দেখতে পারবে, নাকি confirmation ইমেইলই যথেষ্ট? - confirmation ইমেইলই যথেষ্ট

Before making changes, provide:

1\. A technical audit of the current application.

2\. A list of existing features that can be reused.

3\. Missing features and required fixes.

4\. A phased implementation plan.

5\. Estimated development time.

6\. Any technical risks or dependencies.

অংশ ৩: ক্লায়েন্টের জন্য রিপোর্ট (English) e ki ei 6tai ache?









**Claude:** 

"My Groups" আর "Network" কি একই জিনিস না?

হ্যাঁ, ডাটাবেসে এটা একই টেবিল (networks)। নতুন কিছু বানাচ্ছি না, নামটা শুধু মেন্যুতে গুলিয়ে ফেলেছি, সেটা ঠিক করে দিচ্ছি।



এখন যা আছে (admin side):



/admin/networks — admin-এর জন্য, সব গ্রুপ দেখা আর ম্যানেজ করার পেজ।

এখন partner portal-এ যা আছে:



/partner/network (MyNetworks.tsx) — কিন্তু এটা শুধু দেখার জন্য। পার্টনার এখানে দেখতে পারে সে কোন কোন গ্রুপে আছে, কিন্তু গ্রুপ বানাতে, invite পাঠাতে বা মেম্বার approve করতে পারে না।

তাই "My Groups" বলতে আমি নতুন পেজ বোঝাইনি, বুঝিয়েছি এই existing /partner/network পেজটাকেই আপগ্রেড করা — শুধু-দেখা থেকে পুরোপুরি চালানোর পেজে। একই route, একই পেজ, ক্ষমতা বাড়বে:



এখন	পরে

নিজের গ্রুপগুলোর তালিকা দেখা	তালিকা + নতুন গ্রুপ বানানোর বাটন

—	নিজের বানানো গ্রুপে invite পাঠানো, join request approve/reject করা, মেম্বার remove করা

—	অন্য কারো গ্রুপে join request পাঠানো (যদি সেই গ্রুপ open হয়)

তাহলে কোনো নতুন concept বা টেবিলের নাম তৈরি হচ্ছে না, "group" = "network" একই জিনিস, শুধু existing পেজের ক্ষমতা বাড়ছে।



অংশ ৩-এ কি ৬টাই আছে?

হ্যাঁ, ক্লায়েন্ট যে ৬টা চেয়েছে, সবগুলোই আলাদা heading দিয়ে ছিল:



✅ Technical Audit of the Current Application

✅ Existing Features That Can Be Reused

✅ Missing Features and Required Fixes

✅ Phased Implementation Plan

✅ Estimated Development Time

✅ Technical Risks and Dependencies

এর বাইরে শেষে "Decisions needed before Phase 2" বলে একটা বাড়তি অংশ ছিল, যেটা ক্লায়েন্ট চায়নি, আমি নিজে থেকে জুড়ে দিয়েছিলাম। তুমি এখন ৩টা প্রশ্নের উত্তর দিয়েছ, তাই সেই অংশে ছোট দুইটা আপডেট দরকার:



"Should service requests go only to the selected business, or also notify the referring business?" — এই লাইনটা মুছে ফেলব। এখন উত্তর ঠিক হয়ে গেছে: request শুধু selected business-এর কাছে যাবে, referrer শুধু সংখ্যা notification পাবে।

"Should companies be approved automatically?" — এটাই একমাত্র আসল খোলা প্রশ্ন রয়ে গেছে, ক্লায়েন্টকে জিজ্ঞেস করতে হবে।

Customer-এর status দেখা নিয়ে যে প্রশ্ন ছিল, সেটাও মুছে ফেলব — confirmation email-ই যথেষ্ট, এটা ঠিক হয়ে গেছে।

চাইলে আমি রিপোর্টের এই অংশটা (section 3-এর referral tracking permission লাইন আর section 6-এর শেষের "Decisions needed" অংশ) আপডেট করে আবার পুরো রিপোর্টটা একসাথে দিতে পারি, অথবা Artifact হিসেবে পাবলিশ করে লিংক দিতে পারি যাতে সরাসরি ক্লায়েন্টকে পাঠানো যায়। কোনটা চাও?











