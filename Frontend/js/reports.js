document.addEventListener('DOMContentLoaded', function() {
    const reportType = document.getElementById('reportType');
    const reportPeriod = document.getElementById('reportPeriod');
    const customDateGroup = document.getElementById('customDateGroup');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const generateReportBtn = document.getElementById('generateReport');
    const exportPDFBtn = document.getElementById('exportPDF');
    const printReportBtn = document.getElementById('printReport');
    const logoutBtn = document.getElementById('logoutBtn');

    let currentReportData = null;

    // Event listeners
    reportType.addEventListener('change', handleReportTypeChange);
    reportPeriod.addEventListener('change', handlePeriodChange);
    generateReportBtn.addEventListener('click', generateReport);
    exportPDFBtn.addEventListener('click', exportToPDF);
    printReportBtn.addEventListener('click', printReport);
    logoutBtn.addEventListener('click', handleLogout);

    // Set default dates
    const today = new Date();
    endDate.value = today.toISOString().split('T')[0];
    startDate.value = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    function handleReportTypeChange() {
        if (reportType.value === 'custom') {
            customDateGroup.style.display = 'block';
        } else {
            customDateGroup.style.display = 'none';
        }
    }

    function handlePeriodChange() {
        const today = new Date();
        let start, end;

        switch (reportPeriod.value) {
            case 'current':
                if (reportType.value === 'weekly') {
                    start = getWeekStart(today);
                    end = getWeekEnd(today);
                } else if (reportType.value === 'monthly') {
                    start = getMonthStart(today);
                    end = getMonthEnd(today);
                } else if (reportType.value === 'yearly') {
                    start = getYearStart(today);
                    end = getYearEnd(today);
                }
                break;
            case 'previous':
                if (reportType.value === 'weekly') {
                    start = getWeekStart(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
                    end = getWeekEnd(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
                } else if (reportType.value === 'monthly') {
                    start = getMonthStart(new Date(today.getFullYear(), today.getMonth() - 1, 1));
                    end = getMonthEnd(new Date(today.getFullYear(), today.getMonth() - 1, 1));
                } else if (reportType.value === 'yearly') {
                    start = getYearStart(new Date(today.getFullYear() - 1, 0, 1));
                    end = getYearEnd(new Date(today.getFullYear() - 1, 0, 1));
                }
                break;
        }

        if (start && end) {
            startDate.value = start.toISOString().split('T')[0];
            endDate.value = end.toISOString().split('T')[0];
        }
    }

    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    function getWeekEnd(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? 0 : 7);
        return new Date(d.setDate(diff));
    }

    function getMonthStart(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function getMonthEnd(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    function getYearStart(date) {
        return new Date(date.getFullYear(), 0, 1);
    }

    function getYearEnd(date) {
        return new Date(date.getFullYear(), 11, 31);
    }

    async function generateReport() {
        try {
            generateReportBtn.textContent = 'Generating...';
            generateReportBtn.disabled = true;

            const reportData = {
                type: reportType.value,
                period: reportPeriod.value,
                startDate: startDate.value,
                endDate: endDate.value
            };

            const response = await fetch('/reports/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });

            if (response.ok) {
                const data = await response.json();
                currentReportData = data;
                displayReport(data);
            } else {
                throw new Error('Failed to generate report');
            }
        } catch (error) {
            console.error('Report generation error:', error);
            alert('Error generating report: ' + error.message);
        } finally {
            generateReportBtn.textContent = 'Generate Report';
            generateReportBtn.disabled = false;
        }
    }

    function displayReport(data) {
        const reportDisplay = document.getElementById('reportDisplay');
        const reportTitle = document.getElementById('reportTitle');

        // Set report title
        const startDateStr = new Date(data.startDate).toLocaleDateString();
        const endDateStr = new Date(data.endDate).toLocaleDateString();
        reportTitle.textContent = `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} Report (${startDateStr} - ${endDateStr})`;

        // Update summary cards
        document.getElementById('totalEmployees').textContent = data.totalEmployees;
        document.getElementById('totalPresent').textContent = data.totalPresent;
        document.getElementById('totalLate').textContent = data.totalLate;
        document.getElementById('totalAbsent').textContent = data.totalAbsent;
        
        const attendanceRate = data.totalEmployees > 0 ? 
            Math.round(((data.totalPresent + data.totalLate) / data.totalEmployees) * 100) : 0;
        document.getElementById('attendanceRate').textContent = attendanceRate + '%';

        // Generate detailed table
        generateReportTable(data.attendanceDetails);

        reportDisplay.style.display = 'block';
    }

    function generateReportTable(attendanceDetails) {
        const tableContainer = document.getElementById('reportTable');
        
        if (!attendanceDetails || attendanceDetails.length === 0) {
            tableContainer.innerHTML = '<p class="empty-state">No attendance data found for the selected period.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'employee-table';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Present Days</th>
                <th>Late Days</th>
                <th>Absent Days</th>
                <th>Attendance Rate</th>
            </tr>
        `;
        
        const tbody = document.createElement('tbody');
        attendanceDetails.forEach(employee => {
            const totalDays = employee.present + employee.late + employee.absent;
            const rate = totalDays > 0 ? Math.round(((employee.present + employee.late) / totalDays) * 100) : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.employee_id}</td>
                <td>${employee.name}</td>
                <td>${employee.email}</td>
                <td class="status present">${employee.present}</td>
                <td class="status late">${employee.late}</td>
                <td class="status absent">${employee.absent}</td>
                <td>${rate}%</td>
            `;
            tbody.appendChild(row);
        });
        
        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
    }

    function exportToPDF() {
        if (!currentReportData) {
            alert('Please generate a report first');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(20);
            doc.text('Employee Attendance Report', 105, 20, { align: 'center' });
            
            // Add report info
            doc.setFontSize(12);
            doc.text(`Report Type: ${currentReportData.type.charAt(0).toUpperCase() + currentReportData.type.slice(1)}`, 20, 40);
            doc.text(`Period: ${new Date(currentReportData.startDate).toLocaleDateString()} - ${new Date(currentReportData.endDate).toLocaleDateString()}`, 20, 50);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 60);
            
            // Add summary
            doc.setFontSize(16);
            doc.text('Summary', 20, 80);
            doc.setFontSize(12);
            doc.text(`Total Employees: ${currentReportData.totalEmployees}`, 20, 95);
            doc.text(`Present: ${currentReportData.totalPresent}`, 20, 105);
            doc.text(`Late: ${currentReportData.totalLate}`, 20, 115);
            doc.text(`Absent: ${currentReportData.totalAbsent}`, 20, 125);
            
            const attendanceRate = currentReportData.totalEmployees > 0 ? 
                Math.round(((currentReportData.totalPresent + currentReportData.totalLate) / currentReportData.totalEmployees) * 100) : 0;
            doc.text(`Attendance Rate: ${attendanceRate}%`, 20, 135);
            
            // Add detailed table
            if (currentReportData.attendanceDetails && currentReportData.attendanceDetails.length > 0) {
                doc.setFontSize(16);
                doc.text('Detailed Report', 20, 160);
                
                const tableData = currentReportData.attendanceDetails.map(emp => [
                    emp.employee_id,
                    emp.name,
                    emp.email,
                    emp.present,
                    emp.late,
                    emp.absent,
                    emp.totalEmployees > 0 ? Math.round(((emp.present + emp.late) / (emp.present + emp.late + emp.absent)) * 100) + '%' : '0%'
                ]);
                
                doc.autoTable({
                    startY: 170,
                    head: [['ID', 'Name', 'Email', 'Present', 'Late', 'Absent', 'Rate']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [102, 126, 234] }
                });
            }
            
            // Save PDF
            const fileName = `attendance_report_${currentReportData.type}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Error exporting to PDF: ' + error.message);
        }
    }

    function printReport() {
        if (!currentReportData) {
            alert('Please generate a report first');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Attendance Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .summary { margin: 20px 0; }
                        .summary-item { margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <h1>Employee Attendance Report</h1>
                    <div class="summary">
                        <div class="summary-item"><strong>Report Type:</strong> ${currentReportData.type.charAt(0).toUpperCase() + currentReportData.type.slice(1)}</div>
                        <div class="summary-item"><strong>Period:</strong> ${new Date(currentReportData.startDate).toLocaleDateString()} - ${new Date(currentReportData.endDate).toLocaleDateString()}</div>
                        <div class="summary-item"><strong>Total Employees:</strong> ${currentReportData.totalEmployees}</div>
                        <div class="summary-item"><strong>Present:</strong> ${currentReportData.totalPresent}</div>
                        <div class="summary-item"><strong>Late:</strong> ${currentReportData.totalLate}</div>
                        <div class="summary-item"><strong>Absent:</strong> ${currentReportData.totalAbsent}</div>
                    </div>
                    <div id="tableContent"></div>
                </body>
            </html>
        `);
        
        // Add table content
        if (currentReportData.attendanceDetails && currentReportData.attendanceDetails.length > 0) {
            let tableHTML = '<h2>Detailed Report</h2><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Present</th><th>Late</th><th>Absent</th><th>Rate</th></tr></thead><tbody>';
            
            currentReportData.attendanceDetails.forEach(emp => {
                const totalDays = emp.present + emp.late + emp.absent;
                const rate = totalDays > 0 ? Math.round(((emp.present + emp.late) / totalDays) * 100) : 0;
                tableHTML += `<tr><td>${emp.employee_id}</td><td>${emp.name}</td><td>${emp.email}</td><td>${emp.present}</td><td>${emp.late}</td><td>${emp.absent}</td><td>${rate}%</td></tr>`;
            });
            
            tableHTML += '</tbody></table>';
            printWindow.document.getElementById('tableContent').innerHTML = tableHTML;
        }
        
        printWindow.document.close();
        printWindow.print();
    }

    async function handleLogout() {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST'
            });
            
            if (response.ok) {
                alert('Logged out successfully');
                window.location.href = '/signin.html';
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error during logout: ' + error.message);
        }
    }

    // Initialize period change handler
    handlePeriodChange();
});
