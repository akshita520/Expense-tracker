document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    window.categoryChart = initCategoryChart();
    window.trendChart = initTrendChart();
    window.predictionChart = initPredictionChart();
    
    // Load data when page loads
    loadExpenses();
    loadStats();
    loadBudgets();
    loadPredictions();
    
    // Handle form submission
    document.getElementById('expenseForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const amount = document.getElementById('amount').value;
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        const receipt = document.getElementById('receipt').files[0];
        
        const formData = new FormData();
        formData.append('amount', amount);
        formData.append('category', category);
        formData.append('description', description);
        if (receipt) {
            formData.append('receipt', receipt);
        }
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Adding...';
        submitBtn.classList.add('loading');
        
        fetch('/add_expense', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear form
                document.getElementById('expenseForm').reset();
                // Reload data
                loadExpenses();
                loadStats();
                loadBudgets();
                loadPredictions();
            }
        })
        .finally(() => {
            submitBtn.textContent = originalText;
            submitBtn.classList.remove('loading');
        });
    });
    
    // Filter event listeners
    document.getElementById('timeframeFilter').addEventListener('change', function() {
        loadExpenses();
        loadStats();
    });
    
    document.getElementById('categoryFilter').addEventListener('change', function() {
        loadExpenses();
    });
    
    // Budget modal handling
    const budgetModal = document.getElementById('budgetModal');
    const addBudgetBtn = document.getElementById('addBudgetBtn');
    const closeBtns = document.querySelectorAll('.close');
    
    addBudgetBtn.addEventListener('click', function() {
        budgetModal.style.display = 'block';
    });
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            budgetModal.style.display = 'none';
            document.getElementById('receiptModal').style.display = 'none';
        });
    });
    
    // Budget form submission
    document.getElementById('budgetForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const category = document.getElementById('budgetCategory').value;
        const amount = document.getElementById('budgetAmount').value;
        
        fetch('/set_budget', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category: category,
                amount: amount
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                budgetModal.style.display = 'none';
                document.getElementById('budgetForm').reset();
                loadBudgets();
            }
        });
    });
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', function() {
        const timeframe = document.getElementById('timeframeFilter').value;
        window.location.href = `/export_expenses?timeframe=${timeframe}`;
    });
    
    // Reports button
    document.getElementById('viewReportsBtn').addEventListener('click', function() {
        document.querySelector('.charts-section').scrollIntoView({ behavior: 'smooth' });
    });
    
    // Predictive analytics button
    document.getElementById('predictiveBtn').addEventListener('click', function() {
        document.querySelector('.predictive-section').scrollIntoView({ behavior: 'smooth' });
    });
});

function initCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#3498db', '#2ecc71', '#e74c3c', '#f39c12', 
                    '#9b59b6', '#1abc9c', '#34495e', '#e67e22',
                    '#2980b9', '#27ae60', '#d35400', '#8e44ad',
                    '#16a085', '#c0392b', '#f1c40f'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `₹${context.raw.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

function initTrendChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Monthly Spending (₹)',
                data: [],
                borderColor: '#3498db',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                pointBackgroundColor: '#3498db',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function initPredictionChart() {
    const ctx = document.getElementById('predictionChart').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Historical Data',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.1,
                    pointBackgroundColor: '#3498db',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                },
                {
                    label: 'Predictions',
                    data: [],
                    borderColor: '#9b59b6',
                    borderDash: [5, 5],
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    fill: true,
                    tension: 0.1,
                    pointBackgroundColor: '#9b59b6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            }
        }
    });
}

function loadExpenses() {
    const timeframe = document.getElementById('timeframeFilter').value;
    const category = document.getElementById('categoryFilter').value;
    
    fetch(`/get_expenses?timeframe=${timeframe}&category=${category}`)
        .then(response => response.json())
        .then(expenses => {
            const tableBody = document.querySelector('#expensesTable tbody');
            tableBody.innerHTML = '';
            
            if (expenses.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="6" class="no-data">No expenses found</td>`;
                tableBody.appendChild(row);
                return;
            }
            
            expenses.forEach(expense => {
        const row = document.createElement('tr');
        
        const receiptCell = expense.receipt 
            ? `<td><button class="view-receipt-btn" data-receipt="${expense.receipt}">View Receipt</button></td>`
            : '<td>-</td>';
        
        row.innerHTML = `
            <td>${formatDate(expense.date)}</td>
            <td>₹${parseFloat(expense.amount).toFixed(2)}</td>  <!-- Amount in second column -->
            <td><span class="category-badge">${expense.category}</span></td>
            <td>${expense.description || '-'}</td>
            ${receiptCell}
            <td><button class="delete-btn" data-id="${expense.id}">Delete</button></td>
        `;
        
        tableBody.appendChild(row);
    });
            
            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const expenseId = this.getAttribute('data-id');
                    deleteExpense(expenseId);
                });
            });
            
            // Add event listeners to receipt buttons
            document.querySelectorAll('.view-receipt-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const receiptFilename = this.getAttribute('data-receipt');
                    viewReceipt(receiptFilename);
                });
            });
        });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function loadStats() {
    const timeframe = document.getElementById('timeframeFilter').value;
    
    fetch(`/expense_stats?timeframe=${timeframe}`)
        .then(response => response.json())
        .then(stats => {
            // Update dashboard cards
            document.getElementById('monthlyTotal').textContent = `₹${stats.total.toFixed(2)}`;
            
            // Find top category
            let topCategory = '';
            let topAmount = 0;
            for (const [category, amount] of Object.entries(stats.by_category)) {
                if (amount > topAmount) {
                    topAmount = amount;
                    topCategory = category;
                }
            }
            
            document.getElementById('topCategory').textContent = topCategory || '--';
            document.getElementById('topCategoryAmount').textContent = `₹${topAmount.toFixed(2)}`;
            
            // Calculate weekly average
            const weeklyAverage = timeframe === 'month' ? stats.total / 4.33 : stats.total;
            document.getElementById('weeklyAverage').textContent = `₹${weeklyAverage.toFixed(2)}`;
            
            // Update charts
            updateCategoryChart(stats.by_category);
            updateTrendChart(stats.monthly_trend);
        });
}

