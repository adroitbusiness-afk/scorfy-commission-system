import jsPDF from 'jspdf'

export function generatePDF(data: any) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text('COMMISSION CLAIM REPORT', 20, 20)

  doc.setFontSize(12)
  doc.text(`Total Students: ${data.total_students}`, 20, 40)
  doc.text(`Total Commission: K${data.total_commission}`, 20, 50)
  doc.text(`Total Paid: K${data.total_paid}`, 20, 60)
  doc.text(`Outstanding: K${data.outstanding}`, 20, 70)

  doc.save('claim-report.pdf')
}