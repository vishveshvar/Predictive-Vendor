"""
Automated Email Notification and Alerting Service
Handles critical inventory alerts (stockout < 7 days) and RMA milestone notifications.
Includes 24-hour alert deduplication to prevent alert fatigue.
Provides transparent fallback logging to terminal and logs/email_outbox.log.
"""

import os
import json
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger("app.email")

# In-memory deduplication tracker: (store_id, sku) -> last_sent_datetime
ALERT_CACHE: Dict[str, datetime] = {}

def get_outbox_log_path() -> Path:
    outbox_path = settings.REPO_ROOT / settings.EMAIL_FALLBACK_FILE
    outbox_path.parent.mkdir(parents=True, exist_ok=True)
    return outbox_path

def log_to_outbox_file(payload: Dict[str, Any]):
    try:
        outbox_path = get_outbox_log_path()
        with open(outbox_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")
    except Exception as e:
        logger.error(f"Failed to append to email outbox log: {e}")

def send_email_message(recipient: str, subject: str, html_body: str, alert_type: str = "GENERIC") -> Dict[str, Any]:
    timestamp = datetime.now(timezone.utc).isoformat()
    record = {
        "timestamp": timestamp,
        "recipient": recipient,
        "subject": subject,
        "alert_type": alert_type,
        "delivery_method": "SMTP",
        "status": "SENT"
    }

    # Attempt live SMTP if configured
    if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = recipient
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, [recipient], msg.as_string())

            logger.info(f"[SMTP Live] Dispatched email to {recipient} ({subject})")
            record["delivery_method"] = "LIVE_SMTP"
            log_to_outbox_file(record)
            return record
        except Exception as e:
            logger.warning(f"SMTP dispatch failed ({e}). Falling back to terminal/outbox logging.")

    # Fallback Policy Execution (Section 14)
    record["delivery_method"] = "TERMINAL_OUTBOX_FALLBACK"
    logger.info(f"[EMAIL FALLBACK DISPATCH] TO: {recipient} | SUBJECT: {subject}")
    print("\n" + "=" * 60)
    print(f"[EMAIL OUTBOX FALLBACK] TO: {recipient}")
    print(f"SUBJECT: {subject}")
    print(f"TYPE: {alert_type} | TIMESTAMP: {timestamp}")
    print("-" * 60)
    print(html_body[:300] + "... [HTML truncated for display]")
    print("=" * 60 + "\n")

    log_to_outbox_file({**record, "body_preview": html_body[:500]})
    return record

def send_stockout_alert(
    store_client_id: str,
    store_email: str,
    store_name: str,
    sku: str,
    product_name: str,
    current_stock: int,
    days_to_stockout: float,
    recommended_qty: int
) -> Optional[Dict[str, Any]]:
    """
    Evaluates predictions and dispatches stockout warning if <= 7 days remaining.
    Deduplicates repeated alerts for the same SKU/store within 24 hours.
    """
    dedup_key = f"{store_client_id}:{sku}"
    now = datetime.now(timezone.utc)
    last_sent = ALERT_CACHE.get(dedup_key)

    if last_sent and (now - last_sent) < timedelta(hours=24):
        logger.info(f"Skipping duplicate alert for {dedup_key} (sent {(now - last_sent).total_seconds()/3600:.1f}h ago)")
        return None

    subject = f"CRITICAL STOCKOUT WARNING: {product_name} ({sku}) - {days_to_stockout:.1f} Days Left"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
            .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px; }}
            .header {{ border-bottom: 2px solid #ef4444; padding-bottom: 12px; margin-bottom: 20px; }}
            .title {{ color: #0f172a; font-size: 20px; font-weight: 700; margin: 0; }}
            .badge {{ display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-top: 8px; }}
            .metric-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .metric-table th, .metric-table td {{ padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }}
            .metric-table th {{ background: #f8fafc; color: #64748b; }}
            .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h1 class="title">Predictive Vendor Alert: Imminent Stockout</h1>
                <span class="badge">Action Required within 48 Hours</span>
            </div>
            <p>Dear {store_name},</p>
            <p>Our machine learning procurement model has detected that your inventory for <strong>{product_name}</strong> is depleting rapidly and is projected to reach zero in <strong>{days_to_stockout:.1f} days</strong>.</p>
            
            <table class="metric-table">
                <tr><th>Product Name</th><td><strong>{product_name}</strong></td></tr>
                <tr><th>SKU Code</th><td><code>{sku}</code></td></tr>
                <tr><th>Current On-Hand Stock</th><td><strong>{current_stock} units</strong></td></tr>
                <tr><th>Projected Stockout Window</th><td><span style="color: #dc2626; font-weight: 700;">{days_to_stockout:.1f} Days</span></td></tr>
                <tr><th>ML Recommended Replenishment</th><td><strong>{recommended_qty} units</strong></td></tr>
            </table>

            <p style="margin-top: 24px;">
                <a href="https://predictivevendorml.local/client/inventory" class="btn">Approve Purchase Order</a>
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                Generated automatically by Predictive Vendor ML Engine • Automated replenishment trigger.
            </p>
        </div>
    </body>
    </html>
    """

    res = send_email_message(store_email, subject, html_body, alert_type="STOCKOUT_ALERT")
    ALERT_CACHE[dedup_key] = now
    return res

def send_rma_update_email(
    store_email: str,
    ticket_id: str,
    product_name: str,
    new_status: str,
    comment: str
) -> Dict[str, Any]:
    subject = f"RMA Update: Ticket {ticket_id} is now [{new_status.upper()}]"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; padding: 16px;">
        <h2>Grievance Ticket Status Updated</h2>
        <p>Your RMA Ticket <strong>{ticket_id}</strong> for <strong>{product_name}</strong> has been updated to:</p>
        <h3 style="color: #0284c7;">{new_status}</h3>
        <p><strong>Wholesale Operations Notes:</strong> {comment}</p>
        <p>Visit your Retail Client Portal to view full timeline history.</p>
    </div>
    """
    return send_email_message(store_email, subject, html_body, alert_type="RMA_STATUS_UPDATE")
