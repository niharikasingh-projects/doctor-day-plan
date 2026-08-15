const PDFDocument = require('pdfkit');

// Streams a professional prescription PDF directly into the Express response —
// never written to local disk. Expects a Consultation document populated with
// clinicId, doctorId (incl. doctorProfile), and patientId (incl. patientProfile).
const generatePrescriptionPDF = (res, consultationData) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="prescription-${consultationData._id}.pdf"`);

  doc.pipe(res);

  // Clinic / Doctor letterhead
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(consultationData.clinicId?.name || 'DoctorDayPlan Clinic', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(consultationData.clinicId?.address || '', { align: 'center' });
  if (consultationData.clinicId?.contactPhone) {
    doc.text(consultationData.clinicId.contactPhone, { align: 'center' });
  }
  doc.moveDown();
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
  doc.moveDown();

  const doctorName = consultationData.doctorId?.doctorProfile?.name || 'Doctor';
  const specialization = consultationData.doctorId?.doctorProfile?.specialization;
  doc.fontSize(12).font('Helvetica-Bold').text(`Dr. ${doctorName}`);
  if (specialization) {
    doc.fontSize(10).font('Helvetica').text(specialization);
  }
  doc.moveDown();

  // Patient basic details block
  const patientName = consultationData.patientId?.patientProfile?.name || consultationData.patientId?.email || 'Patient';
  doc.fontSize(11).font('Helvetica-Bold').text('Patient: ', { continued: true }).font('Helvetica').text(patientName);
  doc
    .font('Helvetica-Bold')
    .text('Date: ', { continued: true })
    .font('Helvetica')
    .text(new Date(consultationData.createdAt).toLocaleDateString());
  doc
    .font('Helvetica-Bold')
    .text('Consultation ID: ', { continued: true })
    .font('Helvetica')
    .text(String(consultationData._id));
  doc.moveDown();

  // Diagnosis / clinical notes
  doc.fontSize(12).font('Helvetica-Bold').text('Diagnosis');
  doc.fontSize(10).font('Helvetica').text(consultationData.diagnosis || '-');
  doc.moveDown();

  if (consultationData.clinicalNotes) {
    doc.fontSize(12).font('Helvetica-Bold').text('Clinical Notes');
    doc.fontSize(10).font('Helvetica').text(consultationData.clinicalNotes);
    doc.moveDown();
  }

  // Rx table
  doc.fontSize(12).font('Helvetica-Bold').text('Rx (Medicines)');
  doc.moveDown(0.5);

  const columnX = { name: 50, dosage: 220, duration: 340, instructions: 420 };
  const tableTop = doc.y;

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Medicine', columnX.name, tableTop);
  doc.text('Dosage', columnX.dosage, tableTop);
  doc.text('Duration', columnX.duration, tableTop);
  doc.text('Instructions', columnX.instructions, tableTop);
  doc.moveDown(0.5);
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica');
  const medicines = consultationData.medicines || [];

  if (medicines.length === 0) {
    doc.text('No medicines prescribed.', columnX.name);
  } else {
    medicines.forEach((medicine) => {
      const rowY = doc.y;
      doc.text(medicine.name || '-', columnX.name, rowY, { width: 160 });
      doc.text(medicine.dosage || '-', columnX.dosage, rowY, { width: 110 });
      doc.text(medicine.durationDays ? `${medicine.durationDays} days` : '-', columnX.duration, rowY, { width: 70 });
      doc.text(medicine.instructions || '-', columnX.instructions, rowY, { width: 120 });
      doc.moveDown();
    });
  }

  doc.end();
};

module.exports = generatePrescriptionPDF;
