// State management
    let currentPeriod = null;
    let currentStartDate = null;
    let currentEndDate = null;
    let reportData = [];
    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
      // Set default dates for custom range
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      document.getElementById('startDate').value = formatDateForInput(startOfMonth);
      document.getElementById('endDate').value = formatDateForInput(today);
      loadChart('yearly');
      loadTopLists();
    });
    // Format date for input field
    function formatDateForInput(date) {
      return date.toISOString().split('T')[0];
    }
    // Format date for display
    function formatDateDisplay(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    }
    // Select period
    function selectPeriod(period) {
      // Update button states
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelector(`[data-period="${period}"]`).classList.add('active');
      // Show/hide custom date section
      const customSection = document.getElementById('customDateSection');
      if (period === 'custom') {
        customSection.classList.add('show');
      } else {
        customSection.classList.remove('show');
      }
      currentPeriod = period;
      // Calculate dates based on period
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      switch (period) {
        case 'today':
          currentStartDate = new Date(today);
          currentStartDate.setHours(0, 0, 0, 0);
          currentEndDate = today;
          break;
        case 'yesterday':
          currentStartDate = new Date(today);
          currentStartDate.setDate(currentStartDate.getDate() - 1);
          currentStartDate.setHours(0, 0, 0, 0);
          currentEndDate = new Date(currentStartDate);
          currentEndDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          currentStartDate = new Date(today);
          currentStartDate.setDate(currentStartDate.getDate() - currentStartDate.getDay());
          currentStartDate.setHours(0, 0, 0, 0);
          currentEndDate = today;
          break;
        case 'month':
          currentStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
          currentEndDate = today;
          break;
        case 'year':
          currentStartDate = new Date(today.getFullYear(), 0, 1);
          currentEndDate = today;
          break;
        case 'custom':
          // Will be set by applyCustomDate
          break;
      }
    }
    // Apply custom date range
    function applyCustomDate() {
      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;
      if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        alert('Start date cannot be after end date');
        return;
      }
      currentStartDate = new Date(startDate);
      currentStartDate.setHours(0, 0, 0, 0);
      currentEndDate = new Date(endDate);
      currentEndDate.setHours(23, 59, 59, 999);
      // Visual feedback
      const btn = document.querySelector('[data-period="custom"]');
      btn.classList.add('active');
    }
    // Reset filters
    function resetFilters() {
      currentPeriod = null;
      currentStartDate = null;
      currentEndDate = null;
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.getElementById('customDateSection').classList.remove('show');
      document.getElementById('statsSection').style.display = 'none';
      document.getElementById('reportSection').style.display = 'none';
      // Reset date inputs
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      document.getElementById('startDate').value = formatDateForInput(startOfMonth);
      document.getElementById('endDate').value = formatDateForInput(today);
    }
    // Generate report
    async function generateReport() {
      if (!currentStartDate || !currentEndDate) {
        alert('Please select a time period first');
        return;
      }
      showLoading(true);
      try {
        // Make API call to fetch sales data
          await fetch('/admin/generate-sales-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: currentStartDate.toISOString(),
            endDate: currentEndDate.toISOString(),
            period: currentPeriod
          })
        }).then((res)=>res.json())
        .then((data)=>{
          if (data.success) {
          console.log(data)
          reportData = data.orders || [];
        // Update UI with data
        console.log(data.message);
          updateStatsCards(data.message)
          updateReportTable(reportData);
          updateReportPeriodText();
        // Show sections
          document.getElementById('statsSection').style.display = 'flex';
          document.getElementById('reportSection').style.display = 'block';
        }else{
          Swal.fire({
            title:"Oops",
            text:data.message,
            icon:"error"
          })
        }
        })
      } catch (error) {
        console.error('Error generating report:', error);
        Swal.fire({
          title:"Error",
          text:"Something went wrong",
          icon:"error"
        })
      } finally {
        showLoading(false);
      }
    }
    // Generate mock data for demonstration
    
    // Update stats cards
    function updateStatsCards(summary) {
      console.log(summary)
      document.getElementById('totalSalesCount').textContent = (summary.totalSalesCount||0)
      document.getElementById('totalOrderAmount').textContent = formatCurrency(summary.totalOrderAmount||0);
      document.getElementById('totalDiscount').textContent = formatCurrency(summary.totalRefund||0)
      document.getElementById('totalCouponDeduction').textContent = formatCurrency(summary.totalDiscount||0);
    }
    // Update report table
    function updateReportTable(orders) {
      const tbody = document.getElementById('reportTableBody');
      const emptyState = document.getElementById('emptyState');
      if (orders.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        document.querySelector('.report-table-container').style.display = 'none';
        return;
      }
      emptyState.style.display = 'none';
      document.querySelector('.report-table-container').style.display = 'block';
      tbody.innerHTML = orders.map(order => `
        <tr>
          <td><strong>${order.orderId}</strong></td>
          <td>${formatDateDisplay(order.createdAt)}</td>
          <td>${order.user.name}</td>
          <td>${order.products.length}</td>
          <td>₹${formatCurrency(order.subtotal)}</td>
          <td class="text-warning">-₹${formatCurrency(order.totalProductDiscount)}</td>
          <td class="text-danger">-₹${formatCurrency(order.discountValue)}</td>
          <td class="text-success fw-bold">₹${formatCurrency(order.totalAmount)}</td>
          <td>${getStatusBadge(order.status)}</td>
        </tr>
      `).join('');
      // Update footer totals
      const totals = orders.reduce((acc, o) => ({
        subtotal: acc.subtotal + o.subtotal,
        discount: acc.discount + o.totalProductDiscount,
        coupon: acc.coupon + o.discountValue,
        total: acc.total + o.totalAmount
      }), { subtotal: 0, discount: 0, coupon: 0, total: 0 });
      document.getElementById('footerSubtotal').textContent = '₹' + formatCurrency(totals.subtotal);
      document.getElementById('footerDiscount').textContent = '-₹' + formatCurrency(totals.discount);
      document.getElementById('footerCoupon').textContent = '-₹' + formatCurrency(totals.coupon);
      document.getElementById('footerTotal').textContent = '₹' + formatCurrency(totals.total);
    }
    // Update report period text
    function updateReportPeriodText() {
      const text = `Report Period: ${formatDateDisplay(currentStartDate)} - ${formatDateDisplay(currentEndDate)}`;
      document.getElementById('reportPeriodText').textContent = text;
    }
    // Get status badge
    function getStatusBadge(status) {
      const classes = {
        'Delivered': 'badge-success',
        'Pending': 'badge-warning',
        "Processing":'badge-warning',
        'Shipped': 'badge-success',
        'Cancelled': 'badge-danger',
        'Returned' : 'badge-danger',
        'Partially returned': "badge-danger",
        'Return rejected':'badge-success',
        };
      return `<span class="badge ${classes[status] || 'badge-warning'} px-2 py-1">${status}</span>`;
    }
    // Format currency
    function formatCurrency(amount) {
      return new Intl.NumberFormat('en-IN').format(Math.round(amount));
    }
    // Show/hide loading overlay
    function showLoading(show) {
      document.getElementById('loadingOverlay').classList.toggle('show', show);
    }
    // Download report
    function downloadReport(format) {
      if (reportData.length === 0) {
        alert('No data to download. Please generate a report first.');
        return;
      }
      if (format === 'excel') {
        downloadExcel();
      } else if (format === 'pdf') {
        downloadPDF();
      }
    }
    //download as excel


    // Download as PDF
    function downloadPDF() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('landscape');
      // Add title
      doc.setFontSize(18);
      doc.text('Sales Report', 14, 22);
      // Add period info
      doc.setFontSize(11);
      doc.text(`Period: ${formatDateDisplay(currentStartDate)} - ${formatDateDisplay(currentEndDate)}`, 14, 32);
      // Add summary
      const totals = reportData.reduce((acc, o) => ({
        sales: acc.sales + 1,
        subtotal: acc.subtotal + o.subtotal,
        discount: acc.discount + o.totalProductDiscount,
        coupon: acc.coupon + o.discountValue,
        total: acc.total + o.totalAmount
      }), { sales: 0, subtotal: 0, discount: 0, coupon: 0, total: 0 });
      doc.text(`Total Sales: ${totals.sales} | Total Amount: ₹${formatCurrency(totals.total)} | Discount: ₹${formatCurrency(totals.discount)} | Coupon Deductions: ₹${formatCurrency(totals.coupon)}`, 14, 42);
      // Prepare table data
      const tableData = reportData.map(order => [
        order.orderId,
        formatDateDisplay(order.createdAt),
        order.user.name,
        order.products.length,
        '₹' + formatCurrency(order.subtotal),
        '-₹' + formatCurrency(order.totalProductDiscount),
        '-₹' + formatCurrency(order.discountValue),
        '₹' + formatCurrency(order.totalAmount),
        order.status
      ]);
      // Add grand total row
      tableData.push([
        'GRAND TOTAL',
        '',
        '',
        reportData.reduce((sum, o) => sum + o.products.length, 0),
        '₹' + formatCurrency(totals.subtotal),
        '-₹' + formatCurrency(totals.discount),
        '-₹' + formatCurrency(totals.coupon),
        '₹' + formatCurrency(totals.total),
        ''
      ]);
      // Add table
      doc.autoTable({
        startY: 50,
        head: [['Order ID', 'Date', 'Customer', 'Items', 'Subtotal', 'Discount', 'Coupon', 'Final Amount', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });
      // Generate filename
      const filename = `Sales_Report_${formatDateForInput(currentStartDate)}_to_${formatDateForInput(currentEndDate)}.pdf`;
      // Download
      doc.save(filename);
    }
  // shipping and taxes

  async function saveShippingTax() {
  const shipping = document.getElementById('shippingRate').value;
  const tax = document.getElementById('taxRate').value;

  if (shipping === '' || tax === '') {
    Swal.fire({
      title: "Error",
      text: "Please fill in both fields",
      icon: "error"
    });
    return;
  }

  try {
    const res = await fetch('/admin/shipping-tax', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingRate: parseFloat(shipping), taxRate: parseFloat(tax) })
    });
    const data = await res.json();

    if (data.success) {
      const modalElement = document.getElementById('shippingTaxModal');
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
      // Remove backdrop manually
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
      document.body.classList.remove('modal-open');
    } else {
      Swal.fire({
        title: "Error",
        text: data.message,
        icon: "error"
      });
    }
  } catch (err) {
    console.error(err);
    Swal.fire({
      title: "Error",
      text: "Something went wrong",
      icon: "error"
    });
  }
}

