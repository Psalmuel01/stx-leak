# Stacks Counter Starter (Contract + Frontend + Automation Bot)

This repo contains a full starter stack for a **testnet-first** rollout:

- **Clarity smart contract** (`contracts/counter.clar`) with permissionless:
  - `increment`
  - `decrement`
  - `reset-counter`
- **Frontend UI** (`frontend/`) built with lightweight **Vite + React** and Stacks wallet connect for manual writes.
- **Backend bot** (`backend/`) that runs on a strict wall-clock cadence and randomly calls one write method (`increment`, `decrement`, or `reset-counter`).
- Backend defaults to **testnet** and only switches to mainnet when `STACKS_NETWORK=mainnet`.

## 1) Smart contract behavior

The contract keeps a single `count` (`uint`) and is fully permissionless.

Safety checks included:
- `decrement` returns `ERR_UNDERFLOW` when `count` is already `u0`
- `increment` returns `ERR_OVERFLOW` when `count` is at max `u128`

`reset-counter` is immediate and ungated on-chain so cadence is controlled by the backend scheduler.

## 2) Local setup

```bash
npm install
```

### Backend env

```bash
cp backend/.env.example backend/.env
# fill values
```

Then run:

```bash
npm run -w backend dev
```

### Frontend env

```bash
cp frontend/.env.example frontend/.env
# fill values
```

Then run:

```bash
npm run -w frontend dev
```

## 3) Deployment flow (high-level)

1. Deploy `contracts/counter.clar` to **testnet** first.
2. Put deployed `<address>` + `<contract-name>` in both `.env` files.
3. Start backend bot service with your target cadence (PM2, Docker, systemd, or Render worker).
4. Deploy frontend (Vercel/Render static site) and connect wallet for manual calls.

## 4) Hosting target recommendations

- **Frontend:** Vercel or Render Static Site
- **Backend bot:** Render Background Worker (or another long-running worker platform)

## 5) Production hardening ideas

- Add Clarinet tests for overflow/underflow and reset behavior.
- Add transaction result tracking (poll tx status and log `success` vs contract `err`).
- Add monitoring/alerts for bot failures and stalled cadence.