function loadBudgets() {
    fetch('/get_budgets')
        .then(response => response.json())
        .then(budgets => {
            const container = document.getElementById('budgetsContainer');
            container.innerHTML = '';
            
            if (budgets.length === 0) {
                container.innerHTML = '<p class="no-budgets">No budgets set for this month</p>';
                return;
            }
            
            budgets.forEach(budget => {
                const progress = Math.min(100, (budget.spent / budget.budget) * 100);
                const progressBar = document.createElement('div');
                progressBar.className = 'budget-item';
                
                // Add status class based on budget utilization
                let statusClass = '';
                if (progress > 100) {
                    statusClass = 'status-over-budget';
                } else if (progress > 80) {
                    statusClass = 'status-near-budget';
                } else {
                    statusClass = 'status-under-budget';
                }
                
                progressBar.innerHTML = `
                    <div class="budget-header">
                        <span class="budget-category">${budget.category}</span>
                        <span class="budget-amount">₹${budget.spent.toFixed(2)} / ₹${budget.budget.toFixed(2)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%; 
                            background-color: ${progress > 100 ? '#e74c3c' : (progress > 80 ? '#f39c12' : '#2ecc71')}"></div>
                    </div>
                    <div class="budget-remaining ${statusClass}">₹${Math.abs(budget.remaining).toFixed(2)} ${budget.remaining >= 0 ? 'remaining' : 'over budget'}</div>
                `;
                
                container.appendChild(progressBar);
            });
        });
}

function loadPredictions() {
    fetch('/predict_expenses')
        .then(response => response.json())
        .then(data => {
            updatePredictionChart(data);
            updatePredictionSummary(data);
            generateInsights(data);
        });
}

function updateCategoryChart(categoryData) {
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    
    window.categoryChart.data.labels = labels;
    window.categoryChart.data.datasets[0].data = data;
    window.categoryChart.update();
}

function updateTrendChart(trendData) {
    const labels = trendData.map(item => item.month);
    const data = trendData.map(item => item.amount);
    
    window.trendChart.data.labels = labels;
    window.trendChart.data.datasets[0].data = data;
    window.trendChart.update();
}

function updatePredictionChart(data) {
    const historicalLabels = data.historical.map(item => {
        const date = new Date(item.month + '-01');
        return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    });
    
    const historicalData = data.historical.map(item => item.amount);
    
    const predictionLabels = data.predictions.map(item => item.month);
    const predictionData = data.predictions.map(item => item.amount);
    
    // Combine historical and prediction labels
    const allLabels = [...historicalLabels, ...predictionLabels];
    
    // For the historical dataset, we need to have null values for the prediction part
    const historicalDataWithNulls = [...historicalData, ...Array(predictionData.length).fill(null)];
    
    // For the prediction dataset, we need to have null values for the historical part
    const predictionDataWithNulls = [...Array(historicalData.length).fill(null), ...predictionData];
    
    window.predictionChart.data.labels = allLabels;
    window.predictionChart.data.datasets[0].data = historicalDataWithNulls;
    window.predictionChart.data.datasets[1].data = predictionDataWithNulls;
    window.predictionChart.update();
}

