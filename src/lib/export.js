// src/lib/export.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportTransactionsCSV(transactions, filename = 'agora_sales.csv') {
  const headers = ['Date', 'Description', 'Category', 'Amount (PHP)', 'Type'];
  const rows = transactions.map(t => [
    t.date, t.description || '', t.category || '', Number(t.amount || 0).toFixed(2), t.type
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  downloadFile(csv, filename, 'text/csv');
}

export function exportExpensesCSV(expenses, filename = 'agora_expenses.csv') {
  const headers = ['Date', 'Description', 'Category', 'Amount (PHP)'];
  const rows = expenses.map(e => [e.date, e.description || '', e.category || '', Number(e.amount || 0).toFixed(2)]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  downloadFile(csv, filename, 'text/csv');
}

export function exportInventoryCSV(products, filename = 'agora_inventory.csv') {
  const headers = ['Name', 'Category', 'Price (PHP)', 'Stock', 'Low Stock Threshold', 'Barcode', 'Track Stock'];
  const rows = products.map(p => [
    p.name || '', p.category || '', Number(p.price || 0).toFixed(2),
    p.stock ?? 0, p.low_stock_threshold ?? 5, p.barcode || '', p.track_stock ? 'Yes' : 'No',
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  downloadFile(csv, filename, 'text/csv');
}

export function exportInventoryPDF(products, profile) {
  const doc = new jsPDF();
  const { businessName = 'My Business' } = profile || {};

  doc.setFontSize(20);
  doc.setTextColor(26, 86, 160);
  doc.text('AGORA', 14, 20);
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text('Business OS — Inventory Report', 14, 28);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Business: ${businessName}`, 14, 38);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-PH')}`, 14, 44);
  doc.text(`Total Items: ${products.length}`, 14, 50);

  const lowStock = products.filter(p => p.track_stock && (p.stock ?? 0) <= (p.low_stock_threshold ?? 5));
  doc.text(`Low Stock Items: ${lowStock.length}`, 14, 56);

  autoTable(doc, {
    startY: 64,
    head: [['Name', 'Category', 'Price', 'Stock', 'Status']],
    body: products.map(p => {
      const stock = p.stock ?? 0;
      const threshold = p.low_stock_threshold ?? 5;
      const status = !p.track_stock ? 'N/A' : stock <= 0 ? 'OUT' : stock <= threshold ? 'LOW' : 'OK';
      return [p.name, p.category || '-', `₱${Number(p.price || 0).toLocaleString()}`, stock, status];
    }),
    headStyles: { fillColor: [26, 86, 160] },
    alternateRowStyles: { fillColor: [240, 247, 255] },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
    didParseCell(data) {
      if (data.column.index === 4 && data.section === 'body') {
        if (data.cell.raw === 'OUT') data.cell.styles.textColor = [220, 38, 38];
        else if (data.cell.raw === 'LOW') data.cell.styles.textColor = [180, 83, 9];
        else if (data.cell.raw === 'OK') data.cell.styles.textColor = [15, 110, 86];
      }
    },
  });

  doc.save(`agora_inventory_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportProfitLossPDF(data, profile) {
  const doc = new jsPDF();
  const { businessName = 'My Business', month = 'This Month' } = profile || {};

  doc.setFontSize(20);
  doc.setTextColor(26, 86, 160);
  doc.text('AGORA', 14, 20);
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text('Business OS — Profit & Loss Statement', 14, 28);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Business: ${businessName}`, 14, 38);
  doc.text(`Period: ${month}`, 14, 44);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-PH')}`, 14, 50);

  autoTable(doc, {
    startY: 58,
    head: [['Item', 'Amount (PHP)']],
    body: [
      ['Total Sales / Revenue', `₱${(data.totalSales || 0).toLocaleString()}`],
      ['Cost of Goods Sold', `₱${(data.cogs || 0).toLocaleString()}`],
      ['Gross Profit', `₱${((data.totalSales || 0) - (data.cogs || 0)).toLocaleString()}`],
      ['Operating Expenses', `₱${(data.totalExpenses || 0).toLocaleString()}`],
      ['Net Profit / (Loss)', `₱${((data.totalSales || 0) - (data.totalExpenses || 0)).toLocaleString()}`],
    ],
    headStyles: { fillColor: [26, 86, 160] },
    alternateRowStyles: { fillColor: [240, 247, 255] },
    columnStyles: { 1: { halign: 'right' } },
  });

  if (data.transactions?.length > 0) {
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setTextColor(26, 86, 160);
    doc.text('Sales Transactions', 14, finalY);
    autoTable(doc, {
      startY: finalY + 4,
      head: [['Date', 'Description', 'Category', 'Amount']],
      body: data.transactions.map(t => [t.date, t.description || '-', t.category || '-', `₱${Number(t.amount || 0).toLocaleString()}`]),
      headStyles: { fillColor: [46, 117, 182] },
      styles: { fontSize: 8 },
      columnStyles: { 3: { halign: 'right' } },
    });
  }

  doc.save(`agora_pnl_${month.replace(/\s/g, '_')}.pdf`);
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
