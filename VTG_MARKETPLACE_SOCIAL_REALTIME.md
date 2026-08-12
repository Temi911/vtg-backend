# VTG Marketplace, Social Feed & Realtime Collaboration

This document defines the next product layer for VTG: supplier storefronts, buyer discovery, public trade feed, realtime messaging, three-party video meetings, support, and country-aware visual content.

## 1. Supplier storefronts

Every approved supplier can create a public storefront under a stable slug, for example:

`/supplier/guangzhou-xyz-motors`

A storefront contains:
- company name, logo, cover image and company description
- registration/verification status
- country, city and business location
- products and catalogue categories
- product images and videos
- company gallery and advert media
- official website and external company links
- contact options
- enquiry button
- live chat button
- video meeting button
- ratings/reviews after completed transactions

The database foundation is `storefronts`, `product_media`, `company_media` and `storefront_links`.

## 2. Marketplace discovery

Buyer search should use product intent, country, category, HS code, supplier verification, price range, MOQ and location. Search results can show:

`Product -> Supplier -> Country -> Map -> Landed Cost`

A buyer can open a product, supplier page, map location, or start an enquiry without losing the current search context.

## 3. Social trade feed

The feed is a professional trade network rather than a general social network.

Post types:
- product
- advert
- company update
- trade news
- announcement
- trade tip
- video

Buyers, suppliers and banks can publish according to their role permissions. Users can comment, react and follow accounts. Moderation is required before public publishing for restricted/high-risk categories.

Database foundation: `feed_posts`, `feed_post_media`, `feed_comments`, `feed_reactions`, `user_follows`.

## 4. Realtime chat

Existing conversations/messages are extended for:
- product enquiry context
- order context
- quote discussions
- file/image/video attachments
- reply-to-message
- delivered/read timestamps
- metadata for structured trade actions

The UI should support:
- buyer <-> supplier
- buyer <-> bank
- supplier <-> bank
- buyer <-> supplier <-> bank group conversation

Realtime transport should use WebSocket/SSE infrastructure. Do not poll the database aggressively.

## 5. Live video meetings

`video_call_sessions` stores meeting lifecycle and authorization metadata. Actual audio/video should use WebRTC or a managed realtime/video provider. The backend must issue short-lived room/session credentials and verify that every participant belongs to the conversation/enquiry/order.

Supported meeting pattern:

Buyer + Supplier + Bank

The meeting can be launched from an enquiry or order. A meeting should support screen sharing and in-call chat where the selected provider permits it.

Never store raw room secrets in the database; store only a hash/reference and keep provider secrets in hosting environment variables.

## 6. Support and company enquiries

The public interface should expose:
- About VTG
- Contact/Call Us
- General Enquiry
- Log a Complaint
- Technical Support
- Customs/Shipping Support
- Payment Support
- Supplier Verification issue
- Bank/LC issue

Database foundation: `support_tickets` and `support_ticket_messages`.

Every ticket receives a VTG reference and an audit trail.

## 7. Country-aware visual experience

Page backgrounds are stored in `page_backgrounds` and selected by:

`page_key + detected/selected country + active status`

Examples:
- Nigeria: ports, Lagos trade, customs, vehicles, markets, banking
- China: factories, ports, vehicles, logistics, manufacturing
- Ghana: ports, markets, logistics and trade
- Kenya: ports, logistics, vehicles and regional trade
- UAE: ports, vehicles, finance and logistics

The frontend should rotate a small approved set of images/videos per page using a crossfade/slow-motion effect. It should never interfere with readability or accessibility.

Country detection should be permission-aware. Use the user's selected country/profile country first; only use browser geolocation when the user explicitly grants permission. Do not expose private coordinates.

## 8. Media upload rules

Supplier media uploads must use the configured object-storage layer, not PostgreSQL byte storage. Store only URLs/metadata in PostgreSQL.

Before public publication:
- validate file type
- enforce file size limits
- generate thumbnails
- scan/validate uploads
- strip unsafe metadata where appropriate
- enforce ownership
- allow moderation/takedown

## 9. UX structure

Landing page:
- small news preview visible at the side
- News panel closed by default
- AI bot closed by default
- World Atlas closed by default
- marketplace search and discovery visible
- no mandatory signup to explore public information

Onboarding page:
- Buyer
- Supplier
- Bank/Financial Institution

After login:
- role-specific dashboard
- marketplace
- storefront/feed tools
- enquiries
- chat
- video meetings
- landed-cost tools
- notifications

## 10. Trust model

VTG should distinguish clearly between:
- VTG Verified
- Government/official source verified
- Company supplied information
- User reviews
- AI-generated summary
- Estimated logistics information

Do not present user-supplied company information as independently verified.

## 11. Security and privacy

- Never request passwords, PINs or OTPs from users.
- Keep secrets in hosting environment variables.
- Use role-based authorization on every private endpoint.
- Use signed/short-lived upload URLs.
- Use short-lived video room credentials.
- Add rate limits to chat, uploads, feed posting and enquiries.
- Keep an audit log for moderation, verification, support and financial/trade actions.
- Do not expose private home coordinates on public maps.

## 12. Implementation order

1. Database migration (this release)
2. Supplier storefront API + dashboard
3. Product media upload API
4. Marketplace search/filter API
5. Feed API + moderation
6. Realtime chat service
7. WebRTC/provider video meeting service
8. Support/enquiry API
9. Country-aware media selection
10. Frontend landing page integration
11. Buyer/Supplier/Bank end-to-end tests
12. Production hardening before public production deployment
