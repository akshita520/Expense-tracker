from flask import Flask, render_template, request, redirect, jsonify, send_file
import sqlite3
from datetime import datetime, timedelta
import json
import os
import io
from werkzeug.utils import secure_filename
import csv
import numpy as np
from sklearn.linear_model import LinearRegression
from dateutil.relativedelta import relativedelta

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'receipts'
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 2MB max file size

# Initialize database
def init_db():
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS expenses
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                 amount REAL NOT NULL,
                 category TEXT NOT NULL,
                 description TEXT,
                 date TEXT NOT NULL,
                 receipt_filename TEXT)''')  # This column already exists in your code
    
    # Create budgets table
    c.execute('''CREATE TABLE IF NOT EXISTS budgets
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                 category TEXT NOT NULL,
                 amount REAL NOT NULL,
                 month TEXT NOT NULL)''')
    
    # Create expense goals table
    c.execute('''CREATE TABLE IF NOT EXISTS goals
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                 target_amount REAL NOT NULL,
                 current_amount REAL DEFAULT 0,
                 deadline TEXT,
                 description TEXT)''')
    
    conn.commit()
    conn.close()

# Create receipts directory if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

init_db()

@app.route('/predictive')
def predictive_analytics():
    return render_template('predictive.html')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add_expense', methods=['POST'])
def add_expense():
    data = request.form
    receipt_filename = None
    
    # Handle file upload if present
    if 'receipt' in request.files:
        file = request.files['receipt']
        if file and file.filename != '':
            filename = secure_filename(file.filename)
            # Add timestamp to make filename unique
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            name, ext = os.path.splitext(filename)
            receipt_filename = f"{name}_{timestamp}{ext}"
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], receipt_filename))
    
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    c.execute("INSERT INTO expenses (amount, category, description, date, receipt_filename) VALUES (?, ?, ?, ?, ?)",
              (data['amount'], data['category'], data['description'], 
               datetime.now().strftime("%Y-%m-%d %H:%M:%S"), receipt_filename))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/get_expenses')
def get_expenses():
    timeframe = request.args.get('timeframe', 'all')
    category_filter = request.args.get('category', '')
    
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    
    query = "SELECT * FROM expenses"
    params = []
    
    # Apply filters
    conditions = []
    if timeframe != 'all':
        if timeframe == 'month':
            start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")
            conditions.append("date >= ?")
            params.append(start_date)
        elif timeframe == 'week':
            start_date = (datetime.now() - timedelta(days=datetime.now().weekday())).strftime("%Y-%m-%d")
            conditions.append("date >= ?")
            params.append(start_date)
    
    if category_filter:
        conditions.append("category = ?")
        params.append(category_filter)
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    
    query += " ORDER BY date DESC"
    
    c.execute(query, params)
    expenses = [{"id": row[0], "amount": row[1], "category": row[2], 
                "description": row[3], "date": row[4], "receipt": row[5]} for row in c.fetchall()]
    conn.close()
    return jsonify(expenses)

@app.route('/delete_expense/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    
    # Get receipt filename before deleting
    c.execute("SELECT receipt_filename FROM expenses WHERE id=?", (expense_id,))
    result = c.fetchone()
    
    if result and result[0]:
        # Delete the receipt file
        try:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], result[0]))
        except:
            pass  # File might not exist
    
    c.execute("DELETE FROM expenses WHERE id=?", (expense_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/get_receipt/<filename>')
def get_receipt(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))

@app.route('/expense_stats')
def expense_stats():
    timeframe = request.args.get('timeframe', 'month')
    
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    
    # Calculate start date based on timeframe
    if timeframe == 'month':
        start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    elif timeframe == 'week':
        start_date = (datetime.now() - timedelta(days=datetime.now().weekday())).strftime("%Y-%m-%d")
    else:  # year
        start_date = datetime.now().replace(month=1, day=1).strftime("%Y-%m-%d")
    
    # Total expenses
    c.execute("SELECT SUM(amount) FROM expenses WHERE date >= ?", (start_date,))
    total = c.fetchone()[0] or 0
    
    # Expenses by category
    c.execute("SELECT category, SUM(amount) FROM expenses WHERE date >= ? GROUP BY category", (start_date,))
    by_category = {row[0]: row[1] for row in c.fetchall()}
    
    # Monthly trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        month_start = (datetime.now().replace(day=1) - timedelta(days=30*i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        c.execute("SELECT SUM(amount) FROM expenses WHERE date BETWEEN ? AND ?", 
                 (month_start.strftime("%Y-%m-%d"), month_end.strftime("%Y-%m-%d")))
        monthly_total = c.fetchone()[0] or 0
        monthly_trend.append({
            "month": month_start.strftime("%b %Y"),
            "amount": monthly_total
        })
    
    conn.close()
    
    return jsonify({
        "total": total,
        "by_category": by_category,
        "monthly_trend": monthly_trend
    })

@app.route('/set_budget', methods=['POST'])
def set_budget():
    data = request.get_json()
    month = datetime.now().strftime("%Y-%m")
    
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    
    # Check if budget already exists for this category and month
    c.execute("SELECT id FROM budgets WHERE category=? AND month=?", (data['category'], month))
    existing = c.fetchone()
    
    if existing:
        c.execute("UPDATE budgets SET amount=? WHERE id=?", (data['amount'], existing[0]))
    else:
        c.execute("INSERT INTO budgets (category, amount, month) VALUES (?, ?, ?)",
                 (data['category'], data['amount'], month))
    
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/get_budgets')
def get_budgets():
    month = datetime.now().strftime("%Y-%m")
    
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    
    c.execute("SELECT category, amount FROM budgets WHERE month=?", (month,))
    budgets = {row[0]: row[1] for row in c.fetchall()}
    
    # Get actual spending for each category this month
    month_start = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    c.execute("SELECT category, SUM(amount) FROM expenses WHERE date >= ? GROUP BY category", (month_start,))
    spending = {row[0]: row[1] or 0 for row in c.fetchall()}
    
    conn.close()
    
    # Combine budget and spending data
    result = []
    for category, budget in budgets.items():
        result.append({
            "category": category,
            "budget": budget,
            "spent": spending.get(category, 0),
            "remaining": budget - spending.get(category, 0)
        })
    
    return jsonify(result)

@app.route('/export_expenses')
def export_expenses():
    timeframe = request.args.get('timeframe', 'all')
    
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    
    query = "SELECT date, amount, category, description FROM expenses"
    params = []
    
    # Apply timeframe filter
    if timeframe != 'all':
        if timeframe == 'month':
            start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")
            query += " WHERE date >= ?"
            params.append(start_date)
        elif timeframe == 'week':
            start_date = (datetime.now() - timedelta(days=datetime.now().weekday())).strftime("%Y-%m-%d")
            query += " WHERE date >= ?"
            params.append(start_date)
    
    query += " ORDER BY date DESC"
    c.execute(query, params)
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Amount (₹)', 'Category', 'Description'])
    
    for row in c.fetchall():
        writer.writerow(row)
    
    conn.close()
    
    # Prepare response
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'expenses_{datetime.now().strftime("%Y%m%d")}.csv'
    )

# New endpoint for predictive analytics
@app.route('/predict_expenses')
def predict_expenses():
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    
    # Get monthly data for the last 12 months
    monthly_data = []
    for i in range(11, -1, -1):
        month_start = (datetime.now().replace(day=1) - relativedelta(months=i))
        month_end = (month_start + relativedelta(months=1)) - timedelta(days=1)
        
        c.execute("SELECT SUM(amount) FROM expenses WHERE date BETWEEN ? AND ?", 
                 (month_start.strftime("%Y-%m-%d"), month_end.strftime("%Y-%m-%d")))
        monthly_total = c.fetchone()[0] or 0
        monthly_data.append({
            "month": month_start.strftime("%Y-%m"),
            "amount": monthly_total
        })
    
    # Prepare data for prediction
    X = np.array(range(len(monthly_data))).reshape(-1, 1)
    y = np.array([item['amount'] for item in monthly_data])
    
    # Train linear regression model
    model = LinearRegression()
    model.fit(X, y)
    
    # Predict next 3 months
    future_months = 3
    future_X = np.array(range(len(monthly_data), len(monthly_data) + future_months)).reshape(-1, 1)
    predictions = model.predict(future_X)
    
    # Generate month labels for predictions
    prediction_months = []
    for i in range(1, future_months + 1):
        next_month = datetime.now().replace(day=1) + relativedelta(months=i)
        prediction_months.append(next_month.strftime("%b %Y"))
    
    conn.close()
    
    return jsonify({
        "historical": monthly_data,
        "predictions": [{"month": month, "amount": float(amount)} for month, amount in zip(prediction_months, predictions)]
    })

if __name__ == '__main__':
    app.run(debug=True)