function updatePredictionSummary(data) {
    const nextMonthPrediction = data.predictions[0].amount;
    const historicalAvg = data.historical.reduce((sum, item) => sum + item.amount, 0) / data.historical.length;
    
    document.getElementById('nextMonthPrediction').textContent = `₹${nextMonthPrediction.toFixed(2)}`;
    
    const trendElement = document.getElementById('predictionTrend');
    if (nextMonthPrediction > historicalAvg * 1.1) {
        trendElement.textContent = '↑ Higher than average';
        trendElement.style.color = '#e74c3c';
    } else if (nextMonthPrediction < historicalAvg * 0.9) {
        trendElement.textContent = '↓ Lower than average';
        trendElement.style.color = '#27ae60';
    } else {
        trendElement.textContent = '→ Similar to average';
        trendElement.style.color = '#7f8c8d';
    }
    
    const summaryElement = document.getElementById('predictionSummary');
    summaryElement.innerHTML = `
        <p><strong>Next Month Forecast:</strong> ₹${nextMonthPrediction.toFixed(2)}</p>
        <p><strong>3-Month Outlook:</strong> ₹${data.predictions.map(p => p.amount.toFixed(2)).join(' → ')}</p>
        <p><strong>Historical Average:</strong> ₹${historicalAvg.toFixed(2)}</p>
    `;
}

function generateInsights(data) {
    const insightsElement = document.getElementById('aiInsights');
    const historicalData = data.historical.filter(item => item.amount > 0);
    
    if (historicalData.length < 3) {
        insightsElement.innerHTML = `
            <p>📊 <strong>Collect more data</strong> to generate personalized insights. 
            We need at least 3 months of spending history to provide accurate predictions.</p>
        `;
        return;
    }
    
    // Calculate trends
    const lastThreeMonths = historicalData.slice(-3);
    const trend = lastThreeMonths[2].amount - lastThreeMonths[0].amount;
    const trendPercentage = (trend / lastThreeMonths[0].amount) * 100;
    
    // Calculate average
    const average = historicalData.reduce((sum, item) => sum + item.amount, 0) / historicalData.length;
    
    // Compare prediction to average
    const nextMonthPrediction = data.predictions[0].amount;
    const comparison = ((nextMonthPrediction - average) / average) * 100;
    
    let insightsHTML = '';
    
    // Trend insight
    if (trendPercentage > 15) {
        insightsHTML += `<p>📈 <strong>Spending is increasing rapidly</strong> (+${Math.abs(trendPercentage).toFixed(1)}% over last 3 months). 
        Consider reviewing your budgets.</p>`;
    } else if (trendPercentage < -15) {
        insightsHTML += `<p>📉 <strong>Spending is decreasing significantly</strong> (${Math.abs(trendPercentage).toFixed(1)}% lower over last 3 months). 
        Good job on managing expenses!</p>`;
    } else {
        insightsHTML += `<p>📊 <strong>Spending is relatively stable</strong>. Your expenses are consistent month-to-month.</p>`;
    }
    
    // Prediction insight
    if (comparison > 10) {
        insightsHTML += `<p>🔮 <strong>Next month is predicted to be higher than average</strong> (+${comparison.toFixed(1)}%). 
        Plan accordingly for increased expenses.</p>`;
    } else if (comparison < -10) {
        insightsHTML += `<p>🔮 <strong>Next month is predicted to be lower than average</strong> (${Math.abs(comparison).toFixed(1)}% less). 
        You might save more than usual.</p>`;
    } else {
        insightsHTML += `<p>🔮 <strong>Next month is predicted to be close to your average</strong> spending.</p>`;
    }
    
    // Seasonality insight (simple check)
    const currentMonth = new Date().getMonth();
    if ([11, 0, 1].includes(currentMonth)) { // Dec, Jan, Feb
        insightsHTML += `<p>🎄 <strong>Seasonal pattern detected:</strong> Holiday season often leads to increased spending on gifts and entertainment.</p>`;
    } else if ([6, 7, 8].includes(currentMonth)) { // Jul, Aug, Sep
        insightsHTML += `<p>☀️ <strong>Seasonal pattern detected:</strong> Summer months often see increased spending on travel and activities.</p>`;
    }
    
    insightsElement.innerHTML = insightsHTML;
}

function deleteExpense(expenseId) {
    if (confirm('Are you sure you want to delete this expense?')) {
        fetch(`/delete_expense/${expenseId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                loadExpenses();
                loadStats();
                loadBudgets();
                loadPredictions();
            }
        });
    }
}

function viewReceipt(filename) {
    const modal = document.getElementById('receiptModal');
    const container = document.getElementById('receiptContainer');
    
    container.innerHTML = '<p>Loading receipt...</p>';
    modal.style.display = 'block';
    
    // Load receipt image
    container.innerHTML = `<img src="/get_receipt/${filename}" alt="Expense receipt" style="max-width: 100%;">`;
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const budgetModal = document.getElementById('budgetModal');
    const receiptModal = document.getElementById('receiptModal');
    
    if (event.target === budgetModal) {
        budgetModal.style.display = 'none';
    }
    
    if (event.target === receiptModal) {
        receiptModal.style.display = 'none';
    }
});
