# SECRETCODE

SECRETCODE is a web-based multiplayer educational card game inspired by Codenames. It is tailored for Software Engineering courses and reinforces ISO software testing concepts through collaborative play.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Supabase (Postgres + Realtime)
- Deployable to Vercel

## Project Structure

```txt
secretcode/
  src/
    app/
      page.tsx
      create-room/page.tsx
      join-room/page.tsx
      how-to-play/page.tsx
      room/[roomCode]/page.tsx
    components/
      mascot.tsx
      glass-card.tsx
      room-client.tsx
      review-modal.tsx
    data/
      terms.ts
    lib/
      game-engine.ts
      supabase.ts
      types.ts
  supabase/
    schema.sql
```

## 1) Install

```bash
npm install
```

## 2) Supabase Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql` (this includes token-based RLS policies).
3. In project settings, copy:
   - Project URL
   - anon public key

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 3) Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Invite Security Flow

- Host creates room and receives a room link with:
  - room code
  - room token (`rt` query param)
- Joiners must use both room code and room token.
- Supabase requests include `x-room-token` header from the client.
- Row-level security policies only allow room rows matching that room token.

### Server-Validated API Flow

- Client now sends critical actions to trusted Next.js API routes:
  - `POST /api/room/join`
  - `GET /api/room/state`
  - `POST /api/room/team`
  - `POST /api/room/clue-giver`
  - `POST /api/room/start`
  - `POST /api/room/clue`
  - `POST /api/room/reveal`
  - `POST /api/room/end-turn`
- Server validates authority and game rules before updating state:
  - host-only game start
  - only current team can guess/end turn
  - only clue giver can submit clue
  - forbidden card instant-loss
  - score and winner updates are applied server-side
- Clients subscribe to `room_events` realtime channel and then refetch sanitized state from API.
- Guessers receive masked hidden card roles from API responses.

### Rate Limiting and Audit Evidence

- API routes enforce per-room, per-actor rate limits to reduce spam actions.
- Limits are server-side and apply to join, team changes, clue-giver toggle, start, clue, reveal, and end-turn.
- Important actions are written to `room_action_audit` with:
  - action name
  - success/denied status
  - reason/details
  - actor player id
  - actor IP (from forwarded headers)
  - timestamp
- This audit trail is suitable as grading evidence for game flow and rule enforcement attempts.

## 4) Deploy to Vercel

1. Push repository to GitHub.
2. Import the project in Vercel.
3. Set environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy.
5. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only in Vercel environment settings.

## Gameplay Rules Implemented

- Team A vs Team B with clue givers and guessers
- 5x5 card board (25 terms)
- Card roles: Team A, Team B, Neutral, Forbidden
- Turn switching logic
- Forbidden card instant-loss
- Score tracking and winner detection
- Clue history
- Learning feedback modal showing:
  - selected term
  - definition
  - ISO standard
  - why correct/wrong

## Notes for University Submission

- Code is split into reusable components and domain logic modules.
- Educational terms include 100+ software engineering/testing concepts.
- Supabase schema and setup are included for reproducibility with token-based row-level security.
- Database includes server-side rate-limit state and audit logging tables.
- UI uses a purple/lilac mascot style with glassmorphism cards and responsive layouts.
- Reconnect handling is implemented with per-room local session identity so refreshes restore the same player.
