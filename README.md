# n8n-nodes-emboss

An [n8n](https://n8n.io) community node for [Emboss](https://getemboss.ai) — turn flat PDFs into fillable forms and fill them from context.

## Operations
- **Create Fillable Form** — a flat PDF in, a fillable PDF out.
- **Fill From PDF + Context** — a PDF plus context (text or a file), the filled PDF out.
- **Fill Existing Form** — fill a form you already created in Emboss, by ID.

## Credentials
An Emboss API key (`Authorization: Bearer`). Create one at https://getemboss.ai/dashboard, then add it as an **Emboss API** credential in n8n.

## Installation
Settings → Community Nodes → Install `n8n-nodes-emboss`.

## How it works

Every operation takes a PDF (and, for the fill operations, some context), runs the job on
Emboss, **waits for it to finish**, and returns the resulting PDF on the node's **binary
output** (property `data`) alongside a small JSON summary. Wire the binary output straight
into a **Write Binary File**, **Google Drive**, **email**, or any node that accepts a file.

The input PDF is read from a **binary property** of the incoming item (default `data`), so
put a node that produces a PDF — e.g. **HTTP Request** (download), **Read Binary File**, or
a Google Drive download — immediately before the Emboss node.

## Usage examples

### Example 1 — Fill a form from context (most common)

**Operation:** `Fill From PDF + Context`

**Configure:**
- **Input PDF Field:** `data` (the binary property holding your flat PDF)
- **Context (Text):** the information to fill in, in plain language, e.g.
  `Customer is Jane Doe, 412 Oak Street, Fresno CA. Installed a 40-gallon water heater on 2026-06-14. Total $1,240.`
- **Context File Field:** *(optional)* the name of a binary property holding a supporting
  document (PDF, DOCX, CSV, image, or text) — e.g. a work order to read details from.

**Input item:** an item whose binary `data` is the flat PDF (e.g. from a preceding
**Read Binary File** node).

**Output item:**
- `binary.data` — the **filled PDF**, ready to save or send.
- `json`:
  ```json
  {
    "session_id": "a1b2c3d4-…",
    "report": {
      "filled": ["customer_name", "address", "install_date", "amount"],
      "left_blank": ["second_unit_serial"]
    }
  }
  ```
  `report.filled` and `report.left_blank` list the field names Emboss filled and the ones it
  left empty (no matching context), so you can check coverage downstream.

A minimal workflow: **Read Binary File** (the blank form) → **Emboss** (Fill From PDF +
Context) → **Write Binary File** (save the filled PDF).

### Example 2 — Turn a flat PDF into a reusable fillable form

**Operation:** `Create Fillable Form`

**Configure:**
- **Input PDF Field:** `data`

**Output item:**
- `binary.data` — the **fillable PDF** (now has form fields).
- `json`:
  ```json
  { "form_id": "f47ac10b-…", "status": "ready" }
  ```

Keep the returned `form_id` to fill the same form repeatedly with the next operation.

### Example 3 — Fill a form you already created

**Operation:** `Fill Existing Form`

**Configure:**
- **Form:** pick it from the list (the node loads your Emboss forms), or switch to **By ID**
  and paste a `form_id` (e.g. from Example 2).
- **Context (Text)** and/or **Context File Field:** same as Example 1.

**Output item:** same shape as Example 1 — `binary.data` is the filled PDF, `json` carries
the `session_id` and `report`.

## Notes
- Jobs are polled to completion inside the node, so a single execution returns the finished
  PDF — no separate "wait" step needed. Larger forms take longer (typically seconds to ~a
  minute).
- HTTP errors from the Emboss API surface in the n8n UI with their status and response.
  Enable **Continue On Fail** to route failures to the error output instead of stopping the
  workflow.