// ── Sales Chart ──
let salesChart;

async function loadChart(filter) {
  // Update active button
  document.querySelectorAll('#chartFilterGroup .btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  try {
    const res = await fetch(`/admin/sales-chart?filter=${filter}`);
    const data = await res.json();
    // Expects: { labels: ['Jan','Feb',...], values: [1000, 2000,...] }

    const ctx = document.getElementById('salesChart').getContext('2d');
    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Sales (₹)',
          data: data.values,
          backgroundColor: 'rgba(13, 110, 253, 0.7)',
          borderColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => '₹' + v.toLocaleString() } }
        }
      }
    });
  } catch (err) {
    console.error('Chart load error:', err);
  }
}

// ── Top 10 Lists ──
async function loadTopLists() {
  try {
    const res = await fetch('/admin/top-sellers');
    const data = await res.json();

    renderTopList('topProductsBody', data.products);
    renderTopList('topCategoriesBody', data.categories);
    renderTopList('topBrandsBody', data.brands);
  } catch (err) {
    console.error('Top lists error:', err);
  }
}

function renderTopList(tbodyId, items) {
  const tbody = document.getElementById(tbodyId);
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No data</td></tr>';
    return;
  }
  tbody.innerHTML = items.map((item, i) => `
    <tr>
      <td><span class="badge ${i < 3 ? 'bg-primary' : 'bg-secondary'}">${i + 1}</span></td>
      <td class="text-truncate" style="max-width:150px" title="${item.Name}">${item.Name}</td>
      <td class="text-end fw-semibold">${item.Count}</td>
    </tr>
  `).join('');
}