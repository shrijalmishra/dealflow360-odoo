const reportingService = require("./service");

async function getDashboard(req, res, next) {
  try {
    const dashboard = await reportingService.getExecutiveDashboard(req.query);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
}

async function getQuotations(req, res, next) {
  try {
    const quotations = await reportingService.getQuotationReport(req.query);
    res.json({
      count: quotations.length,
      quotations,
    });
  } catch (err) {
    next(err);
  }
}

async function exportCSV(req, res, next) {
  try {
    const csvContent = await reportingService.exportQuotationsCSV(req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="dealflow360-quotations-report.csv"'
    );
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

async function exportXLS(req, res, next) {
  try {
    const xlsContent = await reportingService.exportQuotationsXLS(req.query);
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="dealflow360-quotations-report.xls"'
    );
    res.status(200).send(xlsContent);
  } catch (err) {
    next(err);
  }
}

async function exportPDF(req, res, next) {
  try {
    const pdfBuffer = await reportingService.exportQuotationsPDF(req.query);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="dealflow360-quotations-report.pdf"'
    );
    res.status(200).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  getQuotations,
  exportCSV,
  exportXLS,
  exportPDF,
};
