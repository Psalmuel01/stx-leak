# Stacks Counter Starter (Contract + Frontend + Automation Bot)

This repo now contains a full starter stack for your goal:

- **Clarity smart contract** (`contracts/counter.clar`) with:
  - `increment`
  - `decrement`
  - `reset-counter` (interval-gated by block height)
- **Frontend UI** (`frontend/`) with Stacks wallet connect + write interactions
- **Backend bot** (`backend/`) that runs every 10 minutes (configurable) and randomly calls one write function.

## 1) Smart contract

The contract keeps:
- `count` (int)
- `last-reset-height` (uint)
- `RESET_INTERVAL_BLOCKS` default `u100`

`reset-counter` can only be called once enough blocks have passed.

> If you specifically mean a newer Clarity/epoch target than configured in `Clarinet.toml`, update `clarity_version` and `epoch` to match your target chain environment.

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

1. Deploy `contracts/counter.clar` to testnet/mainnet.
2. Put deployed `<address>` + `<contract-name>` in both `.env` files.
3. Start backend bot service (PM2, Docker, or systemd).
4. Start frontend and connect wallet to call functions manually.

## 4) Recommended next steps

- Add Clarinet tests for function behavior and interval gate.
- Add bot guards (skip `decrement` when counter is 0 by querying read-only state first).
- Add observability (structured logs + alerting).
- Add API layer for frontend read-only data caching.

## Open questions for you

1. **Network target**: testnet first or directly mainnet?
2. **Reset policy**: keep block-based interval or use a strict wall-clock cadence driven by backend bot?
3. **Bot authority**: should only your backend wallet call `reset-counter`, or keep all methods permissionless?
4. **Frontend stack preference**: keep lightweight Vite React, or move to Next.js?
5. **Hosting target**: where do you want frontend + backend deployed (Vercel/Fly/Render/AWS)?

Once you answer these, I can tighten this into a production-ready setup (auth strategy, deploy scripts, and CI).
