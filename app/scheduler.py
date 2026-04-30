from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from .database import get_db
from .discord_notify import send_reminder

scheduler = BackgroundScheduler(timezone="Europe/Paris")

def check_reminders():
    now = datetime.now().strftime("%H:%M")
    with get_db() as conn:
        memos = conn.execute(
            "SELECT * FROM memos WHERE is_done = 0 AND reminder_time = ?",
            (now,)
        ).fetchall()
        for memo in memos:
            send_reminder(dict(memo))

def start():
    scheduler.add_job(check_reminders, CronTrigger(minute="*"), id="check_reminders", replace_existing=True)
    scheduler.start()

def stop():
    scheduler.shutdown()
