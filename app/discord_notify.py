import requests
from .database import get_db

def get_webhook_url() -> str:
    with get_db() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = 'discord_webhook'").fetchone()
        return row["value"] if row else ""

def send_reminder(memo: dict):
    url = get_webhook_url()
    if not url:
        return

    description = memo["description"] or ""
    desc_line = f"\n> {description}" if description else ""

    payload = {
        "embeds": [{
            "title": f"🔔 Rappel : {memo['title']}",
            "description": f"{desc_line}\n📅 Créé le {memo['created_at'][:10]}",
            "color": 0xf59e0b,
            "footer": {"text": "todo.nas.percolouco.com"}
        }]
    }
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception:
        pass
