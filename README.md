# Affiliate Payout & Reconciliation Management System

A complete implementation of the **SDE Intern Assignment** for designing a scalable **User Payout Management System**. The system manages affiliate sales, advance payouts, reconciliation-driven final payouts, wallet management, withdrawal processing, and failed payout recovery using an asynchronous architecture.

> **📄 Detailed Documentation:**
> Please refer to the attached **Low-Level Design (LLD) PDF** for the complete system design, database schema, class diagrams, sequence diagrams, state machines, API documentation, edge cases, and design decisions.

---

## Features

* Advance payout (10% of eligible pending sales)
* Sale reconciliation (Approved / Rejected)
* Final payout calculation
* Automatic clawback for rejected sales
* Wallet management with transaction ledger
* 24-hour withdrawal cooldown
* Failed/Cancelled/Rejected payout recovery
* RabbitMQ-based asynchronous withdrawal settlement
* RESTful APIs
* Interactive React dashboard

---

## Repository Structure

```
.
├── payout-management-system/    # Express.js Backend
├── payout-ui/                   # React + Vite Frontend
├── README.md
└── docs/
    └── User_Payout_Management_System_LLD.pdf
```

---

## Git Branch Strategy

The project follows a simple multi-environment Git workflow.

| Branch    | Purpose                                |
| --------- | -------------------------------------- |
| **main**  | Stable production-ready implementation |
| **dev**   | Active development branch              |
| **qc**    | Quality Control and testing            |
| **stage** | Pre-production staging branch          |

Development Flow:

```
dev
 ↓
qc
 ↓
stage
 ↓
main
```

---

## Technology Stack

### Backend

* Node.js
* Express.js
* SQLite
* RabbitMQ

### Frontend

* React
* Vite

### Testing

* Jest

### Documentation

* Mermaid
* Markdown

---

## High-Level Architecture

```text
React UI
     │
REST APIs
     │
Express Backend
     │
Repository → Service Layer
     │
SQLite Database
     │
RabbitMQ
     │
Settlement Worker
```

---

## Key Modules

* Sales Management
* Advance Payout Engine
* Reconciliation Engine
* Wallet Service
* Withdrawal Service
* Payout Recovery Service
* Transaction Ledger
* RabbitMQ Settlement Worker

---

## Running the Project

### Install Dependencies

Backend

```bash
cd payout-management-system
npm install
```

Frontend

```bash
cd payout-ui
npm install
```

### Start Backend

```bash
cd payout-management-system
npm start
```

Runs on:

```
http://localhost:3000
```

### Start Frontend

```bash
cd payout-ui
npm run dev
```

Runs on:

```
http://localhost:5173
```

### Run Tests

```bash
cd payout-management-system
npm test
```

---

## Project Highlights

* Layered Repository-Service Architecture
* Transaction-safe wallet updates
* Idempotent advance payout processing
* Append-only financial transaction ledger
* RabbitMQ asynchronous settlement workflow
* Automatic failed payout recovery
* 24-hour withdrawal cooldown
* Production-style Git workflow

---

## Documentation

The complete project documentation is available in the accompanying **Low-Level Design (LLD) PDF**, which includes:

* Low-Level Design (LLD)
* System Architecture
* Database Schema
* Class Design
* Sequence Diagrams
* State Machines
* API Documentation
* Edge Cases & Failure Handling
* Design Decisions & Trade-offs

---

## Future Improvements

* JWT Authentication
* PostgreSQL support
* Redis caching
* Docker & Kubernetes deployment
* Background Cron Scheduler
* Payment Gateway Integration
* Multi-user support
* Admin Analytics Dashboard

---

## License

Developed as part of the **SDE Intern Assignment** demonstrating backend system design, asynchronous processing, financial transaction management, and REST API development.
