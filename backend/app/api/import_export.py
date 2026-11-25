import io
import csv
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Response
from typing import Optional, Dict, Any
from backend.app.services.excel_importer import parse_and_validate_import_file
from backend.app.core.database import get_db_connection

router = APIRouter(prefix="/data", tags=["Import & Export Engine"])

@router.post("/import-invoices")
async def import_invoices(
    file: UploadFile = File(...),
    commit: bool = Query(False),
    business_id: Optional[str] = Query(None)
):
    if not business_id:
        business_id = "biz-apex-001"

    file_bytes = await file.read()
    result = parse_and_validate_import_file(
        file_bytes=file_bytes,
        file_name=file.filename or "import.csv",
        business_id=business_id,
        commit=commit
    )
    return result

@router.get("/export-invoices")
def export_invoices_csv(business_id: Optional[str] = Query(None)):
    if not business_id:
        business_id = "biz-apex-001"

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        i.invoice_number,
        c.company_name,
        c.contact_person,
        c.phone,
        i.issue_date,
        i.due_date,
        i.total_amount,
        i.paid_amount,
        i.remaining_amount,
        i.status,
        i.description
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.business_id = ?
    ORDER BY i.due_date ASC
    """, (business_id,))
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Invoice Number", "Customer Name", "Contact Person", "Phone",
        "Issue Date", "Due Date", "Total Amount (INR)", "Paid Amount (INR)",
        "Remaining Balance (INR)", "Status", "Description"
    ])

    for r in rows:
        writer.writerow([
            r["invoice_number"], r["company_name"], r["contact_person"], r["phone"],
            r["issue_date"], r["due_date"], r["total_amount"], r["paid_amount"],
            r["remaining_amount"], r["status"], r["description"]
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=invoices_export.csv"}
    )

@router.get("/export-customers")
def export_customers_csv(business_id: Optional[str] = Query(None)):
    if not business_id:
        business_id = "biz-apex-001"

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        c.company_name,
        c.contact_person,
        c.email,
        c.phone,
        c.whatsapp_number,
        c.city,
        c.state,
        c.gstin,
        c.credit_limit,
        c.payment_terms_days,
        COALESCE(SUM(i.remaining_amount), 0) as total_outstanding
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id
    WHERE c.business_id = ?
    GROUP BY c.id
    ORDER BY total_outstanding DESC
    """, (business_id,))
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Company Name", "Contact Person", "Email", "Phone", "WhatsApp Number",
        "City", "State", "GSTIN", "Credit Limit (INR)", "Payment Terms (Days)",
        "Total Outstanding (INR)"
    ])

    for r in rows:
        writer.writerow([
            r["company_name"], r["contact_person"], r["email"], r["phone"],
            r["whatsapp_number"], r["city"], r["state"], r["gstin"],
            r["credit_limit"], r["payment_terms_days"], r["total_outstanding"]
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=customers_export.csv"}
    )
