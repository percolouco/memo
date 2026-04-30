from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional
import os

from .database import init_db, get_db
from . import scheduler as sched

app = FastAPI(title="Memo")

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

@app.on_event("startup")
def startup():
    init_db()
    sched.start()

@app.on_event("shutdown")
def shutdown():
    sched.stop()

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# --- Memo models ---

class MemoCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    reminder_time: str = "09:00"

class MemoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_time: Optional[str] = None


# --- Memo routes ---

@app.get("/api/memos")
def list_memos(done: Optional[str] = None):
    with get_db() as conn:
        if done == "true":
            rows = conn.execute("SELECT * FROM memos WHERE is_done = 1 ORDER BY done_at DESC").fetchall()
        elif done == "false":
            rows = conn.execute("SELECT * FROM memos WHERE is_done = 0 ORDER BY reminder_time, created_at").fetchall()
        else:
            rows = conn.execute("SELECT * FROM memos ORDER BY is_done, reminder_time, created_at").fetchall()
        return [dict(r) for r in rows]

@app.post("/api/memos", status_code=201)
def create_memo(memo: MemoCreate):
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO memos (title, description, reminder_time) VALUES (?, ?, ?)",
            (memo.title.strip(), memo.description.strip(), memo.reminder_time)
        )
        row = conn.execute("SELECT * FROM memos WHERE id = ?", (cur.lastrowid,)).fetchone()
        return dict(row)

@app.put("/api/memos/{memo_id}")
def update_memo(memo_id: int, memo: MemoUpdate):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM memos WHERE id = ?", (memo_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Memo introuvable")
        fields, values = [], []
        if memo.title is not None:
            fields.append("title = ?"); values.append(memo.title.strip())
        if memo.description is not None:
            fields.append("description = ?"); values.append(memo.description.strip())
        if memo.reminder_time is not None:
            fields.append("reminder_time = ?"); values.append(memo.reminder_time)
        if not fields:
            return dict(row)
        values.append(memo_id)
        conn.execute(f"UPDATE memos SET {', '.join(fields)} WHERE id = ?", values)
        return dict(conn.execute("SELECT * FROM memos WHERE id = ?", (memo_id,)).fetchone())

@app.post("/api/memos/{memo_id}/done")
def mark_done(memo_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM memos WHERE id = ?", (memo_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Memo introuvable")
        conn.execute(
            "UPDATE memos SET is_done = 1, done_at = datetime('now', 'localtime') WHERE id = ?",
            (memo_id,)
        )
        return dict(conn.execute("SELECT * FROM memos WHERE id = ?", (memo_id,)).fetchone())

@app.post("/api/memos/{memo_id}/undone")
def mark_undone(memo_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM memos WHERE id = ?", (memo_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Memo introuvable")
        conn.execute("UPDATE memos SET is_done = 0, done_at = NULL WHERE id = ?", (memo_id,))
        return dict(conn.execute("SELECT * FROM memos WHERE id = ?", (memo_id,)).fetchone())

@app.delete("/api/memos/{memo_id}", status_code=204)
def delete_memo(memo_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM memos WHERE id = ?", (memo_id,))


# --- Settings ---

class SettingsUpdate(BaseModel):
    discord_webhook: Optional[str] = None

@app.get("/api/settings")
def get_settings():
    with get_db() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        return {r["key"]: r["value"] for r in rows}

@app.post("/api/settings")
def update_settings(data: SettingsUpdate):
    with get_db() as conn:
        if data.discord_webhook is not None:
            conn.execute("UPDATE settings SET value = ? WHERE key = 'discord_webhook'", (data.discord_webhook,))
    return {"ok": True}
